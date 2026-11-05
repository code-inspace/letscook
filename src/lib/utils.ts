import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Local calendar day as YYYY-MM-DD (toISOString() would give the UTC day). */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Back navigation that never dead-ends: when the page was opened directly
 * (shared link, PWA launch), there is no history entry to go back to.
 */
export function goBack(router: { back: () => void; push: (href: string) => void }, fallback = "/"): void {
  // (document.referrer is not updated by client-side navigations, so only the
  // history length is a reliable signal here)
  if (typeof window !== "undefined" && window.history.length > 1) router.back();
  else router.push(fallback);
}
