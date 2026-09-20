import { Router } from 'express';
import { AdminStore, TeacherStore, OtpStore } from '../data/store.js';
import { signToken } from '../middleware/auth.js';
import { sendSms, isSmsLive, otpLoginEnabled } from '../services/sms/index.js';
import { PhoneGateway } from '../services/sms/phoneGateway.js';
import { normalizeCameroonPhone } from '../utils/phone.js';
import { lockedForMinutes, recordFailure, clearFailures } from '../utils/loginLimiter.js';

const router = Router();

const tooMany = (res, minutes) =>
  res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` });

// Lets the sign-in pages know whether the SMS verification step is switched on.
router.get('/config', async (req, res) => res.json({ otpLogin: otpLoginEnabled || (await PhoneGateway.isEnabled()) }));

router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const key = `admin:${String(username).toLowerCase()}`;
  const locked = lockedForMinutes(key);
  if (locked) return tooMany(res, locked);

  const admin = await AdminStore.findByUsername(username);
  if (!admin || !AdminStore.verifyPassword(admin, password)) {
    recordFailure(key);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  clearFailures(key);
  const token = signToken({ sub: admin.id, role: 'admin', name: admin.fullName });
  res.json({ token, user: AdminStore.sanitize(admin), role: 'admin' });
});

router.post('/teacher/login', async (req, res) => {
  const phone = normalizeCameroonPhone(req.body.phone);
  const { accessCode } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Enter a valid Cameroon phone number, e.g. +237670111222' });
  }
  const key = `teacher:${phone}`;
  const locked = lockedForMinutes(key);
  if (locked) return tooMany(res, locked);

  const teacher = await TeacherStore.findByPhone(phone);
  if (!teacher || !TeacherStore.verifyAccessCode(teacher, accessCode)) {
    recordFailure(key);
    return res.status(401).json({ error: 'Invalid phone number or access code' });
  }
  if (teacher.status !== 'active') {
    return res.status(403).json({ error: 'This teacher account is inactive' });
  }
  clearFailures(key);

  // "Phone SMS" (the administrator's own phone sends the texts) switches the code step on too.
  const phoneSms = await PhoneGateway.isEnabled();

  // SMS verification is off: phone + access code is enough.
  if (!otpLoginEnabled && !phoneSms) {
    const token = signToken({ sub: teacher.id, role: 'teacher', name: teacher.fullName });
    return res.json({ token, user: TeacherStore.sanitize(teacher), role: 'teacher' });
  }

  // Don't hand out a code nobody can deliver: the sending phone must be switched on and online.
  if (phoneSms && !(await PhoneGateway.isOnline())) {
    return res.status(503).json({ error: 'SMS sending is offline right now. Please ask your administrator.' });
  }

  const { id: otpRequestId, code } = OtpStore.create(teacher.id);
  const message = `Your Secondary SMS login code is ${code}. It expires in 5 minutes.`;

  try {
    if (phoneSms) await PhoneGateway.queue(teacher.phone, message);
    else await sendSms(teacher.phone, message);
  } catch (err) {
    return res.status(502).json({ error: `Failed to send SMS: ${err.message}` });
  }

  res.json({
    otpRequestId,
    message: 'A verification code has been sent to your phone.',
    // Only present when no real SMS provider is configured, so the flow is still usable/demoable.
    // (Never with phone SMS: the code must only ever arrive by text.)
    devOtp: phoneSms || isSmsLive ? undefined : code,
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
