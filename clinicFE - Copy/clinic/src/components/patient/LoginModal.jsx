import React, { useState } from 'react';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose, onNavigate, onOpenStaffLogin, onOpenAdminLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  // NEW: forgot password states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ type: '', text: '' });
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username/Email is required';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/api/patients/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Login successful!');
        const patientData = {
          ...data.patient,
          patientId: data.patient.patientId || data.patient.id
        };
        localStorage.setItem('patient', JSON.stringify(patientData));
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        // Force a full reload to ensure patient data is loaded before rendering dashboard
        setTimeout(() => {
          window.location.href = '/dashboard'; // or your dashboard route
        }, 1000);
      } else {
        setMessage(data.error || 'Login failed');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    onClose();
    onNavigate('register');
  };

  const handleForgotPassword = () => {
    // Switch view to forgot password panel
    setShowForgot(true);
    setForgotEmail(formData.username || '');
    setForgotStatus({ type: '', text: '' });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotStatus({ type: '', text: '' });

    const email = forgotEmail.trim();
    if (!email) {
      setForgotStatus({ type: 'error', text: 'Email is required.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setForgotStatus({ type: 'error', text: 'Enter a valid email.' });
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/patients/send-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      // We do not rely on response body shape; generic message always
      if (res.ok) {
        setForgotStatus({
          type: 'success',
          text: 'If the email exists, a reset link was sent.'
        });
      } else {
        // Even on error, keep generic (avoid email enumeration)
        setForgotStatus({
          type: 'error',
          text: 'Request failed. Try again.'
        });
      }
    } catch {
      setForgotStatus({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgot(false);
    setForgotStatus({ type: '', text: '' });
  };

  const handleStaffLogin = () => {
    onClose();
    onOpenStaffLogin();
  };

  const handleAdminLogin = () => {
    onClose();
    onOpenAdminLogin();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* New: Two-column layout */}
        <div className="modal-content-wrapper">
          {/* Column 1: Branding */}
          <div className="modal-branding">
            <div className="branding-content">
              <div className="branding-logo">🏥</div>
              <h3>Wahing Medical Clinic</h3>
              <p>Your health, our priority. Access your patient portal.</p>
            </div>
          </div>

          {/* Column 2: Form */}
          <div className="modal-form-content">
            <div className="modal-header">
              <h2>{showForgot ? 'Find Your Account' : 'Patient Login'}</h2>
            </div>

            <div className="modal-body">
              {!showForgot && message && (
                <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}

              {showForgot ? (
                <form onSubmit={handleForgotSubmit} noValidate>
                  <p className="form-description">
                    Enter your email and we'll send you a link to get back into your account.
                  </p>
                  {forgotStatus.text && (
                    <div className={`message ${forgotStatus.type === 'error' ? 'error' : 'success'}`}>
                      {forgotStatus.text}
                    </div>
                  )}
                  <div className="form-group">
                    <div className="input-container">
                      <input
                        type="email"
                        name="forgotEmail"
                        placeholder="Enter your email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" disabled={forgotLoading} className="login-btn">
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button type="button" className="register-btn" onClick={handleBackToLogin} disabled={forgotLoading}>
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <div className="input-container">
                      <input
                        type="text"
                        id="username"
                        name="username"
                        placeholder=" "
                        value={formData.username}
                        onChange={handleChange}
                        className={errors.username ? 'error' : ''}
                      />
                      <label htmlFor="username">Email</label>
                    </div>
                    {errors.username && <span className="error-text">{errors.username}</span>}
                  </div>

                  <div className="form-group">
                    <div className="input-container">
                      <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder=" "
                        value={formData.password}
                        onChange={handleChange}
                        className={errors.password ? 'error' : ''}
                      />
                      <label htmlFor="password">Password</label>
                    </div>
                    {errors.password && <span className="error-text">{errors.password}</span>}
                  </div>

                  <div className="form-options">
                    <label className="remember-me">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="forgot-password"
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={isLoading} className="login-btn">
                      {isLoading ? 'Logging In...' : 'Login'}
                    </button>
                    <button
                      type="button"
                      className="register-btn"
                      onClick={handleRegister}
                      disabled={isLoading}
                    >
                      Register
                    </button>
                  </div>
                </form>
              )}

              {!showForgot && (
                <div className="modal-footer">
                  <p className="footer-title">Are you clinic personnel?</p>
                  <div className="role-buttons">
                    <button className="role-btn" onClick={handleAdminLogin}>Admin Login</button>
                    <button className="role-btn" onClick={handleStaffLogin}>Staff Login</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
