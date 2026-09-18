import { useState } from 'react';
import { CLASS_LEVELS, BRANCHES, classRequiresBranch } from '../curriculum';

const emptyForm = {
  fullName: '',
  admissionNumber: '',
  className: CLASS_LEVELS[0],
  branch: '',
  section: '',
  gender: 'Male',
  dateOfBirth: '2010-01-01',
  guardianName: '',
  guardianPhone: '',
  address: '',
};

export default function StudentForm({ existing, onSave, onCancel }) {
  const [form, setForm] = useState(existing ? { ...existing } : { ...emptyForm });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.fullName || !form.admissionNumber || !form.className) return;
    onSave(form);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <h3>{existing ? 'Edit Student' : 'Add Student'}</h3>
        <label>
          Full name
          <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
        </label>
        <label>
          Admission number
          <input value={form.admissionNumber} onChange={(e) => set('admissionNumber', e.target.value)} required />
        </label>
        <div className="form-row">
          <label>
            Class
            <select value={form.className} onChange={(e) => set('className', e.target.value)}>
              {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Section
            <input value={form.section} onChange={(e) => set('section', e.target.value)} placeholder="e.g. A" />
          </label>
        </div>
        {classRequiresBranch(form.className) && (
          <label>
            Branch
            <select value={form.branch} onChange={(e) => set('branch', e.target.value)} required>
              <option value="" disabled>Select a branch</option>
              {BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
        )}
        <label>
          Gender
          <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option>Male</option>
            <option>Female</option>
          </select>
        </label>
        <label>
          Date of birth
          <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
        </label>
        <label>
          Guardian name
          <input value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} required />
        </label>
        <label>
          Guardian phone
          <input value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} required />
        </label>
        <label>
          Address
          <input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">{existing ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  );
}
