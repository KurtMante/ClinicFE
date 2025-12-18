import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResetPassword.css';

// Token removed: direct (unsafe for production) password reset by email only.
const ResetPassword = ({ onBack }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('email') || '';
    setEmail(e);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', text: '' });

    if (!email.trim()) {
      setStatus({ type: 'error', text: 'Missing email in link.' });
      return;
    }
    if (!pw1 || pw1.length < 6) {
      setStatus({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (pw1 !== pw2) {
      setStatus({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/patients/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword: pw1 })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: 'success', text: 'Password reset successful. You may log in.' });
        setPw1('');
        setPw2('');
      } else {
        setStatus({ type: 'error', text: data.error || 'Reset failed.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  // Handler to redirect to landing page
  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="rp-wrapper">
      <div className="rp-card" role="dialog" aria-labelledby="rp-title">
        <h2 id="rp-title" className="rp-title">Reset Password</h2>
        <p className="rp-sub">Enter your email and new password.</p>

        {status.text && (
          <div
            className={`rp-alert ${status.type === 'error' ? 'rp-alert-error' : 'rp-alert-success'}`}
            role="alert"
          >
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label className="rp-label" htmlFor="email">Email</label>
          <div className="rp-input-wrap">
            <input
              id="email"
              type="email"
              className="rp-input"
              value={email}
              readOnly
              placeholder="you@example.com"
              disabled={loading}
              required
              autoComplete="email"
            />
          </div>

          <label className="rp-label" htmlFor="password">New Password</label>
          <div className="rp-input-wrap">
            <input
              id="password"
              type="password"
              className="rp-input"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="New password"
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>

          <label className="rp-label" htmlFor="confirm">Confirm Password</label>
          <div className="rp-input-wrap">
            <input
              id="confirm"
              type="password"
              className="rp-input"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm password"
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="rp-actions">
            <button
              type="submit"
              className="rp-btn rp-btn-primary"
              disabled={loading || !email}
            >
              {loading ? 'Sending…' : 'Change Password'}
            </button>
            <button
              type="button"
              className="rp-btn rp-btn-secondary"
              onClick={handleBack}
              disabled={loading}
            >
              Back to Login
            </button>
          </div>
        </form>

        <button
          type="button"
          className="rp-btn-link"
          onClick={handleBack}
          disabled={loading}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;