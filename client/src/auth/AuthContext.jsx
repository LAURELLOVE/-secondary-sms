import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('sms_token');
    const role = localStorage.getItem('sms_role');
    const user = localStorage.getItem('sms_user');
    if (!token || !role) return { token: null, role: null, user: null };
    return { token, role, user: user ? JSON.parse(user) : null };
  });

  function login(token, role, user) {
    localStorage.setItem('sms_token', token);
    localStorage.setItem('sms_role', role);
    localStorage.setItem('sms_user', JSON.stringify(user));
    setAuth({ token, role, user });
  }

  function logout() {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_role');
    localStorage.removeItem('sms_user');
    setAuth({ token: null, role: null, user: null });
  }

  return <AuthContext.Provider value={{ ...auth, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
