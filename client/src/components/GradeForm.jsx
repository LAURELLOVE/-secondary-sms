import { useState } from 'react';
import { CA_MAX, EXAM_MAX } from '../api';

export default function GradeForm({ existing, onSave, onCancel }) {
  const [subject, setSubject] = useState(existing?.subject || '');
  const [caScore, setCaScore] = useState(existing?.caScore ?? '');
  const [examScore, setExamScore] = useState(existing?.examScore ?? '');

  function submit(e) {
    e.preventDefault();
    const ca = Number(caScore);
    const exam = Number(examScore);
    if (!subject || Number.isNaN(ca) || ca < 0 || ca > CA_MAX) return;
    if (Number.isNaN(exam) || exam < 0 || exam > EXAM_MAX) return;
    onSave({ subject, caScore: ca, examScore: exam });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <h3>{existing ? 'Edit subject score' : 'Add subject score'}</h3>
        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </label>
        <label>
          CA score (0-{CA_MAX})
          <input type="number" min="0" max={CA_MAX} value={caScore} onChange={(e) => setCaScore(e.target.value)} required />
        </label>
        <label>
          Exam score (0-{EXAM_MAX})
          <input type="number" min="0" max={EXAM_MAX} value={examScore} onChange={(e) => setExamScore(e.target.value)} required />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
