import { useState } from 'react';
import { SERVER_ORIGIN } from '../api';
import { normalizeCameroonPhone } from '../phone';

const empty = {
  fullName: '',
  phone: '',
  gender: 'Female',
  dateOfBirth: '1990-01-01',
  address: '',
  qualification: '',
  subjectSpecialization: '',
  employeeId: '',
  dateOfHire: new Date().toISOString().slice(0, 10),
  nationalIdNumber: '',
};

export default function TeacherForm({ existing, onSave, onCancel }) {
  const [form, setForm] = useState(existing ? { ...existing } : { ...empty });
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(existing?.photoUrl ? `${SERVER_ORIGIN}${existing.photoUrl}` : null);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function pickPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.fullName || !form.phone) return;
    const normalizedPhone = normalizeCameroonPhone(form.phone);
    if (!normalizedPhone) {
      setError('Enter a valid Cameroon mobile number, e.g. +237 6XX XXX XXX');
      return;
    }
    const payload = { ...form, phone: normalizedPhone };
    onSave(payload, photoFile);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <h3>{existing ? 'Edit Teacher' : 'Add Teacher'}</h3>
        {error && <p className="error-text">{error}</p>}

        <div className="photo-picker">
          {preview ? (
            <img src={preview} alt="Preview" className="avatar avatar-lg" />
          ) : (
            <div className="avatar avatar-lg avatar-placeholder">{form.fullName?.[0] || '?'}</div>
          )}
          <label className="btn-secondary photo-picker-btn">
            Choose photo
            <input type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
          </label>
        </div>

        <label>
          Full name
          <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
        </label>
        <label>
          Cameroon phone number
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+237 6XX XXX XXX"
            inputMode="tel"
            required
          />
        </label>
        {!existing && (
          <p className="hint">
            An access code will be generated automatically once this teacher is saved — you'll be shown it to share with them.
          </p>
        )}
        <div className="form-row">
          <label>
            Gender
            <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option>Female</option>
              <option>Male</option>
            </select>
          </label>
          <label>
            Date of birth
            <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </label>
        </div>
        <label>
          Address
          <input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </label>
        <label>
          Qualification
          <input value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="e.g. B.Ed Mathematics" />
        </label>
        <label>
          Subject specialization
          <input value={form.subjectSpecialization} onChange={(e) => set('subjectSpecialization', e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Employee ID
            <input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} />
          </label>
          <label>
            Date of hire
            <input type="date" value={form.dateOfHire} onChange={(e) => set('dateOfHire', e.target.value)} />
          </label>
        </div>
        <label>
          National ID number
          <input value={form.nationalIdNumber} onChange={(e) => set('nationalIdNumber', e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">{existing ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  );
}
