import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";

export const DEFAULT_REFERENCE_SERVINGS = 9;
export const MIN_REFERENCE_SERVINGS = 1;
export const MAX_REFERENCE_SERVINGS = 99;

const KEY_PREFIX = "letscook_reference_servings_";
const listeners = new Set<() => void>();
const fetched = new Set<string>();

export function clampReferenceServings(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REFERENCE_SERVINGS;
  return Math.min(MAX_REFERENCE_SERVINGS, Math.max(MIN_REFERENCE_SERVINGS, Math.round(value)));
}

function readLocal(userId: string): number {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`);
    return raw ? clampReferenceServings(Number(raw)) : DEFAULT_REFERENCE_SERVINGS;
  } catch {
    return DEFAULT_REFERENCE_SERVINGS;
  }
}

function writeLocal(userId: string, value: number): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${userId}`, String(value));
  } catch {}
  listeners.forEach((l) => l());
}

/** Loads the setting from Supabase into the local cache (best effort, works offline). */
async function fetchRemote(userId: string): Promise<void> {
  const { data, error } = await createClient()
    .from("user_settings")
    .select("reference_servings")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("user_settings read error:", error);
    return;
  }
  if (data) {
    fetched.add(userId);
    const remote = clampReferenceServings(data.reference_servings);
    if (remote !== readLocal(userId)) writeLocal(userId, remote);
  } else {
    // Nothing stored yet: push a value chosen locally while offline, if any
    fetched.add(userId);
    const local = readLocal(userId);
    if (local !== DEFAULT_REFERENCE_SERVINGS) await pushRemote(userId, local);
  }
}

async function pushRemote(userId: string, value: number): Promise<void> {
  const { error } = await createClient()
    .from("user_settings")
    .upsert(
      { user_id: userId, reference_servings: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) console.warn("user_settings upsert error:", error);
}

export function setReferenceServings(userId: string, value: number): void {
  const next = clampReferenceServings(value);
  writeLocal(userId, next);
  pushRemote(userId, next).catch(() => {});
}

/** The user's reference number of servings (9 until they change it). */
export function useReferenceServings(userId: string | null | undefined): number {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (userId ? readLocal(userId) : DEFAULT_REFERENCE_SERVINGS),
    () => DEFAULT_REFERENCE_SERVINGS
  );
  useEffect(() => {
    if (userId && !fetched.has(userId)) fetchRemote(userId).catch(() => {});
  }, [userId]);
  return value;
}
