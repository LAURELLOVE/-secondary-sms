import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeachersApi, SERVER_ORIGIN } from '../../api';
import { useAuth } from '../../auth/AuthContext';

export default function TeacherHome() {
  const [assignments, setAssignments] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    TeachersApi.myAssignments().then(setAssignments);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        {user?.photoUrl ? (
          <img src={`${SERVER_ORIGIN}${user.photoUrl}`} alt={user.fullName} className="avatar avatar-lg" />
        ) : (
          <div className="avatar avatar-lg avatar-placeholder">{user?.fullName?.[0] || '?'}</div>
        )}
        <h2>Welcome, {user?.fullName}</h2>
        <div className="spacer" />
        <button className="btn-secondary" onClick={() => { logout(); navigate('/teacher/login'); }}>
          Sign out
        </button>
      </div>
      <p className="muted">{user?.subjectSpecialization} • {user?.employeeId}</p>

      <h3>Your classes</h3>
      {assignments.length === 0 ? (
        <p className="empty">No classes have been assigned to you yet. Contact your administrator.</p>
      ) : (
        <div className="stat-row">
          {assignments.map((a) => (
            <div className="stat-card" key={a.id}>
              <div className="stat-value">{a.subject}</div>
              <div className="stat-label">{a.className}{a.section} • {a.academicYear}</div>
              <button
                className="btn-primary"
                style={{ marginTop: 12 }}
                onClick={() =>
                  navigate(
                    `/teacher/marks?className=${encodeURIComponent(a.className)}&section=${encodeURIComponent(a.section)}&subject=${encodeURIComponent(a.subject)}&academicYear=${encodeURIComponent(a.academicYear)}`
                  )
                }
              >
                Enter marks
              </button>
              <button
                className="btn-secondary"
                style={{ marginTop: 12, marginLeft: 8 }}
                onClick={() =>
                  navigate(
                    `/teacher/attendance?className=${encodeURIComponent(a.className)}&section=${encodeURIComponent(a.section || '')}`
                  )
                }
              >
                Take attendance
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
