import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();   // never show one user's cached data to the next
  }, [queryClient]);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  // On page load, turn a stored token back into a user
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('GET', '/auth/me')
      .then((r) => setUser(r.user))
      .catch((e) => { if (e.status === 401) tokenStore.clear(); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api('POST', '/auth/login', { body: { email, password } });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    await api('POST', '/auth/register', { body: { name, email, password } });
    return login(email, password);
  }, [login]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}