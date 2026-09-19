import { Router } from 'express';
import { FeeStore, StudentStore, feeTotals } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';
import { toCsv, sendCsv } from '../utils/csv.js';

const router = Router();

function serialize(fee) {
  const { amountPaid, balance } = feeTotals(fee);
  return { ...fee, amountPaid, balance, isFullyPaid: balance <= 0 };
}

router.get('/', requireAuth('admin'), async (req, res) => {
  res.json((await FeeStore.all()).map(serialize));
});

router.get('/export', requireAuth('admin'), async (req, res) => {
  const students = await StudentStore.all();
  const byId = new Map(students.map((s) => [s.id, s]));
  const rows = (await FeeStore.all()).map((f) => {
    const s = byId.get(f.studentId) || {};
    const { amountPaid, balance } = feeTotals(f);
    return [
      s.fullName, s.admissionNumber, s.className, s.section, s.branch,
      f.academicYear, f.term, f.amountDue, amountPaid, balance, balance <= 0 ? 'Paid' : 'Owing',
    ];
  });
  sendCsv(
    res,
    'fees.csv',
    toCsv(
      ['Student', 'Admission No', 'Class', 'Section', 'Branch', 'Academic Year', 'Term',
        'Amount Due (FCFA)', 'Amount Paid (FCFA)', 'Balance (FCFA)', 'Status'],
      rows
    )
  );
});

router.get('/student/:studentId', requireAuth('admin'), async (req, res) => {
  res.json((await FeeStore.forStudent(req.params.studentId)).map(serialize));
});

router.post('/', requireAuth('admin'), async (req, res) => {
  const fee = await FeeStore.create(req.body);
  res.status(201).json(serialize(fee));
});

router.put('/:id', requireAuth('admin'), async (req, res) => {
  const fee = await FeeStore.find(req.params.id);
  if (!fee) return res.status(404).json({ error: 'Fee record not found' });

  const { academicYear, term, amountDue, dueDate } = req.body;
  const changes = {};
  if (academicYear !== undefined) changes.academicYear = academicYear;
  if (term !== undefined) changes.term = term;
  if (dueDate !== undefined) changes.dueDate = dueDate;
  if (amountDue !== undefined) {
    const { amountPaid } = feeTotals(fee);
    if (typeof amountDue !== 'number' || amountDue <= 0) {
      return res.status(400).json({ error: 'Amount due must be a positive number' });
    }
    if (amountDue < amountPaid) {
      return res.status(400).json({ error: `Amount due cannot be less than the ${amountPaid} already paid` });
    }
    changes.amountDue = amountDue;
  }
  res.json(serialize(await FeeStore.update(req.params.id, changes)));
});

router.put('/:id/payments/:paymentId', requireAuth('admin'), async (req, res) => {
  const fee = await FeeStore.find(req.params.id);
  const payment = fee?.payments.find((p) => p.id === req.params.paymentId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const { amount, method } = req.body;
  const changes = {};
  if (method !== undefined) changes.method = method;
  if (amount !== undefined) {
    const othersPaid = feeTotals(fee).amountPaid - payment.amount;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (othersPaid + amount > fee.amountDue) {
      return res.status(400).json({ error: `Amount can be at most ${fee.amountDue - othersPaid}` });
    }
    changes.amount = amount;
  }
  res.json(serialize(await FeeStore.updatePayment(req.params.id, req.params.paymentId, changes)));
});

router.delete('/:id/payments/:paymentId', requireAuth('admin'), async (req, res) => {
  const fee = await FeeStore.find(req.params.id);
  if (!fee || !fee.payments.some((p) => p.id === req.params.paymentId)) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json(serialize(await FeeStore.removePayment(req.params.id, req.params.paymentId)));
});

router.delete('/:id', requireAuth('admin'), async (req, res) => {
  const removed = await FeeStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Fee record not found' });
  res.status(204).end();
});

router.post('/:id/payments', requireAuth('admin'), async (req, res) => {
  const { amount, method } = req.body;
  const fee = await FeeStore.find(req.params.id);
  if (!fee) return res.status(404).json({ error: 'Fee record not found' });

  const { balance } = feeTotals(fee);
  if (amount <= 0 || amount > balance) {
    return res.status(400).json({ error: `Amount must be between 0 and ${balance}` });
  }

  const receiptNumber = `RCT-${Date.now().toString(36).toUpperCase()}`;
  const updated = await FeeStore.addPayment(req.params.id, {
    amount,
    method,
    date: new Date().toISOString(),
    receiptNumber,
  });
  res.status(201).json(serialize(updated));
});

export default router;
