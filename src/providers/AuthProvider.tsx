"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserSession } from "@/features/auth/types";
import { getStoredUserSession, setStoredUserSession } from "@/features/auth/actions";
import { createClient } from "@/utils/supabase/client";

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  setUser: (u: UserSession | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserSession | null>(() => getStoredUserSession());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u: UserSession = {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || "Juliana Silva",
            avatarUrl: session.user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            tier: "Basic",
          };
          setUserState(u);
          setStoredUserSession(u);
        }
      });
    } catch {}
  }, []);

  const setUser = (u: UserSession | null) => {
    setUserState(u);
    setStoredUserSession(u);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
