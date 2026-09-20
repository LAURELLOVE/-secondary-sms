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

  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');

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

  async function saveEdit(e) {
    e.preventDefault();
    setDialogError('');
    try {
      await AdminsApi.update(editing.id, { fullName: editing.fullName, username: editing.username });
      setEditing(null);
      refresh();
    } catch (err) {
      setDialogError(err.message);
    }
  }

  async function saveReset(e) {
    e.preventDefault();
    setDialogError('');
    try {
      await AdminsApi.resetPassword(resetting.id, resetting.newPassword);
      setNotice(`Password reset for ${resetting.fullName}.`);
      setResetting(null);
    } catch (err) {
      setDialogError(err.message);
    }
  }

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="page">
      <h2 className="desktop-only">Administrators</h2>

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
      {notice && <p className="ok-text">{notice}</p>}
      <ul className="list card">
        {admins.map((a) => (
          <li key={a.id} className="list-row">
            <div>
              <strong>{a.fullName}</strong>
              <div className="muted">@{a.username}{a.id === user?.id ? ' • you' : ''}</div>
            </div>
            <div className="list-row-actions">
              <button className="icon-btn" title="Edit" onClick={() => { setDialogError(''); setEditing({ ...a }); }}>✏️</button>
              {a.id !== user?.id && (
                <button className="icon-btn" title="Reset password" onClick={() => { setDialogError(''); setResetting({ ...a, newPassword: '' }); }}>🔑</button>
              )}
              {a.id !== user?.id && (
                <button className="icon-btn" title="Remove" onClick={() => remove(a)}>🗑️</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={saveEdit}>
            <h3>Edit administrator</h3>
            {dialogError && <p className="error-text">{dialogError}</p>}
            <label>
              Full name
              <input value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} required />
            </label>
            <label>
              Username
              <input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} required />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
      {resetting && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={saveReset}>
            <h3>Reset password for {resetting.fullName}</h3>
            <p className="hint">Passwords are stored securely and can't be viewed, so set a new one and share it with them.</p>
            {dialogError && <p className="error-text">{dialogError}</p>}
            <label>
              New password (min. 8 characters)
              <input type="password" value={resetting.newPassword} onChange={(e) => setResetting({ ...resetting, newPassword: e.target.value })} minLength={8} required />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setResetting(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Reset password</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
