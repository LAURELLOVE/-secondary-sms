import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentsApi, FeesApi } from '../api';
import { CLASS_LEVELS, BRANCHES, classRequiresBranch } from '../curriculum';
import { formatFCFA } from '../currency';

export default function FeesOverview() {
  const [allRows, setAllRows] = useState([]);
  const [classFilter, setClassFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const navigate = useNavigate();

  const branchFilterApplicable = classFilter === 'All' || classRequiresBranch(classFilter);

  useEffect(() => {
    Promise.all([StudentsApi.list(), FeesApi.all()]).then(([students, fees]) => {
      const computed = students
        .map((s) => {
          const records = fees.filter((f) => f.studentId === s.id);
          const due = records.reduce((sum, r) => sum + r.amountDue, 0);
          const paid = records.reduce((sum, r) => sum + r.amountPaid, 0);
          return { student: s, due, paid, balance: due - paid };
        })
        .sort((a, b) => b.balance - a.balance);
      setAllRows(computed);
    });
  }, []);

  const rows = allRows
    .filter((r) => classFilter === 'All' || r.student.className === classFilter)
    .filter((r) => branchFilter === 'All' || r.student.branch === branchFilter);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Fees overview</h2>
        <div className="spacer" />
        <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setBranchFilter('All'); }}>
          <option value="All">All classes</option>
          {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
        </select>
        {branchFilterApplicable && (
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="All">All branches</option>
            {BRANCHES.map((b) => <option key={b}>{b}</option>)}
          </select>
        )}
        <button className="btn-secondary" onClick={() => FeesApi.exportCsv().catch((e) => alert(e.message))}>
          Export CSV
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Student</th><th>Class</th><th>Amount due</th><th>Amount paid</th><th>Balance</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map(({ student, due, paid, balance }) => {
            const fullyPaid = balance <= 0;
            return (
              <tr key={student.id} onClick={() => navigate(`/students?open=${student.id}&tab=fees`)}>
                <td>{student.fullName}</td>
                <td>{student.className}{student.section}{student.branch ? ` (${student.branch})` : ''}</td>
                <td>{formatFCFA(due)}</td>
                <td>{formatFCFA(paid)}</td>
                <td className={fullyPaid ? 'ok-text' : 'error-text'}>{formatFCFA(balance)}</td>
                <td><span className={`chip ${fullyPaid ? 'chip-ok' : 'chip-warn'}`}>{fullyPaid ? 'Paid' : 'Owing'}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="empty">No students found</p>}
    </div>
  );
}
