import { Router } from 'express';
import { AttendanceStore, AssignmentStore, StudentStore } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const STATUSES = ['present', 'absent', 'late'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const today = () => new Date().toISOString().slice(0, 10);

async function canAccessClass(req, className, section) {
  if (req.user.role === 'admin') return true;
  const assignments = await AssignmentStore.forTeacher(req.user.sub);
  return assignments.some((a) => a.className === className && (a.section || '') === (section || ''));
}

async function classStudents(className, section) {
  const students = await StudentStore.all();
  return students
    .filter((s) => s.className === className && (s.section || '') === (section || ''))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

// Attendance sheet for one class on one date (teachers: their own classes only).
router.get('/class', requireAuth('admin', 'teacher'), async (req, res) => {
  const { className, section = '' } = req.query;
  const date = req.query.date || today();
  if (!className) return res.status(400).json({ error: 'className is required' });
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  if (!(await canAccessClass(req, className, section))) {
    return res.status(403).json({ error: 'You are not assigned to this class' });
  }

  const [students, sheet] = await Promise.all([
    classStudents(className, section),
    AttendanceStore.forClassDate(className, section, date),
  ]);
  const statusById = new Map((sheet?.records || []).map((r) => [r.studentId, r.status]));
  res.json({
    className,
    section,
    date,
    marked: Boolean(sheet),
    students: students.map((s) => ({ id: s.id, fullName: s.fullName, status: statusById.get(s.id) || null })),
  });
});

router.put('/class', requireAuth('admin', 'teacher'), async (req, res) => {
  const { className, section = '', date, records } = req.body;
  if (!className || !DATE_RE.test(date || '') || !Array.isArray(records)) {
    return res.status(400).json({ error: 'className, date (YYYY-MM-DD) and records are required' });
  }
  if (date > today()) return res.status(400).json({ error: 'Cannot mark attendance for a future date' });
  if (!(await canAccessClass(req, className, section))) {
    return res.status(403).json({ error: 'You are not assigned to this class' });
  }

  const validIds = new Set((await classStudents(className, section)).map((s) => s.id));
  const clean = [];
  for (const r of records) {
    if (!validIds.has(r.studentId) || !STATUSES.includes(r.status)) {
      return res.status(400).json({ error: 'Records contain an unknown student or invalid status' });
    }
    clean.push({ studentId: r.studentId, status: r.status });
  }

  const saved = await AttendanceStore.upsert({
    className, section, date, records: clean, markedBy: req.user.name,
  });
  res.json(saved);
});

router.delete('/class', requireAuth('admin'), async (req, res) => {
  const { className, section = '', date } = req.query;
  if (!className || !DATE_RE.test(date || '')) {
    return res.status(400).json({ error: 'className and date (YYYY-MM-DD) are required' });
  }
  const removed = await AttendanceStore.remove(className, section, date);
  if (!removed) return res.status(404).json({ error: 'No attendance recorded for that class and date' });
  res.status(204).end();
});

function tally(sheets, studentId) {
  const counts = { present: 0, late: 0, absent: 0 };
  sheets.forEach((sheet) => {
    const rec = sheet.records.find((r) => r.studentId === studentId);
    if (rec) counts[rec.status] += 1;
  });
  const total = counts.present + counts.late + counts.absent;
  // Late still counts as attending for the rate.
  const rate = total ? Math.round(((counts.present + counts.late) / total) * 100) : null;
  return { ...counts, total, rate };
}

// Per-student totals for a class (or the whole school), optionally within a date range.
router.get('/summary', requireAuth('admin'), async (req, res) => {
  const { className, section, from, to } = req.query;
  const sheets = await AttendanceStore.list({ className, section, from, to });
  const students = (await StudentStore.all())
    .filter((s) => !className || s.className === className)
    .filter((s) => section === undefined || section === '' || (s.section || '') === section)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  res.json({
    daysMarked: new Set(sheets.map((s) => `${s.className}|${s.section}|${s.date}`)).size,
    students: students.map((s) => ({
      id: s.id, fullName: s.fullName, className: s.className, section: s.section, branch: s.branch,
      ...tally(sheets.filter((sh) => sh.className === s.className && (sh.section || '') === (s.section || '')), s.id),
    })),
  });
});

router.get('/student/:id', requireAuth('admin'), async (req, res) => {
  const student = await StudentStore.find(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const sheets = await AttendanceStore.list({ className: student.className, section: student.section || '' });
  const history = sheets
    .map((sh) => ({ date: sh.date, status: sh.records.find((r) => r.studentId === student.id)?.status }))
    .filter((h) => h.status)
    .sort((a, b) => b.date.localeCompare(a.date));
  res.json({ ...tally(sheets, student.id), history });
});

export default router;
