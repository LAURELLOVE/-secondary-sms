import { useEffect, useState } from 'react';
import { GradesApi, FeesApi, ACADEMIC_YEARS, TERMS } from '../api';
import { formatFCFA } from '../currency';
import GradeForm from './GradeForm';
import FeeForm from './FeeForm';
import PaymentForm from './PaymentForm';

export default function StudentDetail({ student, initialTab = 'profile', onEdit, onDelete }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => setTab(initialTab), [initialTab, student.id]);

  return (
    <div className="detail">
      <div className="detail-header">
        <h2>{student.fullName}</h2>
        <div className="detail-actions">
          <button className="icon-btn" onClick={onEdit} title="Edit">✏️</button>
          <button className="icon-btn" onClick={onDelete} title="Delete">🗑️</button>
        </div>
      </div>
      <div className="tabs">
        {['profile', 'grades', 'fees'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfileTab student={student} />}
      {tab === 'grades' && <GradesTab student={student} />}
      {tab === 'fees' && <FeesTab student={student} />}
    </div>
  );
}

function ProfileTab({ student }) {
  const rows = [
    ['Admission number', student.admissionNumber],
    ['Class', `${student.className} ${student.section}`],
    ['Gender', student.gender],
    ['Date of birth', student.dateOfBirth],
    ['Admission date', student.admissionDate],
    ['Status', student.status],
    ['Guardian name', student.guardianName],
    ['Guardian phone', student.guardianPhone],
    ['Address', student.address],
  ];
  return (
    <div className="tab-content">
      {rows.map(([label, value]) => (
        <div className="info-row" key={label}>
          <span className="info-label">{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

function GradesTab({ student }) {
  const [year, setYear] = useState(ACADEMIC_YEARS[0]);
  const [term, setTerm] = useState(TERMS[0]);
  const [report, setReport] = useState({ subjects: [], average: 0, overallGrade: '-' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  function refresh() {
    GradesApi.reportCard(student.id, term, year).then(setReport);
  }

  useEffect(refresh, [student.id, term, year]);

  async function save(data) {
    if (editing) {
      await GradesApi.update(editing.id, data);
    } else {
      await GradesApi.create({ ...data, studentId: student.id, academicYear: year, term });
    }
    setShowForm(false);
    setEditing(null);
    refresh();
  }

  async function remove(id) {
    await GradesApi.remove(id);
    refresh();
  }

  return (
    <div className="tab-content">
      <div className="toolbar">
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)}>
          {TERMS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add subject score</button>
      </div>
      <div className="summary-card">
        <span>Average: {report.average.toFixed(1)}</span>
        <span>Overall grade: {report.overallGrade}</span>
      </div>
      {report.subjects.length === 0 ? (
        <p className="empty">No grades recorded for this term yet</p>
      ) : (
        <ul className="list">
          {report.subjects.map((g) => (
            <li key={g.id} className="list-row">
              <div>
                <strong>{g.subject}</strong>
                {g.remarks && <div className="muted">{g.remarks}</div>}
              </div>
              <div className="list-row-actions">
                <span>CA {g.caScore} + Exam {g.examScore} = {g.total} ({g.letterGrade})</span>
                <button className="icon-btn" onClick={() => { setEditing(g); setShowForm(true); }}>✏️</button>
                <button className="icon-btn" onClick={() => remove(g.id)}>🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {showForm && (
        <GradeForm
          existing={editing}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function FeesTab({ student }) {
  const [records, setRecords] = useState([]);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [payingFee, setPayingFee] = useState(null);
  const [expanded, setExpanded] = useState(null);

  function refresh() {
    FeesApi.forStudent(student.id).then(setRecords);
  }

  useEffect(refresh, [student.id]);

  async function addFee(data) {
    await FeesApi.create({ ...data, studentId: student.id });
    setShowFeeForm(false);
    refresh();
  }

  async function pay(data) {
    await FeesApi.addPayment(payingFee.id, data);
    setPayingFee(null);
    refresh();
  }

  return (
    <div className="tab-content">
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn-primary" onClick={() => setShowFeeForm(true)}>+ Add fee record</button>
      </div>
      {records.length === 0 ? (
        <p className="empty">No fee records for this student yet</p>
      ) : (
        records.map((r) => (
          <div className="card" key={r.id}>
            <div className="card-header" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              <span>{r.academicYear} • {r.term}</span>
              <span className={r.isFullyPaid ? 'ok-text' : 'error-text'}>
                Due: {formatFCFA(r.amountDue)}  Paid: {formatFCFA(r.amountPaid)}  Balance: {formatFCFA(r.balance)}
              </span>
            </div>
            {expanded === r.id && (
              <div className="card-body">
                {r.payments.map((p) => (
                  <div className="payment-row" key={p.id}>
                    {formatFCFA(p.amount)} • {p.method} — {p.receiptNumber} • {new Date(p.date).toLocaleDateString()}
                  </div>
                ))}
                <button
                  className="btn-secondary"
                  disabled={r.isFullyPaid}
                  onClick={() => setPayingFee(r)}
                >
                  Record payment
                </button>
              </div>
            )}
          </div>
        ))
      )}
      {showFeeForm && <FeeForm onSave={addFee} onCancel={() => setShowFeeForm(false)} />}
      {payingFee && (
        <PaymentForm balance={payingFee.balance} onSave={pay} onCancel={() => setPayingFee(null)} />
      )}
    </div>
  );
}
