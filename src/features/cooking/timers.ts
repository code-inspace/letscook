import { useCallback, useEffect, useRef, useState } from "react";

export interface StepTimer {
  id: string;
  stepIndex: number;
  label: string;
  durationMs: number;
  endsAt: number;
  /** Set once the alarm has gone off */
  done?: boolean;
}

/**
 * Cooking durations written in a step: "cuire 12-15 min", "3 à 4 minutes",
 * "1 h 30", "laissez reposer 1 heure". Ranges use their lower bound (check early).
 * Returns minutes, deduplicated, in reading order.
 */
export function extractDurations(text: string | undefined): number[] {
  if (!text) return [];
  const out: number[] = [];
  const re =
    /(\d+(?:[.,]\d+)?)\s*(?:(?:-|à|a|ou)\s*\d+(?:[.,]\d+)?\s*)?(h|heures?|min(?:utes?)?|mn)\b(?:\s*(\d{1,2}))?/gi;
  for (const m of text.matchAll(re)) {
    const value = Number(m[1].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    const unit = m[2].toLowerCase();
    const minutes = unit.startsWith("h") ? value * 60 + (m[3] ? Number(m[3]) : 0) : value;
    const rounded = Math.round(minutes);
    if (rounded > 0 && rounded <= 24 * 60 && !out.includes(rounded)) out.push(rounded);
  }
  return out;
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ringAlarm(label: string) {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 600]);
  } catch {}
  // Short beep sequence (works while the app is in the foreground)
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {}
  // System notification when allowed (useful if the phone is locked / app in background)
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.ready
        .then((reg) => reg.showNotification("⏰ Minuteur terminé", { body: label, tag: `timer-${label}` }))
        .catch(() => new Notification("⏰ Minuteur terminé", { body: label }));
    }
  } catch {}
}

const storageKey = (recipeId: string) => `letscook_timers_${recipeId}`;

/**
 * Countdown timers for a recipe's steps. They keep running when changing steps,
 * survive a reload (sessionStorage) and are computed from their end time, so
 * they stay exact after the app was in the background.
 */
export function useStepTimers(recipeId: string) {
  const [timers, setTimers] = useState<StepTimer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(storageKey(recipeId));
      return raw ? (JSON.parse(raw) as StepTimer[]) : [];
    } catch {
      return [];
    }
  });
  const [now, setNow] = useState(() => Date.now());
  const timersRef = useRef(timers);
  timersRef.current = timers;

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(recipeId), JSON.stringify(timers));
    } catch {}
  }, [timers, recipeId]);

  useEffect(() => {
    if (timers.length === 0) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const finished = timersRef.current.filter((x) => !x.done && x.endsAt <= t);
      if (finished.length) {
        finished.forEach((x) => ringAlarm(x.label));
        setTimers((prev) => prev.map((x) => (finished.some((f) => f.id === x.id) ? { ...x, done: true } : x)));
      }
    };
    tick();
    const interval = setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [timers.length]);

  const start = useCallback((stepIndex: number, minutes: number, label: string) => {
    // Asked on a user gesture (required by iOS); a refusal only disables notifications
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
    const durationMs = minutes * 60_000;
    setTimers((prev) => [
      ...prev,
      {
        id: `${stepIndex}_${minutes}_${Date.now()}`,
        stepIndex,
        label,
        durationMs,
        endsAt: Date.now() + durationMs,
      },
    ]);
  }, []);

  const remove = useCallback((id: string) => setTimers((prev) => prev.filter((t) => t.id !== id)), []);

  return { timers, now, start, remove };
}

/**
 * Ingredients ticked as "already added" while cooking, per recipe. Kept for the
 * browser session only (a new cooking session starts unticked).
 */
export function useUsedIngredients(recipeId: string) {
  const key = `letscook_used_ingredients_${recipeId}`;
  const [used, setUsed] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      setUsed(new Set(raw ? (JSON.parse(raw) as number[]) : []));
    } catch {
      setUsed(new Set());
    }
  }, [key]);

  const save = (next: Set<number>) => {
    try {
      sessionStorage.setItem(key, JSON.stringify([...next]));
    } catch {}
  };

  const toggle = useCallback(
    (index: number) =>
      setUsed((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        save(next);
        return next;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  const reset = useCallback(() => {
    setUsed(new Set());
    save(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { used, toggle, reset };
}
