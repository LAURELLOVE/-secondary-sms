import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb } from './db.js';
import { generateAccessCode } from '../utils/accessCode.js';

const NO_ID = { projection: { _id: 0 } };

function col(name) {
  return getDb().collection(name);
}

export async function seedIfEmpty() {
  const students = col('students');
  if ((await students.countDocuments()) > 0) return;

  const s1 = {
    id: randomUUID(),
    fullName: 'Amara Okafor',
    admissionNumber: 'SSM-2026-001',
    dateOfBirth: '2011-04-12',
    gender: 'Female',
    className: 'Form 3',
    section: 'A',
    branch: '',
    guardianName: 'Chidi Okafor',
    guardianPhone: '+234 801 234 5678',
    address: '12 Ridge Way, Buea',
    admissionDate: '2023-09-01',
    status: 'active',
  };
  const s2 = {
    id: randomUUID(),
    fullName: 'Tabe Njie',
    admissionNumber: 'SSM-2026-002',
    dateOfBirth: '2010-11-03',
    gender: 'Male',
    className: 'Upper Sixth',
    section: 'A',
    branch: 'Science',
    guardianName: 'Mary Njie',
    guardianPhone: '+237 670 111 222',
    address: '45 Molyko Street, Buea',
    admissionDate: '2022-09-01',
    status: 'active',
  };
  await students.insertMany([s1, s2]);

  await col('admins').insertOne({
    id: randomUUID(),
    username: 'admin',
    fullName: 'School Administrator',
    passwordHash: bcrypt.hashSync('admin123', 10),
  });

  const t1 = {
    id: randomUUID(),
    fullName: 'Grace Fon',
    phone: '+237670111222',
    accessCodeHash: bcrypt.hashSync('DEMO01', 10),
    gender: 'Female',
    dateOfBirth: '1988-06-15',
    address: 'Molyko, Buea',
    qualification: 'B.Ed Mathematics',
    subjectSpecialization: 'Mathematics',
    employeeId: 'TCH-2026-001',
    dateOfHire: '2019-09-01',
    nationalIdNumber: 'CM-119384756',
    status: 'active',
  };
  await col('teachers').insertOne(t1);

  await col('assignments').insertOne({
    id: randomUUID(),
    teacherId: t1.id,
    className: s1.className,
    section: s1.section,
    branch: s1.branch,
    subject: 'Mathematics',
    academicYear: '2025/2026',
  });
}

// ---- Students ----
export const StudentStore = {
  all: () => col('students').find({}, NO_ID).toArray(),
  find: (id) => col('students').findOne({ id }, NO_ID),
  create: async (data) => {
    const student = { id: randomUUID(), status: 'active', ...data };
    await col('students').insertOne(student);
    delete student._id;
    return student;
  },
  update: async (id, data) => {
    const result = await col('students').findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    return result;
  },
  remove: async (id) => {
    const { deletedCount } = await col('students').deleteOne({ id });
    if (!deletedCount) return false;
    const grades = await col('grades').find({ studentId: id }, NO_ID).toArray();
    await Promise.all(grades.map((g) => GradeStore.remove(g.id)));
    const fees = await col('fees').find({ studentId: id }, NO_ID).toArray();
    await Promise.all(fees.map((f) => FeeStore.remove(f.id)));
    await AttendanceStore.removeForStudent(id);
    return true;
  },
};

// ---- Grades ----
export const GradeStore = {
  forStudent: (studentId, { term, academicYear } = {}) => {
    const query = { studentId };
    if (term) query.term = term;
    if (academicYear) query.academicYear = academicYear;
    return col('grades').find(query, NO_ID).toArray();
  },
  create: async (data) => {
    const grade = { id: randomUUID(), ...data };
    await col('grades').insertOne(grade);
    delete grade._id;
    return grade;
  },
  update: (id, data) =>
    col('grades').findOneAndUpdate({ id }, { $set: data }, { returnDocument: 'after', projection: { _id: 0 } }),
  remove: async (id) => {
    const { deletedCount } = await col('grades').deleteOne({ id });
    return deletedCount > 0;
  },
};

// ---- Fees ----
export const FeeStore = {
  forStudent: (studentId) => col('fees').find({ studentId }, NO_ID).toArray(),
  all: () => col('fees').find({}, NO_ID).toArray(),
  find: (id) => col('fees').findOne({ id }, NO_ID),
  create: async (data) => {
    const fee = { id: randomUUID(), payments: [], ...data };
    await col('fees').insertOne(fee);
    delete fee._id;
    return fee;
  },
  update: (id, data) =>
    col('fees').findOneAndUpdate({ id }, { $set: data }, { returnDocument: 'after', projection: { _id: 0 } }),
  remove: async (id) => {
    const { deletedCount } = await col('fees').deleteOne({ id });
    return deletedCount > 0;
  },
  removePayment: (feeId, paymentId) =>
    col('fees').findOneAndUpdate(
      { id: feeId },
      { $pull: { payments: { id: paymentId } } },
      { returnDocument: 'after', projection: { _id: 0 } }
    ),
  updatePayment: (feeId, paymentId, data) => {
    const set = {};
    Object.entries(data).forEach(([key, value]) => { set[`payments.$[p].${key}`] = value; });
    return col('fees').findOneAndUpdate(
      { id: feeId },
      { $set: set },
      { arrayFilters: [{ 'p.id': paymentId }], returnDocument: 'after', projection: { _id: 0 } }
    );
  },
  addPayment: async (feeId, payment) => {
    const record = { id: randomUUID(), ...payment };
    return col('fees').findOneAndUpdate(
      { id: feeId },
      { $push: { payments: record } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  },
};

export function gradeTotal(record) {
  return (record.caScore || 0) + (record.examScore || 0);
}

export function letterGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

export function feeTotals(fee) {
  const amountPaid = fee.payments.reduce((sum, p) => sum + p.amount, 0);
  return { amountPaid, balance: fee.amountDue - amountPaid };
}

// ---- Teachers (KYC) ----
export const TeacherStore = {
  all: () => col('teachers').find({}, NO_ID).toArray(),
  find: (id) => col('teachers').findOne({ id }, NO_ID),
  findByPhone: (phone) => col('teachers').findOne({ phone }, NO_ID),
  create: async (data) => {
    const accessCode = generateAccessCode();
    const teacher = {
      id: randomUUID(),
      status: 'active',
      ...data,
      accessCode,
      accessCodeHash: bcrypt.hashSync(accessCode, 10),
    };
    await col('teachers').insertOne(teacher);
    delete teacher._id;
    return { teacher, accessCode };
  },
  update: (id, data) =>
    col('teachers').findOneAndUpdate({ id }, { $set: data }, { returnDocument: 'after', projection: { _id: 0 } }),
  regenerateAccessCode: async (id) => {
    const accessCode = generateAccessCode();
    const teacher = await col('teachers').findOneAndUpdate(
      { id },
      { $set: { accessCode, accessCodeHash: bcrypt.hashSync(accessCode, 10) } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!teacher) return null;
    return { teacher, accessCode };
  },
  remove: async (id) => {
    const { deletedCount } = await col('teachers').deleteOne({ id });
    if (!deletedCount) return false;
    await col('assignments').deleteMany({ teacherId: id });
    return true;
  },
  verifyAccessCode: (teacher, accessCode) =>
    bcrypt.compareSync(String(accessCode || '').toUpperCase(), teacher.accessCodeHash),
  sanitize: (teacher) => {
    const { accessCodeHash, ...rest } = teacher;
    return rest;
  },
};

// ---- Teacher class/subject assignments ----
export const AssignmentStore = {
  forTeacher: (teacherId) => col('assignments').find({ teacherId }, NO_ID).toArray(),
  create: async (data) => {
    const assignment = { id: randomUUID(), ...data };
    await col('assignments').insertOne(assignment);
    delete assignment._id;
    return assignment;
  },
  update: (id, data) =>
    col('assignments').findOneAndUpdate({ id }, { $set: data }, { returnDocument: 'after', projection: { _id: 0 } }),
  remove: async (id) => {
    const { deletedCount } = await col('assignments').deleteOne({ id });
    return deletedCount > 0;
  },
};

// ---- Admins ----
export const AdminStore = {
  all: () => col('admins').find({}, NO_ID).toArray(),
  count: () => col('admins').countDocuments(),
  find: (id) => col('admins').findOne({ id }, NO_ID),
  findByUsername: (username) => col('admins').findOne({ username }, NO_ID),
  create: async ({ username, fullName, password }) => {
    const admin = { id: randomUUID(), username, fullName, passwordHash: bcrypt.hashSync(password, 10) };
    await col('admins').insertOne(admin);
    delete admin._id;
    return admin;
  },
  update: (id, data) =>
    col('admins').findOneAndUpdate({ id }, { $set: data }, { returnDocument: 'after', projection: { _id: 0 } }),
  updatePassword: (id, password) =>
    col('admins').updateOne({ id }, { $set: { passwordHash: bcrypt.hashSync(password, 10) } }),
  remove: async (id) => {
    const { deletedCount } = await col('admins').deleteOne({ id });
    return deletedCount > 0;
  },
  verifyPassword: (admin, password) => bcrypt.compareSync(password, admin.passwordHash),
  sanitize: (admin) => {
    const { passwordHash, ...rest } = admin;
    return rest;
  },
};

// ---- Attendance: one document per class + section + date ----
export const AttendanceStore = {
  forClassDate: (className, section, date) => col('attendance').findOne({ className, section, date }, NO_ID),
  upsert: async ({ className, section, date, records, markedBy }) => {
    await col('attendance').updateOne(
      { className, section, date },
      {
        $set: { records, markedBy, updatedAt: new Date().toISOString() },
        $setOnInsert: { id: randomUUID() },
      },
      { upsert: true }
    );
    return col('attendance').findOne({ className, section, date }, NO_ID);
  },
  list: ({ className, section, from, to } = {}) => {
    const query = {};
    if (className) query.className = className;
    if (section !== undefined && section !== '') query.section = section;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }
    return col('attendance').find(query, NO_ID).toArray();
  },
  remove: async (className, section, date) => {
    const { deletedCount } = await col('attendance').deleteOne({ className, section, date });
    return deletedCount > 0;
  },
  removeForStudent: (studentId) =>
    col('attendance').updateMany({}, { $pull: { records: { studentId } } }),
};

// ---- OTP (in-memory, 5 minute expiry - short-lived, fine to lose on restart) ----
const otpRequests = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

export const OtpStore = {
  create: (teacherId) => {
    const id = randomUUID();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    otpRequests.set(id, { teacherId, code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    return { id, code };
  },
  verify: (id, code) => {
    const entry = otpRequests.get(id);
    if (!entry) return { ok: false, reason: 'Request not found or already used' };
    if (Date.now() > entry.expiresAt) {
      otpRequests.delete(id);
      return { ok: false, reason: 'Code expired, please log in again' };
    }
    entry.attempts += 1;
    if (entry.attempts > 5) {
      otpRequests.delete(id);
      return { ok: false, reason: 'Too many attempts, please log in again' };
    }
    if (entry.code !== code) {
      return { ok: false, reason: 'Incorrect code' };
    }
    otpRequests.delete(id);
    return { ok: true, teacherId: entry.teacherId };
  },
};
