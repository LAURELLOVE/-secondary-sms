import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AttendanceApi } from '../api';
import { CLASS_LEVELS } from '../curriculum';

export default function Attendance() {
  const [className, setClassName] = useState('All');
  const [section, setSection] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState({ daysMarked: 0, students: [] });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    AttendanceApi.summary({
      className: className === 'All' ? undefined : className,
      section: section.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [className, section, from, to]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="desktop-only">Attendance</h2>
        <div className="spacer" />
        <select value={className} onChange={(e) => setClassName(e.target.value)}>
          <option value="All">All classes</option>
          {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input
          className="table-input"
          placeholder="Section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        />
        <label className="inline-label">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline-label">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {className !== 'All' && (
          <button
            className="btn-primary"
            onClick={() => navigate(`/attendance/mark?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section.trim())}`)}
          >
            Mark / edit a day
          </button>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="muted">{data.daysMarked} class-day(s) with attendance recorded in this selection</p>
      <table className="data-table stack">
        <thead>
          <tr><th>Student</th><th>Class</th><th>Present</th><th>Late</th><th>Absent</th><th>Attendance</th></tr>
        </thead>
        <tbody>
          {data.students.map((s) => (
            <tr key={s.id} onClick={() => navigate(`/students?open=${s.id}&tab=attendance`)}>
              <td>{s.fullName}</td>
              <td data-label="Class">{s.className}{s.section}{s.branch ? ` (${s.branch})` : ''}</td>
              <td data-label="Present">{s.present}</td>
              <td data-label="Late">{s.late}</td>
              <td data-label="Absent">{s.absent}</td>
              <td data-label="Attendance" className={s.rate === null ? '' : s.rate < 75 ? 'error-text' : 'ok-text'}>
                {s.rate === null ? '—' : `${s.rate}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.students.length === 0 && <p className="empty">No students found</p>}
    </div>
  );
}
