import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { authAPI, clearTokens, getToken, setTokens } from './api';

type AdminAuthState = {
  loading: boolean;
  user: any | null;
  isModerator: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = getToken();
        if (!token) {
          setUser(null);
          setIsModerator(false);
          return;
        }

        const me = await authAPI.me();
        const u = (me as any)?.user ?? null;
        setUser(u);
        setIsModerator(u?.role === 'moderator' || u?.role === 'admin');
      } catch {
        clearTokens();
        setUser(null);
        setIsModerator(false);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo<AdminAuthState>(
    () => ({
      loading,
      user,
      isModerator,
      signIn: async (email, password) => {
        const res = await authAPI.login(email, password);
        setTokens((res as any).token, (res as any).refreshToken);
        const u = (res as any).user;
        setUser(u);
        setIsModerator(u?.role === 'moderator' || u?.role === 'admin');
      },
      signInWithGoogle: async () => {
        throw new Error('Connexion Google non supportée sur le backend pour le moment.');
      },
      signOut: async () => {
        try {
          await authAPI.logout();
        } finally {
          clearTokens();
          setUser(null);
          setIsModerator(false);
        }
      },
    }),
    [isModerator, loading, user]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
