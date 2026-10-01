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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u: UserSession = {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Chef",
            avatarUrl: session.user.user_metadata?.avatar_url,
            tier: "Basic",
          };
          setUserState(u);
          setStoredUserSession(u);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    } catch {
      setIsLoading(false);
    }
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
