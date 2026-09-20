import { useEffect, useState } from 'react';
import { GradesApi } from '../api';

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export default function ReportCard({ studentId, term, academicYear, onClose }) {
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    GradesApi.fullReport(studentId, term, academicYear).then(setCard).catch((e) => setError(e.message));
  }, [studentId, term, academicYear]);

  return (
    <div className="modal-backdrop print-backdrop">
      <div className="modal modal-wide">
        {error && <p className="error-text">{error}</p>}
        {!card && !error && <p className="muted">Loading report card...</p>}
        {card && (
          <div className="print-area report-card">
            <div className="report-header">
              <h2>Secondary School Management System</h2>
              <p>Student Report Card</p>
            </div>
            <div className="report-meta">
              <div><span className="muted">Student</span><strong>{card.student.fullName}</strong></div>
              <div><span className="muted">Admission No</span><strong>{card.student.admissionNumber}</strong></div>
              <div>
                <span className="muted">Class</span>
                <strong>
                  {card.student.className}{card.student.section}{card.student.branch ? ` (${card.student.branch})` : ''}
                </strong>
              </div>
              <div><span className="muted">Academic year</span><strong>{academicYear}</strong></div>
              <div><span className="muted">Term</span><strong>{term}</strong></div>
            </div>

            {card.subjects.length === 0 ? (
              <p className="empty">No results recorded for this term yet.</p>
            ) : (
              <table className="data-table report-table">
                <thead>
                  <tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr>
                </thead>
                <tbody>
                  {card.subjects.map((g) => (
                    <tr key={g.id}>
                      <td>{g.subject}</td><td>{g.caScore}</td><td>{g.examScore}</td>
                      <td>{g.total}</td><td>{g.letterGrade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="report-summary">
              <div><span className="muted">Average</span><strong>{card.average.toFixed(1)}</strong></div>
              <div><span className="muted">Overall grade</span><strong>{card.overallGrade}</strong></div>
              <div>
                <span className="muted">Position</span>
                <strong>{card.position ? `${ordinal(card.position)} of ${card.classSize}` : '—'}</strong>
              </div>
            </div>
            <div className="report-signatures">
              <span>Class teacher's signature</span>
              <span>Principal's signature</span>
            </div>
          </div>
        )}
        <div className="modal-actions no-print">
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          {card && <button type="button" className="btn-primary web-only" onClick={() => window.print()}>Print</button>}
        </div>
      </div>
    </div>
  );
}
