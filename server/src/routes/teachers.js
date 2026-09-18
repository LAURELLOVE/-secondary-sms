import { Router } from 'express';
import multer from 'multer';
import { TeacherStore, AssignmentStore, StudentStore } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeCameroonPhone } from '../utils/phone.js';

const router = Router();

// Stored as a base64 data URI directly on the teacher document - no disk
// storage, so photos survive restarts/redeploys on hosts with ephemeral
// filesystems (Render free tier, etc.).
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

// ---- Admin: full KYC list/management ----
router.get('/', requireAuth('admin'), async (req, res) => {
  const teachers = await TeacherStore.all();
  res.json(teachers.map(TeacherStore.sanitize));
});

router.get('/:id', requireAuth('admin'), async (req, res) => {
  const teacher = await TeacherStore.find(req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  res.json({
    ...TeacherStore.sanitize(teacher),
    assignments: await AssignmentStore.forTeacher(teacher.id),
  });
});

router.post('/', requireAuth('admin'), async (req, res) => {
  const phone = normalizeCameroonPhone(req.body.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Enter a valid Cameroon phone number, e.g. +237670111222' });
  }
  if (await TeacherStore.findByPhone(phone)) {
    return res.status(409).json({ error: 'A teacher with this phone number already exists' });
  }
  const { passcode, accessCode: _ignored, ...rest } = req.body;
  const { teacher, accessCode } = await TeacherStore.create({ ...rest, phone });
  res.status(201).json({ ...TeacherStore.sanitize(teacher), accessCode });
});

router.put('/:id', requireAuth('admin'), async (req, res) => {
  // eslint-disable-next-line no-unused-vars
  const { passcode, accessCode, ...data } = req.body;
  if (data.phone !== undefined) {
    const phone = normalizeCameroonPhone(data.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Enter a valid Cameroon phone number, e.g. +237670111222' });
    }
    const existing = await TeacherStore.findByPhone(phone);
    if (existing && existing.id !== req.params.id) {
      return res.status(409).json({ error: 'A teacher with this phone number already exists' });
    }
    data.phone = phone;
  }
  const teacher = await TeacherStore.update(req.params.id, data);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  res.json(TeacherStore.sanitize(teacher));
});

router.delete('/:id', requireAuth('admin'), async (req, res) => {
  const removed = await TeacherStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Teacher not found' });
  res.status(204).end();
});

router.post('/:id/regenerate-code', requireAuth('admin'), async (req, res) => {
  const result = await TeacherStore.regenerateAccessCode(req.params.id);
  if (!result) return res.status(404).json({ error: 'Teacher not found' });
  res.json({ accessCode: result.accessCode });
});

router.post('/:id/photo', requireAuth('admin'), photoUpload.single('photo'), async (req, res) => {
  const teacher = await TeacherStore.find(req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

  const photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  await TeacherStore.update(req.params.id, { photoUrl });
  res.status(201).json({ photoUrl });
});

router.post('/:id/assignments', requireAuth('admin'), async (req, res) => {
  const teacher = await TeacherStore.find(req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  const assignment = await AssignmentStore.create({ ...req.body, teacherId: teacher.id });
  res.status(201).json(assignment);
});

router.delete('/assignments/:assignmentId', requireAuth('admin'), async (req, res) => {
  const removed = await AssignmentStore.remove(req.params.assignmentId);
  if (!removed) return res.status(404).json({ error: 'Assignment not found' });
  res.status(204).end();
});

// ---- Teacher: self-service ----
router.get('/me/profile', requireAuth('teacher'), async (req, res) => {
  const teacher = await TeacherStore.find(req.user.sub);
  res.json(TeacherStore.sanitize(teacher));
});

router.get('/me/assignments', requireAuth('teacher'), async (req, res) => {
  res.json(await AssignmentStore.forTeacher(req.user.sub));
});

router.get('/me/classes/:className/:section/students', requireAuth('teacher'), async (req, res) => {
  const { className, section } = req.params;
  const assignments = await AssignmentStore.forTeacher(req.user.sub);
  const owns = assignments.some((a) => a.className === className && a.section === section);
  if (!owns) return res.status(403).json({ error: 'You are not assigned to this class' });

  const students = await StudentStore.all();
  res.json(students.filter((s) => s.className === className && s.section === section));
});

export default router;
