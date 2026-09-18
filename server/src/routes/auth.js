import { Router } from 'express';
import { AdminStore, TeacherStore, OtpStore } from '../data/store.js';
import { signToken } from '../middleware/auth.js';
import { sendSms, isSmsLive } from '../services/sms/index.js';
import { normalizeCameroonPhone } from '../utils/phone.js';

const router = Router();

router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await AdminStore.findByUsername(username);
  if (!admin || !AdminStore.verifyPassword(admin, password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = signToken({ sub: admin.id, role: 'admin', name: admin.fullName });
  res.json({ token, user: AdminStore.sanitize(admin), role: 'admin' });
});

router.post('/teacher/login', async (req, res) => {
  const phone = normalizeCameroonPhone(req.body.phone);
  const { accessCode } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Enter a valid Cameroon phone number, e.g. +237670111222' });
  }
  const teacher = await TeacherStore.findByPhone(phone);
  if (!teacher || !TeacherStore.verifyAccessCode(teacher, accessCode)) {
    return res.status(401).json({ error: 'Invalid phone number or access code' });
  }
  if (teacher.status !== 'active') {
    return res.status(403).json({ error: 'This teacher account is inactive' });
  }

  const { id: otpRequestId, code } = OtpStore.create(teacher.id);
  const message = `Your Secondary SMS login code is ${code}. It expires in 5 minutes.`;

  try {
    await sendSms(teacher.phone, message);
  } catch (err) {
    return res.status(502).json({ error: `Failed to send SMS: ${err.message}` });
  }

  res.json({
    otpRequestId,
    message: 'A verification code has been sent to your phone.',
    // Only present when no real SMS provider is configured, so the flow is still usable/demoable.
    devOtp: isSmsLive ? undefined : code,
  });
});

router.post('/teacher/verify-otp', async (req, res) => {
  const { otpRequestId, code } = req.body;
  const result = OtpStore.verify(otpRequestId, code);
  if (!result.ok) return res.status(400).json({ error: result.reason });

  const teacher = await TeacherStore.find(result.teacherId);
  const token = signToken({ sub: teacher.id, role: 'teacher', name: teacher.fullName });
  res.json({ token, user: TeacherStore.sanitize(teacher), role: 'teacher' });
});

export default router;
