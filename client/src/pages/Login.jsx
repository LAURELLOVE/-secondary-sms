import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { AuthApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { APP_MODE } from '../appMode';
import InstallPrompt from '../components/InstallPrompt';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  if (APP_MODE === 'teacher') return <Navigate to="/teacher/login" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token, user, role } = await AuthApi.adminLogin(username, password);
      login(token, role, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Secondary School Management System</h1>
        <h2>Administrator sign in</h2>
        {error && <p className="error-text">{error}</p>}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn-primary full-width">Sign in</button>
        {APP_MODE === 'web' && (
          <p className="auth-switch">
            Are you a teacher? <Link to="/teacher/login">Sign in with your phone</Link>
          </p>
        )}
        <p className="hint">Demo admin: admin / admin123</p>
        <InstallPrompt />
      </form>
    </div>
  );
}
