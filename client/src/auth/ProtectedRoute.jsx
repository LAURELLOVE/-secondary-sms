import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { token, role: currentRole } = useAuth();
  const loginPath = role === 'teacher' ? '/teacher/login' : '/login';
  if (!token) return <Navigate to={loginPath} replace />;
  if (role && currentRole !== role) return <Navigate to={loginPath} replace />;
  return children;
}
