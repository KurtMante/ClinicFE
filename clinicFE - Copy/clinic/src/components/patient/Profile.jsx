import React, { useState, useEffect } from 'react';
import './Profile.css';

const Profile = ({ patient }) => {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone1: '',
    emergencyContactPhone2: '',
    streetAddress: '',
    barangay: '',
    municipality: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (patient) {
      fetchPatientProfile();
    }
  }, [patient]);

  const fetchPatientProfile = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/patients/${patient.patientId}`);
      if (response.ok) {
        const patientData = await response.json();
        setProfileData({
          firstName: patientData.firstName || '',
          lastName: patientData.lastName || '',
          email: patientData.email || '',
          phone: patientData.phone || '',
          dateOfBirth: patientData.dateOfBirth || '',
          emergencyContactName: patientData.emergencyContactName || '',
          emergencyContactRelationship: patientData.emergencyContactRelationship || '',
          emergencyContactPhone1: patientData.emergencyContactPhone1 || '',
          emergencyContactPhone2: patientData.emergencyContactPhone2 || '',
          streetAddress: patientData.streetAddress || '',
          barangay: patientData.barangay || '',
          municipality: patientData.municipality || ''
        });
      } else {
        setMessage('Failed to load profile information');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error fetching profile:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      setMessage('Please correct the errors below');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const { dateOfBirth, ...updateData } = profileData;
      
      const response = await fetch(`http://localhost:3000/api/patients/${patient.patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Profile updated successfully!');
        setIsEditing(false);
        
        const updatedPatient = { ...patient, ...profileData };
        localStorage.setItem('patient', JSON.stringify(updatedPatient));
      } else {
        setMessage(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!profileData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!profileData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!profileData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!profileData.emergencyContactName.trim()) newErrors.emergencyContactName = 'Emergency contact name is required';
    if (!profileData.emergencyContactRelationship.trim()) newErrors.emergencyContactRelationship = 'Emergency contact relationship is required';
    if (!profileData.emergencyContactPhone1.trim()) newErrors.emergencyContactPhone1 = 'Emergency contact phone is required';
    if (!profileData.streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!profileData.barangay.trim()) newErrors.barangay = 'Barangay is required';
    if (!profileData.municipality.trim()) newErrors.municipality = 'Municipality is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    setMessage('');
    fetchPatientProfile();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCompletionPercentage = () => {
    const fields = [
      profileData.firstName,
      profileData.lastName,
      profileData.email,
      profileData.phone,
      profileData.dateOfBirth,
      profileData.emergencyContactName,
      profileData.emergencyContactRelationship,
      profileData.emergencyContactPhone1,
      profileData.streetAddress,
      profileData.barangay,
      profileData.municipality
    ];
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  return (
    <div className="profile-modern">
      {/* Header Section */}
      <div className="profile-header-modern">
        <div className="header-left">
          <div className="avatar-modern">
            <span className="avatar-initials">
              {profileData.firstName?.[0]}{profileData.lastName?.[0]}
            </span>
            <div className="avatar-badge">
              <span>✓</span>
            </div>
          </div>
          <div className="header-info">
            <h1>{profileData.firstName} {profileData.lastName}</h1>
            <p className="header-subtitle">Patient Profile</p>
            <div className="header-tags">
              <span className="tag">
                <span>📧</span>
                {profileData.email}
              </span>
              <span className="tag">
                <span>📱</span>
                {profileData.phone}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="completion-card">
            <div className="completion-header">
              <span className="completion-icon">📊</span>
              <span className="completion-label">Profile Completion</span>
            </div>
            <div className="completion-bar">
              <div 
                className="completion-progress" 
                style={{ width: `${getCompletionPercentage()}%` }}
              ></div>
            </div>
            <span className="completion-percentage">{getCompletionPercentage()}% Complete</span>
          </div>
          {!isEditing && (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              <span>✏️</span>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
          <span className="message-icon">{message.includes('successfully') ? '✓' : '⚠'}</span>
          {message}
        </div>
      )}

      {/* Profile Content */}
      <div className="profile-content-modern">
        {/* Basic Information Section */}
        <div className="profile-section-modern">
          <div className="section-header-modern">
            <div className="section-title">
              <span className="section-icon">👤</span>
              <h2>Basic Information</h2>
            </div>
            <span className="section-badge">Personal</span>
          </div>

          <div className="section-body">
            <div className="info-grid">
              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">👤</span>
                  <span className="info-label">First Name</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      className={errors.firstName ? 'error' : ''}
                    />
                    {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.firstName || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">👤</span>
                  <span className="info-label">Last Name</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      className={errors.lastName ? 'error' : ''}
                    />
                    {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.lastName || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">📧</span>
                  <span className="info-label">Email Address</span>
                </div>
                <span className="info-value">{profileData.email || 'Not provided'}</span>
                <span className="info-note">Email cannot be changed</span>
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">📱</span>
                  <span className="info-label">Phone Number</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.phone || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card full-width">
                <div className="info-card-header">
                  <span className="info-icon">🎂</span>
                  <span className="info-label">Date of Birth</span>
                </div>
                <span className="info-value">{formatDate(profileData.dateOfBirth)}</span>
                <span className="info-note">Date of birth cannot be changed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="profile-section-modern">
          <div className="section-header-modern">
            <div className="section-title">
              <span className="section-icon">🚨</span>
              <h2>Emergency Contact</h2>
            </div>
            <span className="section-badge emergency">Important</span>
          </div>

          <div className="section-body">
            <div className="info-grid">
              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">👥</span>
                  <span className="info-label">Contact Name</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={profileData.emergencyContactName}
                      onChange={handleInputChange}
                      placeholder="Enter contact name"
                      className={errors.emergencyContactName ? 'error' : ''}
                    />
                    {errors.emergencyContactName && <span className="error-text">{errors.emergencyContactName}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.emergencyContactName || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">💕</span>
                  <span className="info-label">Relationship</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="emergencyContactRelationship"
                      value={profileData.emergencyContactRelationship}
                      onChange={handleInputChange}
                      placeholder="e.g., Mother, Father, Spouse"
                      className={errors.emergencyContactRelationship ? 'error' : ''}
                    />
                    {errors.emergencyContactRelationship && <span className="error-text">{errors.emergencyContactRelationship}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.emergencyContactRelationship || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">📞</span>
                  <span className="info-label">Primary Phone</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      name="emergencyContactPhone1"
                      value={profileData.emergencyContactPhone1}
                      onChange={handleInputChange}
                      placeholder="Enter primary phone"
                      className={errors.emergencyContactPhone1 ? 'error' : ''}
                    />
                    {errors.emergencyContactPhone1 && <span className="error-text">{errors.emergencyContactPhone1}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.emergencyContactPhone1 || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">📱</span>
                  <span className="info-label">Secondary Phone</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      name="emergencyContactPhone2"
                      value={profileData.emergencyContactPhone2}
                      onChange={handleInputChange}
                      placeholder="Enter secondary phone (optional)"
                    />
                  </div>
                ) : (
                  <span className="info-value">{profileData.emergencyContactPhone2 || 'Not provided'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="profile-section-modern">
          <div className="section-header-modern">
            <div className="section-title">
              <span className="section-icon">📍</span>
              <h2>Address Information</h2>
            </div>
            <span className="section-badge">Location</span>
          </div>

          <div className="section-body">
            <div className="info-grid">
              <div className="info-card full-width">
                <div className="info-card-header">
                  <span className="info-icon">🏠</span>
                  <span className="info-label">Street Address</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="streetAddress"
                      value={profileData.streetAddress}
                      onChange={handleInputChange}
                      placeholder="Enter street address"
                      className={errors.streetAddress ? 'error' : ''}
                    />
                    {errors.streetAddress && <span className="error-text">{errors.streetAddress}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.streetAddress || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">🏘️</span>
                  <span className="info-label">Barangay</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="barangay"
                      value={profileData.barangay}
                      onChange={handleInputChange}
                      placeholder="Enter barangay"
                      className={errors.barangay ? 'error' : ''}
                    />
                    {errors.barangay && <span className="error-text">{errors.barangay}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.barangay || 'Not provided'}</span>
                )}
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-icon">🏙️</span>
                  <span className="info-label">Municipality</span>
                </div>
                {isEditing ? (
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="municipality"
                      value={profileData.municipality}
                      onChange={handleInputChange}
                      placeholder="Enter municipality"
                      className={errors.municipality ? 'error' : ''}
                    />
                    {errors.municipality && <span className="error-text">{errors.municipality}</span>}
                  </div>
                ) : (
                  <span className="info-value">{profileData.municipality || 'Not provided'}</span>
                )}
              </div>
            </div>

            {/* Address Preview */}
            {!isEditing && profileData.streetAddress && (
              <div className="address-preview">
                <span className="preview-icon">📍</span>
                <div className="preview-content">
                  <span className="preview-label">Full Address</span>
                  <span className="preview-value">
                    {profileData.streetAddress}, {profileData.barangay}, {profileData.municipality}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="profile-actions-modern">
            <button className="btn-cancel" onClick={handleCancelEdit}>
              <span>✕</span>
              Cancel
            </button>
            <button 
              className="btn-save"
              onClick={handleSaveProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
