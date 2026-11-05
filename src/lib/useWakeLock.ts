import { useEffect } from "react";

/**
 * Keeps the screen on while `enabled` (cooking, shopping in store).
 * The lock is released by the browser when the app goes to the background,
 * so it is requested again each time the page becomes visible.
 * No-op where the Screen Wake Lock API is missing.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        lock.addEventListener("release", () => {
          sentinel = null;
        });
      } catch {
        // Denied (low battery mode…): the app keeps working without it
      }
    };

    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [enabled]);
}
