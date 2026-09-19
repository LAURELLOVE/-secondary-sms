import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { TeachersApi, SERVER_ORIGIN } from '../api';
import TeacherForm from '../components/TeacherForm';
import AssignmentForm from '../components/AssignmentForm';
import AccessCodeModal from '../components/AccessCodeModal';

function Avatar({ teacher, size = '' }) {
  if (teacher.photoUrl) {
    return <img src={`${SERVER_ORIGIN}${teacher.photoUrl}`} alt={teacher.fullName} className={`avatar ${size}`} />;
  }
  return <div className={`avatar avatar-placeholder ${size}`}>{teacher.fullName?.[0] || '?'}</div>;
}

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [revealedCode, setRevealedCode] = useState(null);
  const [portalError, setPortalError] = useState('');
  const { startImpersonation } = useAuth();

  function refreshList() {
    TeachersApi.list().then(setTeachers);
  }

  useEffect(refreshList, []);

  useEffect(() => {
    if (selectedId) TeachersApi.get(selectedId).then(setDetail);
    else setDetail(null);
  }, [selectedId]);

  async function save(data, photoFile) {
    let teacherId = editing?.id;
    if (editing) {
      await TeachersApi.update(editing.id, data);
    } else {
      const created = await TeachersApi.create(data);
      teacherId = created.id;
      setRevealedCode({ teacher: created, accessCode: created.accessCode });
    }
    if (photoFile && teacherId) {
      await TeachersApi.uploadPhoto(teacherId, photoFile);
    }
    setShowForm(false);
    setEditing(null);
    refreshList();
    if (selectedId) TeachersApi.get(selectedId).then(setDetail);
    if (!selectedId && teacherId) setSelectedId(teacherId);
  }

  async function openPortal(teacher) {
    setPortalError('');
    try {
      const res = await TeachersApi.impersonate(teacher.id);
      startImpersonation(res.token, res.role, res.user);
    } catch (err) {
      setPortalError(err.message);
    }
  }

  async function toggleStatus(teacher) {
    const next = teacher.status === 'active' ? 'inactive' : 'active';
    const verb = next === 'inactive' ? 'Deactivate' : 'Reactivate';
    if (!confirm(`${verb} ${teacher.fullName}? ${next === 'inactive' ? 'They will not be able to sign in.' : ''}`)) return;
    await TeachersApi.update(teacher.id, { status: next });
    refreshList();
    TeachersApi.get(teacher.id).then(setDetail);
  }

  async function regenerateCode(teacher) {
    if (!confirm(`Generate a new access code for ${teacher.fullName}? Their current code will stop working.`)) return;
    const { accessCode } = await TeachersApi.regenerateCode(teacher.id);
    setRevealedCode({ teacher, accessCode });
  }

  async function remove(id) {
    if (!confirm('Remove this teacher? Their login and class assignments will be deleted.')) return;
    await TeachersApi.remove(id);
    setSelectedId(null);
    refreshList();
  }

  async function saveAssignment(data) {
    if (editingAssignment) {
      await TeachersApi.updateAssignment(editingAssignment.id, data);
    } else {
      await TeachersApi.addAssignment(selectedId, data);
    }
    setShowAssignForm(false);
    setEditingAssignment(null);
    TeachersApi.get(selectedId).then(setDetail);
  }

  async function removeAssignment(assignmentId) {
    await TeachersApi.removeAssignment(assignmentId);
    TeachersApi.get(selectedId).then(setDetail);
  }

  return (
    <div className="page split">
      <div className="master">
        <div className="master-toolbar">
          <span className="muted" style={{ padding: '0 4px' }}>Teachers</span>
          <div className="spacer" />
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+</button>
        </div>
        <ul className="list">
          {teachers.map((t) => (
            <li
              key={t.id}
              className={`list-row selectable ${t.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelectedId(t.id)}
            >
              <Avatar teacher={t} />
              <div style={{ flex: 1 }}>
                <strong>{t.fullName}</strong>
                <div className="muted">{t.subjectSpecialization} • {t.phone}</div>
              </div>
            </li>
          ))}
          {teachers.length === 0 && <p className="empty">No teachers yet</p>}
        </ul>
      </div>

      <div className="detail-pane">
        {detail ? (
          <div className="detail">
            <div className="detail-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar teacher={detail} size="avatar-lg" />
                <h2 style={{ margin: 0 }}>{detail.fullName}</h2>
              </div>
              <div className="detail-actions">
                <button className="btn-primary" onClick={() => openPortal(detail)}>👁 Open teacher portal</button>
                <button className="btn-secondary" onClick={() => toggleStatus(detail)}>
                  {detail.status === 'active' ? '⏸ Deactivate' : '▶ Reactivate'}
                </button>
                <button className="btn-secondary" onClick={() => regenerateCode(detail)}>🔑 Regenerate code</button>
                <button className="icon-btn" onClick={() => { setEditing(detail); setShowForm(true); }}>✏️</button>
                <button className="icon-btn" onClick={() => remove(detail.id)}>🗑️</button>
              </div>
            </div>

            {portalError && <p className="error-text">{portalError}</p>}
            <h3 style={{ marginTop: 20 }}>KYC details</h3>
            <div className="tab-content">
              {[
                ['Phone', detail.phone],
                ['Access code', detail.accessCode || 'Not available — click Regenerate code above'],
                ['Gender', detail.gender],
                ['Date of birth', detail.dateOfBirth],
                ['Address', detail.address],
                ['Qualification', detail.qualification],
                ['Subject specialization', detail.subjectSpecialization],
                ['Employee ID', detail.employeeId],
                ['Date of hire', detail.dateOfHire],
                ['National ID number', detail.nationalIdNumber],
                ['Status', detail.status],
              ].map(([label, value]) => (
                <div className="info-row" key={label}>
                  <span className="info-label">{label}</span>
                  <span style={label === 'Access code' ? { fontFamily: 'monospace', letterSpacing: '0.08em', fontWeight: 700 } : undefined}>
                    {value || '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="toolbar" style={{ marginTop: 20 }}>
              <h3 style={{ margin: 0 }}>Class &amp; subject assignments</h3>
              <div className="spacer" />
              <button className="btn-primary" onClick={() => { setEditingAssignment(null); setShowAssignForm(true); }}>+ Assign</button>
            </div>
            {detail.assignments?.length ? (
              <ul className="list">
                {detail.assignments.map((a) => (
                  <li className="list-row" key={a.id}>
                    <span>
                      {a.subject} — {a.className}{a.section}{a.branch ? ` (${a.branch})` : ''} • {a.academicYear}
                    </span>
                    <span className="list-row-actions">
                      <button className="icon-btn" title="Edit assignment" onClick={() => { setEditingAssignment(a); setShowAssignForm(true); }}>✏️</button>
                      <button className="icon-btn" title="Remove assignment" onClick={() => removeAssignment(a.id)}>🗑️</button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No classes assigned yet</p>
            )}
          </div>
        ) : (
          <p className="empty center">Select a teacher to view their KYC record</p>
        )}
      </div>

      {showForm && (
        <TeacherForm existing={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(null); }} />
      )}
      {showAssignForm && (
        <AssignmentForm
          existing={editingAssignment}
          onSave={saveAssignment}
          onCancel={() => { setShowAssignForm(false); setEditingAssignment(null); }}
        />
      )}
      {revealedCode && (
        <AccessCodeModal
          teacher={revealedCode.teacher}
          accessCode={revealedCode.accessCode}
          onClose={() => setRevealedCode(null)}
        />
      )}
    </div>
  );
}
