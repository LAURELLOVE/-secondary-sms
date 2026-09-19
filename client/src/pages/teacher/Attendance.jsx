import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AttendanceApi } from '../../api';

const OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TeacherAttendance() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const className = params.get('className');
  const section = params.get('section') || '';

  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState([]);
  const [marked, setMarked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    AttendanceApi.sheet(className, section, date)
      .then((sheet) => {
        if (cancelled) return;
        setMarked(sheet.marked);
        setRows(sheet.students.map((s) => ({ ...s, status: s.status || 'present' })));
        setMessage('');
      })
      .catch((e) => !cancelled && setMessage(`Error: ${e.message}`));
    return () => { cancelled = true; };
  }, [className, section, date]);

  function setStatus(id, status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      await AttendanceApi.save({
        className,
        section,
        date,
        records: rows.map((r) => ({ studentId: r.id, status: r.status })),
      });
      setMarked(true);
      setMessage('Attendance saved.');
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-secondary" onClick={() => navigate('/teacher')}>← Back</button>
        <h2>Attendance — {className}{section}</h2>
        <div className="spacer" />
        <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
      </div>

      {message && <p className={message.startsWith('Error') ? 'error-text' : 'ok-text'}>{message}</p>}
      <p className="muted">
        {marked ? 'Already recorded for this date — saving will update it.' : 'Not recorded yet for this date.'}
        {' '}Present {counts.present || 0} • Late {counts.late || 0} • Absent {counts.absent || 0}
      </p>

      <ul className="list attendance-list">
        {rows.map((r) => (
          <li key={r.id} className="list-row">
            <strong>{r.fullName}</strong>
            <div className="segmented">
              {OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`seg seg-${o.value} ${r.status === o.value ? 'active' : ''}`}
                  onClick={() => setStatus(r.id, o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="empty">No students in this class yet</p>}

      <div className="toolbar" style={{ marginTop: 16 }}>
        <button
          className="btn-secondary"
          onClick={() => setRows((rs) => rs.map((r) => ({ ...r, status: 'present' })))}
        >
          Mark all present
        </button>
        <button className="btn-primary" disabled={saving || rows.length === 0} onClick={save}>
          {saving ? 'Saving...' : 'Save attendance'}
        </button>
      </div>
    </div>
  );
}
