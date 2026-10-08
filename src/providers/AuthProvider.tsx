"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { UserSession } from "@/features/auth/types";
import {
  getStoredUserSession,
  setStoredUserSession,
  subscribeUserSession,
} from "@/features/auth/actions";
import { createClient } from "@/utils/supabase/client";
import { syncAllLocalDataToSupabase } from "@/features/sync/syncService";

interface AuthContextType {
  /** Cached session (available instantly, also offline). `null` during SSR/hydration. */
  user: UserSession | null;
  /** True until the Supabase session has been checked once. */
  isLoading: boolean;
  setUser: (u: UserSession | null) => void;
  syncData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUserSession(u: { id: string; email?: string; user_metadata?: Record<string, any> }): UserSession {
  return {
    id: u.id,
    email: u.email || "",
    name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Chef",
    avatarUrl: u.user_metadata?.avatar_url,
    tier: "Basic",
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Server snapshot is `null`, so SSR and the first client render always match
  const user = useSyncExternalStore(subscribeUserSession, getStoredUserSession, () => null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userId = user?.id;

  useEffect(() => {
    // Ask the browser not to evict the offline cache (recipes, plans, shopping list)
    navigator.storage?.persist?.().catch(() => {});

    const supabase = createClient();
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (cancelled) return;
        if (session?.user) {
          setStoredUserSession(toUserSession(session.user));
        } else if (!error) {
          // Signed out (or expired) — but keep the cached session on network errors
          // so the app stays usable offline.
          setStoredUserSession(null);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setIsLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setStoredUserSession(null);
      else if (session?.user) setStoredUserSession(toUserSession(session.user));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Push pending changes and refresh data on login, when coming back online and
  // when the app returns to the foreground (each store throttles its own refresh).
  useEffect(() => {
    if (!userId) return;
    syncAllLocalDataToSupabase(userId).catch(() => {});

    const resync = () => {
      if (document.visibilityState === "visible") {
        syncAllLocalDataToSupabase(userId).catch(() => {});
      }
    };
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [userId]);

  const setUser = useCallback((u: UserSession | null) => setStoredUserSession(u), []);
  const syncData = useCallback(async () => {
    if (userId) await syncAllLocalDataToSupabase(userId, true);
  }, [userId]);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, syncData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
