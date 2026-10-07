import { UserSession } from "./types";
import { createClient } from "@/utils/supabase/client";

const USER_SESSION_STORAGE_KEY = "letscook_user_session";

// Parsed session cached by its raw JSON so `getStoredUserSession` returns a stable
// reference (required by useSyncExternalStore).
let cachedRaw: string | null = null;
let cachedSession: UserSession | null = null;
const sessionListeners = new Set<() => void>();

export function getStoredUserSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSession = raw ? JSON.parse(raw) : null;
    }
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

export function setStoredUserSession(user: UserSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      localStorage.removeItem(USER_SESSION_STORAGE_KEY);
    } else {
      const raw = JSON.stringify(user);
      if (raw === cachedRaw) return;
      localStorage.setItem(USER_SESSION_STORAGE_KEY, raw);
    }
  } catch {}
  sessionListeners.forEach((l) => l());
}

export function subscribeUserSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_SESSION_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    sessionListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export async function signUpWithCredentials(
  email: string,
  password: string,
  fullName?: string
): Promise<{ success: boolean; error?: string; session?: UserSession }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split("@")[0],
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    const session: UserSession = {
      id: data.user.id,
      email: data.user.email || email,
      name: fullName || data.user.user_metadata?.full_name || email.split("@")[0],
      avatarUrl: data.user.user_metadata?.avatar_url,
      tier: "Basic",
    };
    setStoredUserSession(session);
    return { success: true, session };
  }

  return { success: false, error: "Inscription impossible." };
}

export async function signInWithCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; session?: UserSession }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    const session: UserSession = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.full_name || email.split("@")[0],
      avatarUrl: data.user.user_metadata?.avatar_url,
      tier: "Basic",
    };
    setStoredUserSession(session);
    return { success: true, session };
  }

  return { success: false, error: "Échec de connexion." };
}

export async function signOutUser(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut().catch(() => {});
  setStoredUserSession(null);
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
