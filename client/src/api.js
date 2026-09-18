// In local dev, relative paths work via Vite's dev proxy (see vite.config.js).
// In production the frontend and backend are separate Render services, so
// VITE_API_URL (set at build time) points straight at the deployed backend.
const API_ORIGIN = import.meta.env.VITE_API_URL || '';
export const SERVER_ORIGIN = API_ORIGIN;
const BASE_URL = `${API_ORIGIN}/api`;

function authHeader() {
  const token = localStorage.getItem('sms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const hadToken = Boolean(localStorage.getItem('sms_token'));
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    ...options,
  });
  // Only treat a 401 as "session expired" when a token was actually sent -
  // a login attempt with no token yet returning 401 just means wrong
  // credentials, not an expired session.
  if (res.status === 401 && hadToken) {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_role');
    localStorage.removeItem('sms_user');
    window.location.href = '/login';
    throw new Error('Session expired, please log in again');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const AuthApi = {
  adminLogin: (username, password) =>
    request('/auth/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  teacherLogin: (phone, accessCode) =>
    request('/auth/teacher/login', { method: 'POST', body: JSON.stringify({ phone, accessCode }) }),
  verifyOtp: (otpRequestId, code) =>
    request('/auth/teacher/verify-otp', { method: 'POST', body: JSON.stringify({ otpRequestId, code }) }),
};

export const StudentsApi = {
  list: () => request('/students'),
  get: (id) => request(`/students/${id}`),
  create: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/students/${id}`, { method: 'DELETE' }),
  exportUrl: () => `${BASE_URL}/students/export`,
  import: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/students/import`, {
      method: 'POST',
      headers: authHeader(),
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Import failed: ${res.status}`);
    }
    return res.json();
  },
};

export const GradesApi = {
  reportCard: (studentId, term, academicYear) =>
    request(`/grades/student/${studentId}?term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}`),
  create: (data) => request('/grades', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/grades/${id}`, { method: 'DELETE' }),
};

export const FeesApi = {
  all: () => request('/fees'),
  forStudent: (studentId) => request(`/fees/student/${studentId}`),
  create: (data) => request('/fees', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id) => request(`/fees/${id}`, { method: 'DELETE' }),
  addPayment: (feeId, data) => request(`/fees/${feeId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
};

export const TeachersApi = {
  list: () => request('/teachers'),
  get: (id) => request(`/teachers/${id}`),
  create: (data) => request('/teachers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/teachers/${id}`, { method: 'DELETE' }),
  regenerateCode: (id) => request(`/teachers/${id}/regenerate-code`, { method: 'POST' }),
  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${BASE_URL}/teachers/${id}/photo`, {
      method: 'POST',
      headers: authHeader(),
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Photo upload failed: ${res.status}`);
    }
    return res.json();
  },
  addAssignment: (teacherId, data) =>
    request(`/teachers/${teacherId}/assignments`, { method: 'POST', body: JSON.stringify(data) }),
  removeAssignment: (assignmentId) =>
    request(`/teachers/assignments/${assignmentId}`, { method: 'DELETE' }),
  myProfile: () => request('/teachers/me/profile'),
  myAssignments: () => request('/teachers/me/assignments'),
  myClassStudents: (className, section) =>
    request(`/teachers/me/classes/${encodeURIComponent(className)}/${encodeURIComponent(section)}/students`),
};

export const ACADEMIC_YEARS = ['2025/2026', '2026/2027'];
export const TERMS = ['Term 1', 'Term 2', 'Term 3'];
export const CA_MAX = 30;
export const EXAM_MAX = 70;
