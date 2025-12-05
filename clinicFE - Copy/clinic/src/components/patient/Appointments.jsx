import React, { useState, useEffect } from 'react';
import './Appointments.css';
import Feedback from './Feedback'; // If you want to reuse the modal, or copy modal logic here

const Appointments = ({ patient }) => {
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [acceptedAppointments, setAcceptedAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  
  // Edit appointment modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editFormData, setEditFormData] = useState({
    preferredDateTime: '',
    symptom: ''
  });
  const [schedules, setSchedules] = useState([]);
  const [selectedDaySchedule, setSelectedDaySchedule] = useState(null);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  // Feedback modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackAppointment, setFeedbackAppointment] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    comment: '',
    isAnonymous: false
  });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  useEffect(() => {
    if (patient) {
      fetchAppointments();
      fetchServices();
      fetchSchedules();
    }
  }, [patient]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const [pendingResponse, acceptedResponse] = await Promise.all([
        fetch(`http://localhost:3000/api/appointments/patient/${patient.patientId}`),
        fetch(`http://localhost:3000/api/accepted-appointments/patient/${patient.patientId}`)
      ]);

      let pendingData = [];
      let acceptedData = [];

      if (pendingResponse.ok) {
        pendingData = await pendingResponse.json();
      }

      if (acceptedResponse.ok) {
        acceptedData = await acceptedResponse.json();
      }

      const acceptedAppointmentIds = acceptedData.map(accepted => accepted.appointmentId);
      const filteredPendingData = pendingData.filter(
        pending => !acceptedAppointmentIds.includes(pending.appointmentId)
      );

      setPendingAppointments(filteredPendingData);
      setAcceptedAppointments(acceptedData);
    } catch (error) {
      setMessage('Error fetching appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/medical-services');
      if (response.ok) {
        const servicesData = await response.json();
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/schedules');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.map(s => ({ ...s, note: (s.notes ?? s.note ?? '').trim() })));
      }
    } catch (e) {
      console.error('Error fetching schedules:', e);
    }
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.serviceId === serviceId);
    return service ? service.serviceName : 'Unknown Service';
  };

  const getServicePrice = (serviceId) => {
    const service = services.find(s => s.serviceId === serviceId);
    return service ? service.price : '0';
  };

  const getScheduleForDate = (dateTime) => {
    if (!dateTime) return null;
    const jsDay = new Date(dateTime).getDay();
    const backendWeekday = (jsDay + 6) % 7;
    return schedules.find(s => Number(s.weekday) === backendWeekday) || null;
  };

  const isWithinTimeRange = (dateTime, sched) => {
    if (!sched || !sched.start_time || !sched.end_time) return true;
    const normalize = (t) => t.length >= 5 ? t.slice(0,5) : t;
    const start = normalize(sched.start_time);
    const end = normalize(sched.end_time);

    const d = new Date(dateTime);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const current = `${hh}:${mm}`;

    return current >= start && current <= end;
  };

  const normalizeStatus = (s = '') => s.toUpperCase().trim().replace(/\s+/g, '_');

  const evaluateAvailability = (dateTime) => {
    const sched = getScheduleForDate(dateTime);
    if (!sched) return { available: true, msg: 'No schedule restriction.' };
    const status = normalizeStatus(sched.status || '');
    const start = sched.start_time ? sched.start_time.slice(0,5) : null;
    const end = sched.end_time ? sched.end_time.slice(0,5) : null;
    const notes = (sched.notes || sched.note || '').trim();

    if (['UNAVAILABLE','DAY_OFF','OFF','DAYOFF'].includes(status)) {
      return { available: false, msg: `Doctor unavailable (${sched.status}). ${notes}`.trim() };
    }
    if (['AVAILABLE','HALF_DAY'].includes(status)) {
      if (start && end && !isWithinTimeRange(dateTime, sched)) {
        return { available: false, msg: `Outside available time (${start} - ${end}). ${notes}`.trim() };
      }
      return { available: true, msg: `Available${start && end ? ` (${start} - ${end})` : ''}. ${notes}`.trim() };
    }
    return { available: true, msg: notes || 'Available.' };
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setEditFormData({
      preferredDateTime: appointment.preferredDateTime,
      symptom: appointment.symptom
    });
    setIsEditModalOpen(true);
    const sched = getScheduleForDate(appointment.preferredDateTime);
    setSelectedDaySchedule(sched);
    const evalResult = evaluateAvailability(appointment.preferredDateTime);
    setAvailabilityMessage(evalResult.msg);
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Appointment cancelled successfully');
        fetchAppointments();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error cancelling appointment:', error);
    }
  };

  const handleUpdateAppointment = async () => {
    const evalResult = evaluateAvailability(editFormData.preferredDateTime);
    if (!evalResult.available) {
      setMessage(evalResult.msg);
      return;
    }

    if (!editFormData.preferredDateTime || !editFormData.symptom.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/appointments/${editingAppointment.appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        setMessage('Appointment updated successfully');
        setIsEditModalOpen(false);
        fetchAppointments();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to update appointment');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error updating appointment:', error);
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
    setEditFormData({
      preferredDateTime: '',
      symptom: ''
    });
    setMessage('');
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (e.target.name === 'preferredDateTime') {
      const sched = getScheduleForDate(e.target.value);
      setSelectedDaySchedule(sched);
      const evalResult = evaluateAvailability(e.target.value);
      setAvailabilityMessage(evalResult.msg);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateTime) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getServiceIcon = (serviceName) => {
    const name = serviceName?.toLowerCase() || '';
    if (name.includes('consult')) return '🩺';
    if (name.includes('check') || name.includes('exam')) return '📋';
    if (name.includes('vaccine') || name.includes('immun')) return '💉';
    if (name.includes('lab') || name.includes('test')) return '🧪';
    if (name.includes('dental')) return '🦷';
    if (name.includes('eye') || name.includes('vision')) return '👁️';
    if (name.includes('child') || name.includes('pedia')) return '👶';
    if (name.includes('heart') || name.includes('cardio')) return '❤️';
    return '⚕️';
  };

  const openFeedbackModal = (appointment) => {
    setFeedbackAppointment(appointment);
    setFeedbackForm({
      rating: 5,
      comment: '',
      isAnonymous: false
    });
    setFeedbackModalOpen(true);
    setFeedbackMessage('');
  };

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false);
    setFeedbackAppointment(null);
    setFeedbackForm({
      rating: 5,
      comment: '',
      isAnonymous: false
    });
    setFeedbackMessage('');
  };

  const handleFeedbackInputChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.comment.trim()) {
      setFeedbackMessage('Please provide a comment for your feedback');
      return;
    }
    setIsFeedbackLoading(true);
    try {
      const feedbackData = {
        patientId: patient.patientId,
        appointmentId: feedbackAppointment.acceptedAppointmentId,
        rating: parseInt(feedbackForm.rating),
        comment: feedbackForm.comment.trim(),
        isAnonymous: feedbackForm.isAnonymous
      };
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      if (response.ok) {
        setFeedbackMessage('Feedback submitted successfully!');
        closeFeedbackModal();
      } else {
        const data = await response.json();
        setFeedbackMessage(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      setFeedbackMessage('Network error. Please try again.');
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  return (
    <div className="appointments-modern">
      {/* Header Section */}
      <div className="appointments-header-modern">
        <div className="header-title">
          <h1>My Appointments</h1>
          <p>Manage your medical appointments and view history</p>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <span className="stat-value">{pendingAppointments.length}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-value">{acceptedAppointments.length}</span>
              <span className="stat-label">Accepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
          <span className="message-icon">{message.includes('successfully') ? '✓' : '⚠'}</span>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-modern">
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span className="tab-icon">⏳</span>
          Pending
          <span className="tab-count">{pendingAppointments.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          <span className="tab-icon">✅</span>
          Accepted
          <span className="tab-count">{acceptedAppointments.length}</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-modern">
          <div className="loading-spinner"></div>
          <p>Loading appointments...</p>
        </div>
      ) : (
        <div className="appointments-content-modern">
          {activeTab === 'pending' && (
            <div className="appointments-section-modern">
              {pendingAppointments.length === 0 ? (
                <div className="no-appointments-modern">
                  <span className="empty-icon">📭</span>
                  <h3>No Pending Appointments</h3>
                  <p>You don't have any pending appointments at the moment.</p>
                </div>
              ) : (
                <div className="appointments-grid">
                  {pendingAppointments.map((appointment) => (
                    <div key={appointment.appointmentId} className="appointment-card-modern">
                      <div className="card-header">
                        <div className="service-badge">
                          <span className="service-icon">{getServiceIcon(getServiceName(appointment.serviceId))}</span>
                          <div className="service-info">
                            <h3>{getServiceName(appointment.serviceId)}</h3>
                            <span className="service-price">₱{getServicePrice(appointment.serviceId)}</span>
                          </div>
                        </div>
                        <div className="status-badge pending">
                          <span>⏳</span>
                          {appointment.status || 'Pending'}
                        </div>
                      </div>
                      
                      <div className="card-body">
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-icon">📅</span>
                            <div className="info-content">
                              <span className="info-label">Date</span>
                              <span className="info-value">{formatDate(appointment.preferredDateTime)}</span>
                            </div>
                          </div>
                          <div className="info-item">
                            <span className="info-icon">🕐</span>
                            <div className="info-content">
                              <span className="info-label">Time</span>
                              <span className="info-value">{formatTime(appointment.preferredDateTime)}</span>
                            </div>
                          </div>
                          <div className="info-item full-width">
                            <span className="info-icon">📝</span>
                            <div className="info-content">
                              <span className="info-label">Symptoms</span>
                              <span className="info-value">{appointment.symptom}</span>
                            </div>
                          </div>
                        </div>
                        
                        {(() => {
                          const sched = getScheduleForDate(appointment.preferredDateTime);
                          const note = sched?.note || sched?.notes || '';
                          if (!note.trim()) return null;
                          return (
                            <div className="doctor-note">
                              <span className="note-icon">📋</span>
                              <span className="note-text">{note}</span>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="card-footer">
                        <div className="appointment-meta">
                          <span className="meta-item">ID: #{appointment.appointmentId}</span>
                          <span className="meta-item">Booked: {formatDate(appointment.createdAt)}</span>
                        </div>
                        <div className="card-actions">
                          <button
                            className="action-btn reschedule-btn"
                            onClick={() => handleEditAppointment(appointment)}
                            disabled={(() => {
                              const sched = getScheduleForDate(appointment.preferredDateTime);
                              if (!sched) return false;
                              const status = normalizeStatus(sched.status || '');
                              return ['UNAVAILABLE','DAY_OFF','OFF','DAYOFF'].includes(status);
                            })()}
                          >
                            <span>📅</span>
                            Reschedule
                          </button>
                          <button 
                            className="action-btn cancel-btn"
                            onClick={() => handleCancelAppointment(appointment.appointmentId)}
                          >
                            <span>✕</span>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'accepted' && (
            <div className="appointments-section-modern">
              {acceptedAppointments.length === 0 ? (
                <div className="no-appointments-modern">
                  <span className="empty-icon">📭</span>
                  <h3>No Accepted Appointments</h3>
                  <p>You don't have any accepted appointments yet.</p>
                </div>
              ) : (
                <div className="appointments-grid">
                  {acceptedAppointments.map((appointment) => (
                    <div key={appointment.acceptedAppointmentId} className="appointment-card-modern accepted">
                      <div className="card-header">
                        <div className="service-badge">
                          <span className="service-icon">{getServiceIcon(getServiceName(appointment.serviceId))}</span>
                          <div className="service-info">
                            <h3>{getServiceName(appointment.serviceId)}</h3>
                            <span className="service-price">₱{getServicePrice(appointment.serviceId)}</span>
                          </div>
                        </div>
                        <div className={`status-badge ${appointment.isAttended === 1 ? 'attended' : 'scheduled'}`}>
                          <span>{appointment.isAttended === 1 ? '✅' : '📅'}</span>
                          {appointment.isAttended === 1 ? 'Attended' : 'Scheduled'}
                        </div>
                      </div>
                      
                      <div className="card-body">
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-icon">📅</span>
                            <div className="info-content">
                              <span className="info-label">Date</span>
                              <span className="info-value">{formatDate(appointment.preferredDateTime)}</span>
                            </div>
                          </div>
                          <div className="info-item">
                            <span className="info-icon">🕐</span>
                            <div className="info-content">
                              <span className="info-label">Time</span>
                              <span className="info-value">{formatTime(appointment.preferredDateTime)}</span>
                            </div>
                          </div>
                          <div className="info-item full-width">
                            <span className="info-icon">📝</span>
                            <div className="info-content">
                              <span className="info-label">Symptoms</span>
                              <span className="info-value">{appointment.symptom}</span>
                            </div>
                          </div>
                        </div>

                        {(() => {
                          const sched = getScheduleForDate(appointment.preferredDateTime);
                          const noteText = sched ? (sched.notes || sched.note || '') : '';
                          if (noteText.trim()) {
                            return (
                              <div className="doctor-note">
                                <span className="note-icon">📋</span>
                                <span className="note-text">{noteText}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      <div className="card-footer">
                        <div className="appointment-meta">
                          <span className="meta-item">ID: #{appointment.acceptedAppointmentId}</span>
                          <span className="meta-item">Accepted: {formatDate(appointment.createdAt)}</span>
                        </div>
                        {appointment.isAttended === 1 && (
                          <div className="card-actions">
                            <button
                              className="action-btn feedback-btn"
                              onClick={() => openFeedbackModal(appointment)}
                            >
                              <span>✍️</span>
                              Give Feedback
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingAppointment && (
        <div className="modal-overlay-modern" onClick={closeEditModal}>
          <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeEditModal}>×</button>
            
            <div className="modal-header-modern">
              <div className="modal-service-icon">
                <span>{getServiceIcon(getServiceName(editingAppointment.serviceId))}</span>
              </div>
              <div className="modal-title">
                <h3>Reschedule Appointment</h3>
                <p>{getServiceName(editingAppointment.serviceId)}</p>
              </div>
            </div>

            <div className="modal-body-modern">
              {message && (
                <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
                  <span className="message-icon">{message.includes('successfully') ? '✓' : '⚠'}</span>
                  {message}
                </div>
              )}

              <div className="form-modern">
                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">📅</span>
                    New Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="preferredDateTime"
                    value={editFormData.preferredDateTime}
                    onChange={handleEditInputChange}
                    min={getMinDateTime()}
                  />
                </div>

                {selectedDaySchedule && (
                  <div className="schedule-info-modern">
                    <div className="schedule-header">
                      <span className="schedule-icon">🗓️</span>
                      <span>Doctor's Schedule</span>
                    </div>
                    <div className="schedule-details">
                      <div className="schedule-item">
                        <span className="schedule-label">Status:</span>
                        <span className={`schedule-value ${normalizeStatus(selectedDaySchedule.status).toLowerCase()}`}>
                          {selectedDaySchedule.status}
                        </span>
                      </div>
                      {selectedDaySchedule.start_time && selectedDaySchedule.end_time && (
                        <div className="schedule-item">
                          <span className="schedule-label">Hours:</span>
                          <span className="schedule-value">{selectedDaySchedule.start_time} - {selectedDaySchedule.end_time}</span>
                        </div>
                      )}
                      {selectedDaySchedule.notes && (
                        <div className="schedule-item">
                          <span className="schedule-label">Note:</span>
                          <span className="schedule-value">{selectedDaySchedule.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {availabilityMessage && (
                  <div className={`availability-badge ${evaluateAvailability(editFormData.preferredDateTime).available ? 'available' : 'unavailable'}`}>
                    <span>{evaluateAvailability(editFormData.preferredDateTime).available ? '✓' : '⚠'}</span>
                    {availabilityMessage}
                  </div>
                )}

                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">📝</span>
                    Symptoms / Reason
                  </label>
                  <textarea
                    name="symptom"
                    value={editFormData.symptom}
                    onChange={handleEditInputChange}
                    placeholder="Update your symptoms or reason for this appointment..."
                    rows="4"
                    disabled
                    className="disabled-input"
                  />
                  <span className="input-note">Symptoms cannot be modified when rescheduling</span>
                </div>

                <div className="modal-actions-modern">
                  <button className="btn-secondary" onClick={closeEditModal}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleUpdateAppointment}
                    disabled={!evaluateAvailability(editFormData.preferredDateTime).available}
                  >
                    <span>✓</span>
                    Update Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalOpen && feedbackAppointment && (
        <div className="modal-overlay-modern" onClick={closeFeedbackModal}>
          <div className="modal-modern" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeFeedbackModal}>×</button>
            <div className="modal-header-modern">
              <div className="modal-icon">
                <span>✍️</span>
              </div>
              <div className="modal-title">
                <h3>Give Feedback</h3>
                <p>Share your experience for this appointment</p>
              </div>
            </div>
            <div className="modal-body-modern">
              {feedbackMessage && (
                <div className={`message-modern ${feedbackMessage.includes('successfully') ? 'success' : 'error'}`}>
                  <span className="message-icon">{feedbackMessage.includes('successfully') ? '✓' : '⚠'}</span>
                  {feedbackMessage}
                </div>
              )}
              <div className="form-modern">
                {/* Rating Selection */}
                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">⭐</span>
                    How would you rate your experience?
                  </label>
                  <div className="rating-selector">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`rating-option-modern ${feedbackForm.rating == value ? 'selected' : ''}`}
                        onClick={() => setFeedbackForm(prev => ({ ...prev, rating: value }))}
                      >
                        <span className="rating-emoji-large">{['😞','😕','😐','🙂','😄'][value-1]}</span>
                        <span className="rating-stars-option">
                          {[1,2,3,4,5].map(star => (
                            <span key={star} className={`star-option ${star <= value ? 'filled' : ''}`}>★</span>
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Comment */}
                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">💬</span>
                    Your Review
                  </label>
                  <textarea
                    name="comment"
                    value={feedbackForm.comment}
                    onChange={handleFeedbackInputChange}
                    placeholder="Please share your experience with this appointment..."
                    rows="5"
                  />
                </div>
                {/* Anonymous Option */}
                <div className="anonymous-toggle">
                  <label className="toggle-label">
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={feedbackForm.isAnonymous}
                        onChange={e => setFeedbackForm(prev => ({
                          ...prev,
                          isAnonymous: e.target.checked
                        }))}
                      />
                      <span className="toggle-slider"></span>
                    </div>
                    <span>🕶️ Submit Anonymously</span>
                  </label>
                </div>
                {/* Actions */}
                <div className="modal-actions-modern">
                  <button className="btn-secondary" onClick={closeFeedbackModal}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSubmitFeedback}
                    disabled={isFeedbackLoading || !feedbackForm.comment.trim()}
                  >
                    {isFeedbackLoading ? (
                      <>
                        <span className="spinner"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
