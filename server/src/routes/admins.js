import { Router } from 'express';
import { AdminStore } from '../data/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const MIN_PASSWORD = 8;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

router.get('/', requireAuth('admin'), async (req, res) => {
  const admins = await AdminStore.all();
  res.json(admins.map(AdminStore.sanitize));
});

router.post('/', requireAuth('admin'), async (req, res) => {
  const { username = '', fullName = '', password = '' } = req.body;
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, dots, dashes or underscores' });
  }
  if (!fullName.trim()) return res.status(400).json({ error: 'Full name is required' });
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
  }
  if (await AdminStore.findByUsername(username)) {
    return res.status(409).json({ error: 'That username is already taken' });
  }
  const admin = await AdminStore.create({ username, fullName: fullName.trim(), password });
  res.status(201).json(AdminStore.sanitize(admin));
});

router.post('/me/password', requireAuth('admin'), async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body;
  const admin = await AdminStore.find(req.user.sub);
  if (!admin || !AdminStore.verifyPassword(admin, currentPassword)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD} characters` });
  }
  await AdminStore.updatePassword(admin.id, newPassword);
  res.json({ ok: true });
});

router.put('/:id', requireAuth('admin'), async (req, res) => {
  const { username, fullName } = req.body;
  const changes = {};
  if (username !== undefined) {
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, dots, dashes or underscores' });
    }
    const taken = await AdminStore.findByUsername(username);
    if (taken && taken.id !== req.params.id) return res.status(409).json({ error: 'That username is already taken' });
    changes.username = username;
  }
  if (fullName !== undefined) {
    if (!String(fullName).trim()) return res.status(400).json({ error: 'Full name is required' });
    changes.fullName = String(fullName).trim();
  }
  const admin = await AdminStore.update(req.params.id, changes);
  if (!admin) return res.status(404).json({ error: 'Administrator not found' });
  res.json(AdminStore.sanitize(admin));
});

// Passwords are stored hashed and can't be read back, so an admin who is
// locked out gets a new one set by another administrator instead.
router.post('/:id/password', requireAuth('admin'), async (req, res) => {
  const { newPassword = '' } = req.body;
  if (newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD} characters` });
  }
  if (!(await AdminStore.find(req.params.id))) return res.status(404).json({ error: 'Administrator not found' });
  await AdminStore.updatePassword(req.params.id, newPassword);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth('admin'), async (req, res) => {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  if ((await AdminStore.count()) <= 1) {
    return res.status(400).json({ error: 'At least one administrator must remain' });
  }
  const removed = await AdminStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Administrator not found' });
  res.status(204).end();
});

export default router;
