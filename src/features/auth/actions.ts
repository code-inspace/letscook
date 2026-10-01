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

export async function loginWithCredentials(email: string, pass: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
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
    return { success: true };
  }
  return { success: false, error: "Connexion échouée" };
}

export async function logoutUser() {
  const supabase = createClient();
  await supabase.auth.signOut().catch(() => {});
  setStoredUserSession(null);
}
