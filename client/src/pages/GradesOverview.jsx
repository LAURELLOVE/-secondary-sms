import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentsApi, GradesApi, ACADEMIC_YEARS, TERMS } from '../api';
import { CLASS_LEVELS, BRANCHES, classRequiresBranch } from '../curriculum';

export default function GradesOverview() {
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [year, setYear] = useState(ACADEMIC_YEARS[0]);
  const [term, setTerm] = useState(TERMS[0]);
  const [classFilter, setClassFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const navigate = useNavigate();

  const branchFilterApplicable = classFilter === 'All' || classRequiresBranch(classFilter);

  useEffect(() => {
    StudentsApi.list().then(setStudents);
  }, []);

  const scopedStudents = students
    .filter((s) => classFilter === 'All' || s.className === classFilter)
    .filter((s) => branchFilter === 'All' || s.branch === branchFilter);

  useEffect(() => {
    if (scopedStudents.length === 0) return setRows([]);
    Promise.all(scopedStudents.map((s) => GradesApi.reportCard(s.id, term, year).then((r) => ({ student: s, report: r }))))
      .then((results) => results.sort((a, b) => a.student.fullName.localeCompare(b.student.fullName)))
      .then(setRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, term, year, classFilter, branchFilter]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="desktop-only">Grades overview</h2>
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
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)}>
          {TERMS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button
          className="btn-secondary web-only"
          onClick={() => GradesApi.exportCsv(term, year, classFilter === 'All' ? undefined : classFilter).catch((e) => alert(e.message))}
        >
          Export CSV
        </button>
      </div>
      <table className="data-table stack">
        <thead>
          <tr><th>Student</th><th>Class</th><th>Subjects recorded</th><th>Average</th><th>Grade</th></tr>
        </thead>
        <tbody>
          {rows.map(({ student, report }) => (
            <tr key={student.id} onClick={() => navigate(`/students?open=${student.id}&tab=grades`)}>
              <td>{student.fullName}</td>
              <td data-label="Class">{student.className}{student.section}{student.branch ? ` (${student.branch})` : ''}</td>
              <td data-label="Subjects recorded">{report.subjects.length}</td>
              <td data-label="Average">{report.average.toFixed(1)}</td>
              <td data-label="Grade">{report.overallGrade}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="empty">No students found</p>}
    </div>
  );
}
