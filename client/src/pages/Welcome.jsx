import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import InstallPrompt from '../components/InstallPrompt';
import { APP_MODE } from '../appMode';

export default function Welcome() {
  const { token, role } = useAuth();

  if (token && role === 'admin') return <Navigate to="/dashboard" replace />;
  if (token && role === 'teacher') return <Navigate to="/teacher" replace />;
  if (APP_MODE === 'admin') return <Navigate to="/login" replace />;
  if (APP_MODE === 'teacher') return <Navigate to="/teacher/login" replace />;

  return (
    <div className="landing-page">
      <div>
        <p className="landing-title">Secondary School Management System</p>
        <h1 className="landing-subtitle">Who's signing in?</h1>
      </div>
      <div className="landing-cards">
        <Link to="/login" className="landing-card">
          <span className="landing-card-icon">🏫</span>
          <h3>Administrator</h3>
          <p>Manage students, grades, fees and teacher records</p>
        </Link>
        <Link to="/teacher/login" className="landing-card">
          <span className="landing-card-icon">🧑‍🏫</span>
          <h3>Teacher</h3>
          <p>Sign in with your phone to enter CA and exam marks</p>
        </Link>
      </div>
      <InstallPrompt />
    </div>
  );
}
