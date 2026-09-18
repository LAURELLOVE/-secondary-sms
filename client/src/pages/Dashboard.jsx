import { useEffect, useState } from 'react';
import { StudentsApi, FeesApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { formatFCFA } from '../currency';

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    StudentsApi.list().then(setStudents);
    FeesApi.all().then(setFees);
  }, []);

  const activeCount = students.filter((s) => s.status === 'active').length;
  const outstanding = fees.reduce((sum, f) => sum + (f.balance > 0 ? f.balance : 0), 0);

  return (
    <div>
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <span className="dashboard-hero-eyebrow">Secondary School Management System</span>
          <h1>Welcome back, {user?.fullName || 'Administrator'}</h1>
        </div>
      </div>
      <div className="page">
        <h2>Overview</h2>
        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">Total students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active students</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{formatFCFA(outstanding)}</div>
            <div className="stat-label">Outstanding fees</div>
          </div>
        </div>
      </div>
    </div>
  );
}
