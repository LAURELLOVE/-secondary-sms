import { Router } from 'express';
import { FeeStore, feeTotals } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function serialize(fee) {
  const { amountPaid, balance } = feeTotals(fee);
  return { ...fee, amountPaid, balance, isFullyPaid: balance <= 0 };
}

router.get('/', requireAuth('admin'), async (req, res) => {
  res.json((await FeeStore.all()).map(serialize));
});

router.get('/student/:studentId', requireAuth('admin'), async (req, res) => {
  res.json((await FeeStore.forStudent(req.params.studentId)).map(serialize));
});

router.post('/', requireAuth('admin'), async (req, res) => {
  const fee = await FeeStore.create(req.body);
  res.status(201).json(serialize(fee));
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
