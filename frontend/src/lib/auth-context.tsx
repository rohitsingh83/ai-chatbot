"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, tokenStore } from "@/services/api";
import { applyTheme } from "@/lib/theme";
import type { Preferences, User } from "@/utils/types";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (patch: { name?: string; preferences?: Partial<Preferences> }) => Promise<User>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const adopt = useCallback((t: string, u: User) => {
    tokenStore.set(t);
    setToken(t);
    setUser(u);
    applyTheme(u.preferences.theme, u.preferences.accent);
  }, []);

  useEffect(() => {
    const t = tokenStore.get();
    if (!t) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the token only exists in the browser
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => adopt(t, user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [adopt]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  // The API client fires this when the server says our token is no longer valid.
  useEffect(() => {
    const onLogout = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener("nova:logout", onLogout);
    return () => window.removeEventListener("nova:logout", onLogout);
  }, []);

  // Follow OS theme changes when the user picked "system".
  useEffect(() => {
    if (user?.preferences.theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme("system");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [user?.preferences.theme]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading,
      async login(email, password) {
        const r = await api.login({ email, password });
        adopt(r.token, r.user);
        return r.user;
      },
      async signup(name, email, password) {
        const r = await api.signup({ name, email, password });
        adopt(r.token, r.user);
        return r.user;
      },
      logout,
      async updateUser(patch) {
        const prev = user;
        if (prev && patch.preferences) {
          // Optimistic: theme and accent change instantly.
          const next = { ...prev, preferences: { ...prev.preferences, ...patch.preferences } };
          setUser(next);
          applyTheme(next.preferences.theme, next.preferences.accent);
        }
        try {
          const r = await api.updateProfile(patch);
          setUser(r.user);
          return r.user;
        } catch (e) {
          if (prev) {
            setUser(prev);
            applyTheme(prev.preferences.theme, prev.preferences.accent);
          }
          throw e;
        }
      },
    }),
    [user, token, loading, adopt, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
