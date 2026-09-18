import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TeachersApi, GradesApi, TERMS, CA_MAX, EXAM_MAX } from '../../api';

export default function MarkEntry() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const className = params.get('className');
  const section = params.get('section');
  const subject = params.get('subject');
  const academicYear = params.get('academicYear');

  const [term, setTerm] = useState(TERMS[0]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const students = await TeachersApi.myClassStudents(className, section);
      const withMarks = await Promise.all(
        students.map(async (student) => {
          const report = await GradesApi.reportCard(student.id, term, academicYear);
          const existing = report.subjects.find((s) => s.subject === subject);
          return {
            student,
            gradeId: existing?.id || null,
            caScore: existing?.caScore ?? '',
            examScore: existing?.examScore ?? '',
          };
        })
      );
      if (!cancelled) setRows(withMarks);
    }

    load();
    return () => { cancelled = true; };
  }, [className, section, subject, academicYear, term]);

  function updateRow(studentId, field, value) {
    setRows((rs) => rs.map((r) => (r.student.id === studentId ? { ...r, [field]: value } : r)));
  }

  async function saveAll() {
    setSaving(true);
    setMessage('');
    try {
      for (const row of rows) {
        if (row.caScore === '' || row.examScore === '') continue;
        const payload = {
          studentId: row.student.id,
          subject,
          academicYear,
          term,
          caScore: Number(row.caScore),
          examScore: Number(row.examScore),
        };
        if (row.gradeId) {
          await GradesApi.update(row.gradeId, payload);
        } else {
          await GradesApi.create(payload);
        }
      }
      setMessage('Marks saved successfully.');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-secondary" onClick={() => navigate('/teacher')}>← Back</button>
        <h2>{subject} — {className}{section}</h2>
        <div className="spacer" />
        <select value={term} onChange={(e) => setTerm(e.target.value)}>
          {TERMS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {message && <p className={message.startsWith('Error') ? 'error-text' : 'ok-text'}>{message}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>CA score (0-{CA_MAX})</th>
            <th>Exam score (0-{EXAM_MAX})</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = (Number(r.caScore) || 0) + (Number(r.examScore) || 0);
            return (
              <tr key={r.student.id}>
                <td>{r.student.fullName}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max={CA_MAX}
                    value={r.caScore}
                    onChange={(e) => updateRow(r.student.id, 'caScore', e.target.value)}
                    className="table-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max={EXAM_MAX}
                    value={r.examScore}
                    onChange={(e) => updateRow(r.student.id, 'examScore', e.target.value)}
                    className="table-input"
                  />
                </td>
                <td>{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="empty">No students in this class yet</p>}

      <button className="btn-primary" style={{ marginTop: 16 }} disabled={saving} onClick={saveAll}>
        {saving ? 'Saving...' : 'Save all marks'}
      </button>
    </div>
  );
}
