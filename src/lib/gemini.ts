/**
 * Calls Gemini generateContent on a list of candidate models within a time budget.
 *
 * Hosting kills the function at `maxDuration` (60 s): trying models one after the
 * other with a fixed timeout each could exceed it (a slow model + an overloaded
 * one = 60 s), and the client then got an opaque 504. Here the first `parallel`
 * models race (first valid answer wins), the others are tried with whatever time
 * is left, and the whole call always returns before `budgetMs`.
 */
export interface GeminiRaceOptions {
  apiKey: string;
  models: string[];
  parts: unknown[];
  budgetMs: number;
  parallel?: number;
  temperature?: number;
  log?: (message: string) => void;
  /** Validates the parsed JSON; throw to treat the answer as a failure */
  accept?: (parsed: any) => void;
}

export interface GeminiRaceResult {
  parsed: any;
  model: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly kind: "timeout" | "overloaded" | "failed"
  ) {
    super(message);
  }
}

async function callModel(
  model: string,
  opts: GeminiRaceOptions,
  timeoutMs: number,
  signal: AbortSignal
): Promise<GeminiRaceResult> {
  const log = opts.log ?? (() => {});
  log(`Appel de Gemini (${model}), ${Math.round(timeoutMs / 1000)} s max…`);
  // Explicit timer instead of AbortSignal.any([.., AbortSignal.timeout()]): on Node 20
  // that composite signal can be garbage-collected and then never fires.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException(`Délai de ${Math.round(timeoutMs / 1000)} s dépassé (timeout)`, "TimeoutError")),
    timeoutMs
  );
  const onParentAbort = () => controller.abort(signal.reason);
  if (signal.aborted) onParentAbort();
  else signal.addEventListener("abort", onParentAbort, { once: true });
  try {
    return await requestModel(model, opts, controller.signal);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onParentAbort);
  }
}

async function requestModel(model: string, opts: GeminiRaceOptions, signal: AbortSignal): Promise<GeminiRaceResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: opts.parts }],
        generationConfig: { response_mime_type: "application/json", temperature: opts.temperature ?? 0.1 },
      }),
      signal,
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${body.substring(0, 160)}`);
    (err as any).status = res.status;
    throw err;
  }
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("réponse sans texte");
  const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  opts.accept?.(parsed);
  return { parsed, model };
}

export async function callGeminiRace(opts: GeminiRaceOptions): Promise<GeminiRaceResult> {
  const log = opts.log ?? (() => {});
  const deadline = Date.now() + opts.budgetMs;
  const parallel = Math.max(1, opts.parallel ?? 2);
  let timeouts = 0;
  let overloaded = 0;
  let attempts = 0;

  const attempt = async (model: string, controller: AbortController) => {
    const remaining = deadline - Date.now();
    if (remaining < 3000) throw new Error("budget épuisé");
    attempts++;
    try {
      return await callModel(model, opts, remaining, controller.signal);
    } catch (err: any) {
      if (controller.signal.aborted) throw err; // another model already won
      if (err?.name === "TimeoutError" || /timeout/i.test(err?.message)) timeouts++;
      if (err?.status === 503 || err?.status === 429) overloaded++;
      log(`Échec Gemini (${model}) : ${err?.message || err}`);
      throw err;
    }
  };

  // 1. Race the first models
  const first = opts.models.slice(0, parallel);
  const controller = new AbortController();
  try {
    const result = await Promise.any(first.map((m) => attempt(m, controller)));
    controller.abort(); // stop the slower requests
    return result;
  } catch {
    // all raced models failed: fall through
  }

  // 2. Remaining models, one by one, with the time left
  for (const model of opts.models.slice(parallel)) {
    if (deadline - Date.now() < 3000) break;
    try {
      return await attempt(model, new AbortController());
    } catch {
      // try the next one
    }
  }

  if (timeouts > 0 && timeouts + overloaded >= attempts) {
    throw new GeminiError("L'IA a mis trop de temps à répondre. Réessayez dans un instant.", "timeout");
  }
  if (overloaded > 0 && overloaded >= attempts - timeouts) {
    throw new GeminiError("L'IA de Google est surchargée en ce moment. Réessayez dans quelques minutes.", "overloaded");
  }
  throw new GeminiError("L'IA n'a pas pu analyser les photos.", "failed");
}
