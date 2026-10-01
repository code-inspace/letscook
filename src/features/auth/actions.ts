import { UserSession } from "./types";
import { createClient } from "@/utils/supabase/client";

const USER_SESSION_STORAGE_KEY = "letscook_user_session";

export function getStoredUserSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function setStoredUserSession(user: UserSession | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(USER_SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(user));
  }
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
