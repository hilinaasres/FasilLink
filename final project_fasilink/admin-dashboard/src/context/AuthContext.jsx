import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { adminLogin, adminForgotPassword } from '../services/authService';

const AuthContext = createContext(null);
const TOKEN_KEY = 'fasilink-admin-token';
const USER_KEY = 'fasilink-admin-user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async ({ email, password, remember }) => {
    const response = await adminLogin({ email, password });
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, response.token);
    storage.setItem(USER_KEY, JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, logout, forgotPassword: adminForgotPassword }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
