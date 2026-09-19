import { useEffect, useState } from 'react';
import { AdminsApi } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function Admins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [listError, setListError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState(null);

  const [form, setForm] = useState({ username: '', fullName: '', password: '' });
  const [addMessage, setAddMessage] = useState(null);

  function refresh() {
    AdminsApi.list().then(setAdmins).catch((e) => setListError(e.message));
  }

  useEffect(refresh, []);

  async function changePassword(e) {
    e.preventDefault();
    setPwMessage(null);
    try {
      await AdminsApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPwMessage({ ok: true, text: 'Password changed.' });
    } catch (err) {
      setPwMessage({ ok: false, text: err.message });
    }
  }

  async function addAdmin(e) {
    e.preventDefault();
    setAddMessage(null);
    try {
      await AdminsApi.create(form);
      setForm({ username: '', fullName: '', password: '' });
      setAddMessage({ ok: true, text: 'Administrator added.' });
      refresh();
    } catch (err) {
      setAddMessage({ ok: false, text: err.message });
    }
  }

  async function remove(admin) {
    if (!confirm(`Remove administrator "${admin.fullName}"? They will no longer be able to sign in.`)) return;
    try {
      await AdminsApi.remove(admin.id);
      refresh();
    } catch (err) {
      setListError(err.message);
    }
  }

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="page">
      <h2>Administrators</h2>

      <div className="settings-grid">
        <form className="card settings-card" onSubmit={changePassword}>
          <h3>Change my password</h3>
          <label>
            Current password
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label>
            New password (min. 8 characters)
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
          </label>
          {pwMessage && <p className={pwMessage.ok ? 'ok-text' : 'error-text'}>{pwMessage.text}</p>}
          <button type="submit" className="btn-primary">Update password</button>
        </form>

        <form className="card settings-card" onSubmit={addAdmin}>
          <h3>Add an administrator</h3>
          <label>
            Full name
            <input value={form.fullName} onChange={setField('fullName')} required />
          </label>
          <label>
            Username
            <input value={form.username} onChange={setField('username')} required />
          </label>
          <label>
            Password (min. 8 characters)
            <input type="password" value={form.password} onChange={setField('password')} minLength={8} required />
          </label>
          {addMessage && <p className={addMessage.ok ? 'ok-text' : 'error-text'}>{addMessage.text}</p>}
          <button type="submit" className="btn-primary">Add administrator</button>
        </form>
      </div>

      <h3 style={{ marginTop: 24 }}>All administrators</h3>
      {listError && <p className="error-text">{listError}</p>}
      <ul className="list card">
        {admins.map((a) => (
          <li key={a.id} className="list-row">
            <div>
              <strong>{a.fullName}</strong>
              <div className="muted">@{a.username}{a.id === user?.id ? ' • you' : ''}</div>
            </div>
            {a.id !== user?.id && (
              <button className="icon-btn" title="Remove" onClick={() => remove(a)}>🗑️</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
