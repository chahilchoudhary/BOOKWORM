import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(getToken() !== null);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      setUser((await api<{ user: User }>('/auth/me')).user);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refreshUser,
      async login(email, password) {
        const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
        setToken(res.token);
        setUser(res.user);
      },
      async register(name, email, password) {
        const res = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: { name, email, password } });
        setToken(res.token);
        setUser(res.user);
      },
      logout() {
        setToken(null);
        setUser(null);
      },
    }),
    [user, loading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
