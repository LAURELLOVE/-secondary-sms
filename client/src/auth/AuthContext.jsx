import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
const BACKUP_KEY = 'sms_admin_backup';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('sms_token');
    const role = localStorage.getItem('sms_role');
    const user = localStorage.getItem('sms_user');
    if (!token || !role) return { token: null, role: null, user: null };
    return { token, role, user: user ? JSON.parse(user) : null };
  });
  const [impersonating, setImpersonating] = useState(() => Boolean(localStorage.getItem(BACKUP_KEY)));


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
    localStorage.removeItem(BACKUP_KEY);
    setImpersonating(false);
    setAuth({ token: null, role: null, user: null });
  }

  // An administrator opens the teacher portal as a teacher; their own session
  // is kept aside so "Back to admin" restores it without signing in again.
  // Both switches do a full page load: changing role in place would make the
  // page you are leaving re-check permissions and bounce to the login screen.
  function startImpersonation(token, role, user) {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ token: auth.token, role: auth.role, user: auth.user }));
    localStorage.setItem('sms_token', token);
    localStorage.setItem('sms_role', role);
    localStorage.setItem('sms_user', JSON.stringify(user));
    window.location.assign('/teacher');
  }

  function stopImpersonation() {
    const backup = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
    localStorage.removeItem(BACKUP_KEY);
    if (!backup) {
      logout();
      window.location.assign('/login');
      return;
    }
    localStorage.setItem('sms_token', backup.token);
    localStorage.setItem('sms_role', backup.role);
    localStorage.setItem('sms_user', JSON.stringify(backup.user));
    window.location.assign('/teachers');
  }

  return (
    <AuthContext.Provider value={{ ...auth, impersonating, login, logout, startImpersonation, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
