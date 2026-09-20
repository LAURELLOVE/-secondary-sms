import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDetailSelection from '../hooks/useDetailSelection';
import Icon from '../components/Icon';
import { StudentsApi } from '../api';
import { CLASS_LEVELS, BRANCHES, classRequiresBranch } from '../curriculum';
import StudentForm from '../components/StudentForm';
import StudentDetail from '../components/StudentDetail';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [selectedId, selectStudent, closeDetail] = useDetailSelection();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  function refresh() {
    StudentsApi.list().then(setStudents);
  }

  useEffect(refresh, []);

  const branchFilterApplicable = classFilter === 'All' || classRequiresBranch(classFilter);

  const filtered = students
    .filter(
      (s) =>
        s.fullName.toLowerCase().includes(query.toLowerCase()) ||
        s.admissionNumber.toLowerCase().includes(query.toLowerCase())
    )
    .filter((s) => classFilter === 'All' || s.className === classFilter)
    .filter((s) => branchFilter === 'All' || s.branch === branchFilter)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const classCounts = useMemo(() => {
    const counts = {};
    students.forEach((s) => { counts[s.className] = (counts[s.className] || 0) + 1; });
    return counts;
  }, [students]);

  const selected = students.find((s) => s.id === selectedId);

  async function save(data) {
    if (editing) {
      await StudentsApi.update(editing.id, data);
    } else {
      await StudentsApi.create(data);
    }
    setShowForm(false);
    setEditing(null);
    refresh();
  }

  async function remove(id) {
    if (!confirm('Delete this student and all related grade and fee records?')) return;
    await StudentsApi.remove(id);
    closeDetail();
    refresh();
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImportMessage('Importing...');
    try {
      const result = await StudentsApi.import(file);
      setImportMessage(
        `Imported ${result.importedCount} student(s).` +
          (result.errors.length ? ` ${result.errors.length} row(s) skipped.` : '')
      );
      refresh();
    } catch (err) {
      setImportMessage(`Import failed: ${err.message}`);
    }
  }

  async function exportCsv() {
    const token = localStorage.getItem('sms_token');
    const res = await fetch(StudentsApi.exportUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`page split ${selectedId ? 'has-detail' : ''}`}>
      <div className="master">
        <div className="master-toolbar">
          <input
            placeholder="Search students..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-primary fab" aria-label="Add student" onClick={() => { setEditing(null); setShowForm(true); }}><Icon name="add" /></button>
        </div>
        <div className="master-toolbar" style={{ borderTop: 'none' }}>
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setBranchFilter('All'); }}
          >
            <option value="All">All classes</option>
            {CLASS_LEVELS.map((c) => (
              <option key={c} value={c}>{c}{classCounts[c] ? ` (${classCounts[c]})` : ''}</option>
            ))}
          </select>
          {branchFilterApplicable && (
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="All">All branches</option>
              {BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          )}
        </div>
        <div className="master-toolbar web-only" style={{ borderTop: 'none' }}>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Import CSV</button>
          <button className="btn-secondary" onClick={exportCsv}>Export CSV</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
        {importMessage && <p className="hint" style={{ padding: '0 12px' }}>{importMessage}</p>}
        <ul className="list">
          {filtered.map((s) => (
            <li
              key={s.id}
              className={`list-row selectable ${s.id === selectedId ? 'selected' : ''}`}
              onClick={() => selectStudent(s.id)}
            >
              <div className="avatar avatar-placeholder">{s.fullName?.[0] || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{s.fullName}</strong>
                <div className="muted">
                  {s.className}{s.section}{s.branch ? ` (${s.branch})` : ''} • {s.admissionNumber}
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && <p className="empty">No students found</p>}
        </ul>
      </div>
      <div className="detail-pane">
        {selected ? (
          <StudentDetail
            student={selected}
            initialTab={searchParams.get('tab') || 'profile'}
            onEdit={() => { setEditing(selected); setShowForm(true); }}
            onDelete={() => remove(selected.id)}
          />
        ) : (
          <p className="empty center">{selectedId ? 'Loading...' : 'Select a student to view details'}</p>
        )}
      </div>
      {showForm && (
        <StudentForm
          existing={editing}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
