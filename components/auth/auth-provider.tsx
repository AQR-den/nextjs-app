"use client";

import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { User } from "@/lib/types/domain";
import { clearToken, getToken, saveToken } from "@/lib/auth/storage";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  loading: true,
  signIn: () => undefined,
  signOut: () => undefined
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingToken = getToken();
    if (!existingToken) {
      setLoading(false);
      return;
    }

    setToken(existingToken);
    apiClient
      .me(existingToken)
      .then((res) => setUser(res.user))
      .catch(() => {
        clearToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      signIn(newToken: string, signedInUser: User) {
        saveToken(newToken);
        setToken(newToken);
        setUser(signedInUser);
      },
      signOut() {
        clearToken();
        setToken(null);
        setUser(null);
      }
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
