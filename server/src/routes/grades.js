import { Router } from 'express';
import { GradeStore, StudentStore, AssignmentStore, gradeTotal, letterGrade } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { toCsv, sendCsv } from '../utils/csv.js';

const router = Router();

export const CA_MAX = 30;
export const EXAM_MAX = 70;

async function reportCard(studentId, term, academicYear) {
  const records = await GradeStore.forStudent(studentId, { term, academicYear });
  const subjects = records.map((g) => ({
    ...g,
    total: gradeTotal(g),
    letterGrade: letterGrade(gradeTotal(g)),
  }));
  const average = subjects.length
    ? subjects.reduce((sum, g) => sum + g.total, 0) / subjects.length
    : 0;
  return { studentId, term, academicYear, subjects, average, overallGrade: letterGrade(average) };
}

async function assertTeacherOwnsSubject(req, res, studentId, subject) {
  if (req.user.role !== 'teacher') return true;
  const student = await StudentStore.find(studentId);
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return false;
  }
  const assignments = await AssignmentStore.forTeacher(req.user.sub);
  const allowed = assignments.some(
    (a) => a.className === student.className && a.section === student.section && a.subject === subject
  );
  if (!allowed) {
    res.status(403).json({ error: 'You are not assigned to teach this subject for this student' });
    return false;
  }
  return true;
}

function validScores(caScore, examScore) {
  return (
    typeof caScore === 'number' && caScore >= 0 && caScore <= CA_MAX &&
    typeof examScore === 'number' && examScore >= 0 && examScore <= EXAM_MAX
  );
}

router.get('/student/:studentId', requireAuth('admin', 'teacher'), async (req, res) => {
  const { term, academicYear } = req.query;
  res.json(await reportCard(req.params.studentId, term, academicYear));
});

// Full report card: the student's results plus their position among classmates
// (same class, section and branch) ranked by term average.
router.get('/report-card/:studentId', requireAuth('admin'), async (req, res) => {
  const { term, academicYear } = req.query;
  const student = await StudentStore.find(req.params.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const card = await reportCard(student.id, term, academicYear);
  const everyone = await StudentStore.all();
  const classmates = everyone.filter(
    (s) =>
      s.className === student.className &&
      (s.section || '') === (student.section || '') &&
      (s.branch || '') === (student.branch || '')
  );
  const ranked = (
    await Promise.all(
      classmates.map(async (s) => {
        const c = await reportCard(s.id, term, academicYear);
        return { id: s.id, average: c.average, hasResults: c.subjects.length > 0 };
      })
    )
  ).filter((r) => r.hasResults);

  const position = card.subjects.length
    ? 1 + ranked.filter((r) => r.average > card.average).length
    : null;

  res.json({ student, ...card, position, classSize: ranked.length });
});

router.get('/export', requireAuth('admin'), async (req, res) => {
  const { term, academicYear, className } = req.query;
  const students = (await StudentStore.all()).filter((s) => !className || s.className === className);
  const rows = [];
  for (const s of students) {
    // eslint-disable-next-line no-await-in-loop
    const records = await GradeStore.forStudent(s.id, { term, academicYear });
    records.forEach((g) =>
      rows.push([
        s.fullName, s.admissionNumber, s.className, s.section, s.branch, g.academicYear, g.term,
        g.subject, g.caScore, g.examScore, gradeTotal(g), letterGrade(gradeTotal(g)),
      ])
    );
  }
  sendCsv(
    res,
    'grades.csv',
    toCsv(
      ['Student', 'Admission No', 'Class', 'Section', 'Branch', 'Academic Year', 'Term',
        'Subject', 'CA', 'Exam', 'Total', 'Grade'],
      rows
    )
  );
});

router.post('/', requireAuth('admin', 'teacher'), async (req, res) => {
  const { studentId, subject, caScore, examScore } = req.body;
  if (!validScores(caScore, examScore)) {
    return res.status(400).json({ error: `CA score must be 0-${CA_MAX} and exam score 0-${EXAM_MAX}` });
  }
  if (!(await assertTeacherOwnsSubject(req, res, studentId, subject))) return;

  const grade = await GradeStore.create(req.body);
  res.status(201).json({ ...grade, total: gradeTotal(grade), letterGrade: letterGrade(gradeTotal(grade)) });
});

router.put('/:id', requireAuth('admin', 'teacher'), async (req, res) => {
  const { caScore, examScore } = req.body;
  if ((caScore !== undefined || examScore !== undefined) && !validScores(
    caScore ?? 0, examScore ?? 0
  )) {
    return res.status(400).json({ error: `CA score must be 0-${CA_MAX} and exam score 0-${EXAM_MAX}` });
  }

  const grade = await GradeStore.update(req.params.id, req.body);
  if (!grade) return res.status(404).json({ error: 'Grade not found' });
  if (req.user.role === 'teacher' && !(await assertTeacherOwnsSubject(req, res, grade.studentId, grade.subject))) return;

  res.json({ ...grade, total: gradeTotal(grade), letterGrade: letterGrade(gradeTotal(grade)) });
});

router.delete('/:id', requireAuth('admin', 'teacher'), async (req, res) => {
  const removed = await GradeStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Grade not found' });
  res.status(204).end();
});

export default router;
