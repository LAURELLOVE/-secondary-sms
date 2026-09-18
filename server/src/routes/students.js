import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { StudentStore } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const IMPORT_COLUMNS = [
  'fullName', 'admissionNumber', 'dateOfBirth', 'gender', 'className', 'section',
  'guardianName', 'guardianPhone', 'address', 'admissionDate',
];

router.get('/', requireAuth('admin'), async (req, res) => {
  res.json(await StudentStore.all());
});

router.get('/export', requireAuth('admin'), async (req, res) => {
  const header = IMPORT_COLUMNS.join(',');
  const students = await StudentStore.all();
  const rows = students.map((s) =>
    IMPORT_COLUMNS.map((col) => `"${String(s[col] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.send(csv);
});

router.post('/import', requireAuth('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  let records;
  try {
    records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    return res.status(400).json({ error: `Could not parse CSV: ${err.message}` });
  }

  let importedCount = 0;
  const errors = [];
  for (let index = 0; index < records.length; index += 1) {
    const row = records[index];
    if (!row.fullName || !row.admissionNumber || !row.className) {
      errors.push({ row: index + 2, error: 'Missing fullName, admissionNumber, or className' });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await StudentStore.create({
      fullName: row.fullName,
      admissionNumber: row.admissionNumber,
      dateOfBirth: row.dateOfBirth || '',
      gender: row.gender || 'Male',
      className: row.className,
      section: row.section || '',
      guardianName: row.guardianName || '',
      guardianPhone: row.guardianPhone || '',
      address: row.address || '',
      admissionDate: row.admissionDate || new Date().toISOString().slice(0, 10),
    });
    importedCount += 1;
  }

  res.status(201).json({ importedCount, errors });
});

router.get('/:id', requireAuth('admin'), async (req, res) => {
  const student = await StudentStore.find(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

router.post('/', requireAuth('admin'), async (req, res) => {
  const student = await StudentStore.create(req.body);
  res.status(201).json(student);
});

router.put('/:id', requireAuth('admin'), async (req, res) => {
  const student = await StudentStore.update(req.params.id, req.body);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

router.delete('/:id', requireAuth('admin'), async (req, res) => {
  const removed = await StudentStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Student not found' });
  res.status(204).end();
});

export default router;
