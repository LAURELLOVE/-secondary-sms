import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
import TeacherAttendance from './pages/teacher/Attendance';
import Attendance from './pages/Attendance';
import Admins from './pages/Admins';
import PhoneSms from './pages/PhoneSms';
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import Icon from './components/Icon';
import { APP_MODE } from './appMode';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: 'home', end: true },
  { to: '/students', label: 'Students', icon: 'people' },
  { to: '/grades', label: 'Grades', icon: 'grade' },
  { to: '/fees', label: 'Fees', icon: 'payments' },
  { to: '/attendance', label: 'Attendance', icon: 'calendar' },
  { to: '/teachers', label: 'Teachers', icon: 'school' },
  { to: '/admins', label: 'Admins', icon: 'lock' },
  { to: '/sms', label: 'Phone SMS', icon: 'sms' },
];
// On a phone the first four are bottom tabs; the rest live under "More".
const TAB_ITEMS = NAV_ITEMS.slice(0, 4);
const MORE_ITEMS = NAV_ITEMS.slice(4);

const TITLES = {
  '/dashboard': 'Home',
  '/students': 'Students',
  '/grades': 'Grades',
  '/fees': 'Fees',
  '/attendance': 'Attendance',
  '/attendance/mark': 'Take attendance',
  '/teachers': 'Teachers',
  '/admins': 'Administrators',
  '/sms': 'Phone SMS',
};
const DETAIL_TITLES = { '/students': 'Student', '/teachers': 'Teacher' };

// One step back: real history when there is some, otherwise a sensible parent screen.
function useGoBack(fallback) {
  const location = useLocation();
  const navigate = useNavigate();
  return () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const path = location.pathname;
  const detailOpen = new URLSearchParams(location.search).has('open');
  const isSubPage = path === '/attendance/mark';
  const showBack = detailOpen || isSubPage;
  const title = detailOpen ? DETAIL_TITLES[path] || TITLES[path] : TITLES[path] || 'School SMS';
  const moreActive = MORE_ITEMS.some((i) => path.startsWith(i.to));
  const goBack = useGoBack(isSubPage ? '/attendance' : path);

  function signOut() {
    logout();
    navigate('/login');
  }

  function goTo(to) {
    setMoreOpen(false);
    navigate(to, { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        {showBack && (
          <button className="app-bar-btn mobile-only" aria-label="Back" onClick={goBack}>
            <Icon name="back" />
          </button>
        )}
        <span className="app-title-full desktop-only">Secondary School Management System</span>
        <span className="app-title-page mobile-only">{title}</span>
        <div className="spacer" />
        <span className="muted desktop-only">{user?.fullName}</span>
        <button className="btn-secondary desktop-only" style={{ marginLeft: 12 }} onClick={signOut}>
          Sign out
        </button>
      </header>
      <div className="app-body">
        <nav className="nav-rail desktop-only">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name={item.icon} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="app-content">{children}</main>
      </div>

      <nav className="bottom-nav mobile-only" aria-label="Main">
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            replace
            className={({ isActive }) => `bottom-nav-item ${isActive && !moreOpen ? 'active' : ''}`}
          >
            <span className="pill"><Icon name={item.icon} /></span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          className={`bottom-nav-item ${moreActive || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          <span className="pill"><Icon name="more" /></span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="sheet" role="dialog" aria-label="More">
            <div className="sheet-handle" />
            <div className="sheet-user">
              <strong>{user?.fullName}</strong>
              <div className="muted">Administrator</div>
            </div>
            {MORE_ITEMS.map((item) => (
              <button key={item.to} className="sheet-item" onClick={() => goTo(item.to)}>
                <Icon name={item.icon} />
                <span>{item.label === 'Admins' ? 'Administrators' : item.label}</span>
              </button>
            ))}
            <button className="sheet-item danger" onClick={signOut}>
              <Icon name="logout" />
              <span>Sign out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TeacherShell({ children }) {
  const { impersonating, user, stopImpersonation, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === '/teacher';
  const title = isHome ? 'My classes' : pathname.endsWith('/marks') ? 'Enter marks' : 'Attendance';
  const goBack = useGoBack('/teacher');

  return (
    <div className="app-shell no-bottom-nav">
      <header className="app-header">
        {!isHome && (
          <button className="app-bar-btn mobile-only" aria-label="Back" onClick={goBack}>
            <Icon name="back" />
          </button>
        )}
        <span className="app-title-full desktop-only">Secondary School Management System — Teacher Portal</span>
        <span className="app-title-page mobile-only">{title}</span>
        <div className="spacer" />
        {!impersonating && (
          <button
            className="app-bar-btn"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => { logout(); navigate('/teacher/login'); }}
          >
            <Icon name="logout" />
          </button>
        )}
      </header>
      {impersonating && (
        <div className="preview-banner">
          <span>Admin preview: viewing as <strong>{user?.fullName}</strong></span>
          <button className="btn-secondary" onClick={stopImpersonation}>
            ← Back to admin
          </button>
        </div>
      )}
      <main className="app-content teacher-content">{children}</main>
    </div>
  );
}

// Admin = indigo, Teacher = emerald. The Android apps are fixed to their own colours;
// the website switches according to who is signed in / which sign-in page is open.
function useTheme() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const theme =
    APP_MODE !== 'web' ? APP_MODE : role === 'teacher' || pathname.startsWith('/teacher') ? 'teacher' : 'admin';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}

export default function App() {
  useTheme();
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
        path="/teacher/attendance"
        element={
          <ProtectedRoute role="teacher">
            <TeacherShell><TeacherAttendance /></TeacherShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/mark"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><TeacherAttendance /></AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><Attendance /></AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sms"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><PhoneSms /></AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admins"
        element={
          <ProtectedRoute role="admin">
            <AdminShell><Admins /></AdminShell>
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
