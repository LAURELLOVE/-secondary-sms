import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import GradesOverview from './pages/GradesOverview';
import FeesOverview from './pages/FeesOverview';
import Teachers from './pages/Teachers';
import Login from './pages/Login';
import TeacherLogin from './pages/teacher/TeacherLogin';
import TeacherHome from './pages/teacher/TeacherHome';
import MarkEntry from './pages/teacher/MarkEntry';
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/students', label: 'Students', icon: '👥' },
  { to: '/grades', label: 'Grades', icon: '⭐' },
  { to: '/fees', label: 'Fees', icon: '💳' },
  { to: '/teachers', label: 'Teachers', icon: '🧑‍🏫' },
];

function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="app-header">
        Secondary School Management System
        <div className="spacer" />
        <span className="muted">{user?.fullName}</span>
        <button className="btn-secondary" style={{ marginLeft: 12 }} onClick={() => { logout(); navigate('/login'); }}>
          Sign out
        </button>
      </header>
      <div className="app-body">
        <nav className="nav-rail">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

function TeacherShell({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">Secondary School Management System — Teacher Portal</header>
      <main className="app-content" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/teacher/login" element={<TeacherLogin />} />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute role="teacher">
            <TeacherShell><TeacherHome /></TeacherShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/marks"
        element={
          <ProtectedRoute role="teacher">
            <TeacherShell><MarkEntry /></TeacherShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><Dashboard /></AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><Students /></AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/grades"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><GradesOverview /></AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fees"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><FeesOverview /></AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><Teachers /></AdminShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
