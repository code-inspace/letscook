import { afterEach, describe, expect, it, vi } from "vitest";
import { callGeminiRace, GeminiError } from "../gemini";

const ok = (json: object) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }), {
    status: 200,
  });

// Resolves after `ms`, or rejects like fetch when the request is aborted
const delayed = (ms: number, make: () => Response, signal?: AbortSignal) =>
  new Promise<Response>((resolve, reject) => {
    const t = setTimeout(() => resolve(make()), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      // Like fetch: reject with the signal's reason (TimeoutError for AbortSignal.timeout)
      reject(signal.reason ?? Object.assign(new Error("aborted"), { name: "AbortError" }));
    });
  });

const modelOf = (url: string) => url.match(/models\/([^:]+):/)![1];

afterEach(() => vi.unstubAllGlobals());

describe("callGeminiRace", () => {
  it("returns the fastest of the raced models and aborts the other", async () => {
    let slowAborted = false;
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
      const model = modelOf(url);
      if (model === "slow") {
        init.signal?.addEventListener("abort", () => (slowAborted = true));
        return delayed(500, () => ok({ title: "slow" }), init.signal ?? undefined);
      }
      return delayed(20, () => ok({ title: "fast" }));
    });
    const res = await callGeminiRace({ apiKey: "k", models: ["slow", "fast"], parts: [], budgetMs: 5000 });
    expect(res).toEqual({ parsed: { title: "fast" }, model: "fast" });
    expect(slowAborted).toBe(true);
  });

  it("falls back to the next models when the raced ones fail", async () => {
    vi.stubGlobal("fetch", (url: string) => {
      const model = modelOf(url);
      if (model === "busy") return Promise.resolve(new Response("overloaded", { status: 503 }));
      if (model === "broken") return Promise.resolve(ok({ nope: true }));
      return Promise.resolve(ok({ title: "ok" }));
    });
    const res = await callGeminiRace({
      apiKey: "k",
      models: ["busy", "broken", "backup"],
      parts: [],
      budgetMs: 5000,
      accept: (p) => {
        if (!p.title) throw new Error("no title");
      },
    });
    expect(res.model).toBe("backup");
  });

  it("reports overload with a readable error when every model is busy", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("busy", { status: 503 })));
    await expect(
      callGeminiRace({ apiKey: "k", models: ["a", "b", "c"], parts: [], budgetMs: 5000 })
    ).rejects.toMatchObject({ kind: "overloaded" });
  });

  it("never exceeds its time budget", { timeout: 10_000 }, async () => {
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) =>
      delayed(60_000, () => ok({ title: "late" }), init.signal ?? undefined)
    );
    const start = Date.now();
    const err = await callGeminiRace({ apiKey: "k", models: ["a", "b", "c"], parts: [], budgetMs: 3500 }).catch(
      (e) => e
    );
    expect(err).toBeInstanceOf(GeminiError);
    expect(err.kind).toBe("timeout");
    expect(Date.now() - start).toBeLessThan(4500);
  });
});
