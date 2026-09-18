import { useState } from 'react';
import { ACADEMIC_YEARS } from '../api';
import { CLASS_LEVELS, BRANCHES, classRequiresBranch, subjectsFor } from '../curriculum';

export default function AssignmentForm({ onSave, onCancel }) {
  const [className, setClassName] = useState(CLASS_LEVELS[0]);
  const [section, setSection] = useState('');
  const [branch, setBranch] = useState('');
  const [subject, setSubject] = useState('');
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0]);

  const needsBranch = classRequiresBranch(className);
  const subjectOptions = subjectsFor(className, branch);

  function submit(e) {
    e.preventDefault();
    if (!className || !subject || (needsBranch && !branch)) return;
    onSave({ className, section, branch: needsBranch ? branch : '', subject, academicYear });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <h3>Assign class &amp; subject</h3>
        <div className="form-row">
          <label>
            Class
            <select
              value={className}
              onChange={(e) => { setClassName(e.target.value); setSubject(''); }}
            >
              {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Section
            <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" />
          </label>
        </div>
        {needsBranch && (
          <label>
            Branch
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setSubject(''); }} required>
              <option value="" disabled>Select a branch</option>
              {BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
        )}
        <label>
          Subject
          <select value={subject} onChange={(e) => setSubject(e.target.value)} required disabled={needsBranch && !branch}>
            <option value="" disabled>Select a subject</option>
            {subjectOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Academic year
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">Assign</button>
        </div>
      </form>
    </div>
  );
}
