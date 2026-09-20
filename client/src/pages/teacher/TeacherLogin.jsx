import { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { AuthApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { normalizeCameroonPhone } from '../../phone';
import { APP_MODE } from '../../appMode';

export default function TeacherLogin() {
  const [step, setStep] = useState('credentials'); // credentials | otp
  const [phone, setPhone] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [code, setCode] = useState('');
  const [otpRequestId, setOtpRequestId] = useState(null);
  const [info, setInfo] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState('');
  const [otpLogin, setOtpLogin] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    AuthApi.config().then((c) => setOtpLogin(c.otpLogin)).catch(() => setOtpLogin(false));
  }, []);

  if (APP_MODE === 'admin') return <Navigate to="/login" replace />;

  async function requestOtp(e) {
    e.preventDefault();
    setError('');
    const normalized = normalizeCameroonPhone(phone);
    if (!normalized) {
      setError('Enter a valid Cameroon mobile number, e.g. +237 6XX XXX XXX');
      return;
    }
    try {
      const res = await AuthApi.teacherLogin(normalized, accessCode);
      // No SMS step configured: the server signs the teacher straight in.
      if (res.token) {
        login(res.token, res.role, res.user);
        navigate('/teacher', { replace: true });
        return;
      }
      setOtpRequestId(res.otpRequestId);
      setInfo(res.message);
      setDevOtp(res.devOtp || null);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError('');
    try {
      const { token, user, role } = await AuthApi.verifyOtp(otpRequestId, code);
      login(token, role, user);
      navigate('/teacher', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={step === 'credentials' ? requestOtp : verify}>
        <h1>Secondary School Management System</h1>
        <h2>Teacher sign in</h2>
        {error && <p className="error-text">{error}</p>}

        {step === 'credentials' ? (
          <>
            <label>
              Cameroon phone number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                inputMode="tel"
                required
                autoFocus
              />
            </label>
            <label>
              Access code
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7M2PQ"
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                required
              />
            </label>
            <p className="hint">Given to you by your school administrator.</p>
            <button type="submit" className="btn-primary full-width">
              {otpLogin ? 'Send verification code' : 'Sign in'}
            </button>
          </>
        ) : (
          <>
            <p className="hint">{info}</p>
            {devOtp && (
              <p className="hint">No SMS provider configured yet — dev code: <strong>{devOtp}</strong></p>
            )}
            <label>
              Verification code
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required autoFocus />
            </label>
            <button type="submit" className="btn-primary full-width">Verify &amp; sign in</button>
            <button type="button" className="btn-secondary full-width" onClick={() => setStep('credentials')}>
              Back
            </button>
          </>
        )}

        {APP_MODE === 'web' && (
          <p className="auth-switch">
            Are you an administrator? <Link to="/login">Sign in here</Link>
          </p>
        )}
      </form>
    </div>
  );
}
