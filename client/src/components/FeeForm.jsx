import { useState } from 'react';
import { ACADEMIC_YEARS, TERMS } from '../api';

export default function FeeForm({ existing, onSave, onCancel }) {
  const [academicYear, setAcademicYear] = useState(existing?.academicYear || ACADEMIC_YEARS[0]);
  const [term, setTerm] = useState(existing?.term || TERMS[0]);
  const [amountDue, setAmountDue] = useState(existing?.amountDue ?? '');
  const [dueDate, setDueDate] = useState(() => {
    if (existing?.dueDate) return existing.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  function submit(e) {
    e.preventDefault();
    const amount = Number(amountDue);
    if (!amount || amount <= 0) return;
    onSave({ academicYear, term, amountDue: amount, dueDate });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <h3>{existing ? 'Edit fee record' : 'Add fee record'}</h3>
        <label>
          Academic year
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
        <label>
          Term
          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            {TERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Amount due (FCFA)
          <input type="number" min="1" step="1" placeholder="e.g. 50000" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} required />
        </label>
        <label>
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">{existing ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  );
}
