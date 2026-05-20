import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dhm_token');
    if (!token) { setLoading(false); return; }

    authApi.verify()
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('dhm_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    localStorage.setItem('dhm_token', res.data.token);
    setUser({ username: res.data.username, role: 'admin' });
  };

  const logout = () => {
    localStorage.removeItem('dhm_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
