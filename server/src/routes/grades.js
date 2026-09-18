import { Router } from 'express';
import { GradeStore, StudentStore, AssignmentStore, gradeTotal, letterGrade } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';

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
