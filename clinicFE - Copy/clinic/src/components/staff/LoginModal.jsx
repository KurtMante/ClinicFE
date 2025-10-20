import React, { useState } from 'react';
import './LoginModal.css';

const StaffLoginModal = ({ isOpen, onClose, onNavigate }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      const response = await fetch('http://localhost:3000/api/staff/login', {
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
        // Store staff data with proper field mapping
        const staffData = {
          ...data.staff,
          // Ensure we have the correct staffId field
          staffId: data.staff.staffId || data.staff.id
        };
        localStorage.setItem('staff', JSON.stringify(staffData));
        if (rememberMe) {
          localStorage.setItem('rememberMeStaff', 'true');
        } else {
          localStorage.removeItem('rememberMeStaff');
        }
        // Close modal and navigate to staff dashboard
        setTimeout(() => {
          onClose();
          onNavigate('staffDashboard');
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

  const handleForgotPassword = () => {
    alert('Forgot password functionality will be implemented soon.');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal staff-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>STAFF LOGIN</h2>
          
        </div>

        <div className="modal-body">
          {message && (
            <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-container">
               
                <input
                  type="text"
                  name="username"
                  placeholder="Staff Email"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? 'error' : ''}
                />
              </div>
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            <div className="form-group">
              <div className="input-container">
                
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                />
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
              <button type="button" className="forgot-password" onClick={handleForgotPassword}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" disabled={isLoading} className="login-btn staff-login-btn">
              {isLoading ? 'LOGGING IN...' : 'STAFF LOGIN'}
            </button>

            {/* Staff register button removed */}
          </form>

          <div className="modal-footer">
            <p className="staff-note">Staff access only. Contact administrator for account issues.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLoginModal;

