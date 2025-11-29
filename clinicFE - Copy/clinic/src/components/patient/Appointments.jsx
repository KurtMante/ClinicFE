import React, { useState, useEffect } from 'react';
import './Appointments.css';

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
      // Fetch both pending and accepted appointments
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

      // Get array of appointmentIds that have been accepted
      const acceptedAppointmentIds = acceptedData.map(accepted => accepted.appointmentId);

      // Filter out pending appointments that have been accepted
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

  // If backend uses Monday=0, Tuesday=1, ... Sunday=6, adjust JS getDay (Sunday=0) to that:
  const mapJsDayToScheduleDay = (jsDay) => {
    // Convert Sunday(0) -> 6, Monday(1) -> 0, ..., Saturday(6) -> 5
    return (jsDay + 6) % 7;
  };

  const getWeekday = (dateTime) => new Date(dateTime).getDay(); // JS day
  const getScheduleForDate = (dateTime) => {
    if (!dateTime) return null;
    const jsDay = new Date(dateTime).getDay(); // 0=Sun .. 6=Sat
    // Backend uses Monday=0 .. Sunday=6
    const backendWeekday = (jsDay + 6) % 7;
    return schedules.find(s => Number(s.weekday) === backendWeekday) || null;
  };

  const isWithinTimeRange = (dateTime, sched) => {
    if (!sched || !sched.start_time || !sched.end_time) return true;
    const normalize = (t) => t.length >= 5 ? t.slice(0,5) : t; // trim seconds if present
    const start = normalize(sched.start_time);
    const end = normalize(sched.end_time);

    const d = new Date(dateTime);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const current = `${hh}:${mm}`;

    return current >= start && current <= end;
  };

  // Add near top utility area
const normalizeStatus = (s = '') => s.toUpperCase().trim().replace(/\s+/g, '_');

  // Replace status extraction inside evaluateAvailability
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
        fetchAppointments(); // Refresh the list
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
    // availability validation
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
        fetchAppointments(); // Refresh the list
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
    return new Date(dateTime).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  const getAttendanceStatus = (isAttended) => {
    return isAttended === 1 ? 'Attended' : 'Not Attended';
  };

  const getAttendanceColor = (isAttended) => {
    return isAttended === 1 ? 'status-attended' : 'status-not-attended';
  };

  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h1>My Appointments</h1>
        <p>Manage your medical appointments and view appointment history</p>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="appointments-tabs">
        <button 
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Appointments ({pendingAppointments.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          Accepted Appointments ({acceptedAppointments.length})
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Loading appointments...</div>
      ) : (
        <div className="appointments-content">
          {activeTab === 'pending' && (
            <div className="appointments-section">
              <h2>Pending Appointments</h2>
              {pendingAppointments.length === 0 ? (
                <div className="no-appointments">
                  <p>No pending appointments found.</p>
                </div>
              ) : (
                <div className="appointments-list">
                  {pendingAppointments.map((appointment) => (
                    <div key={appointment.appointmentId} className="appointment-card">
                      <div className="appointment-header">
                        <div className="appointment-service">
                          <h3>{getServiceName(appointment.serviceId)}</h3>
                          <span className="appointment-price">₱{getServicePrice(appointment.serviceId)}</span>
                        </div>
                        <div className={`appointment-status ${getStatusColor(appointment.status)}`}>
                          {appointment.status || 'Pending'}
                        </div>
                      </div>
                      
                      <div className="appointment-details">
                        <div className="appointment-info">
                          <p><strong>Date & Time:</strong> {formatDateTime(appointment.preferredDateTime)}</p>
                          <p><strong>Symptoms/Reason:</strong> {appointment.symptom}</p>
                          <p><strong>Appointment ID:</strong> #{appointment.appointmentId}</p>
                          <p><strong>Booked on:</strong> {formatDateTime(appointment.createdAt)}</p>
                          {(() => {
                            const sched = getScheduleForDate(appointment.preferredDateTime);
                            const note = sched?.note || sched?.notes || '';
                            if (!note.trim()) return null;
                            const short = note.length > 40 ? note.slice(0,40) + '...' : note;
                            return (
                              <p className="doctor-note-line">
                                <strong>Doctor Note:</strong> {short}
                                <span className="note-badge" title={note}>📝</span>
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                      
                      <div className="appointment-actions">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditAppointment(appointment)}
                          disabled={(() => {
                            const sched = getScheduleForDate(appointment.preferredDateTime);
                            if (!sched) return false;
                            const status = normalizeStatus(sched.status || '');
                            return ['UNAVAILABLE','DAY_OFF','OFF','DAYOFF'].includes(status);
                          })()}
                          title={(() => {
                            const sched = getScheduleForDate(appointment.preferredDateTime);
                            if (!sched) return 'Reschedule';
                            const status = normalizeStatus(sched.status || '');
                            if (['UNAVAILABLE','DAY_OFF','OFF','DAYOFF'].includes(status)) {
                              return `Doctor ${sched.status} - cannot reschedule this day`;
                            }
                            return 'Reschedule';
                          })()}
                        >
                          Reschedule
                        </button>
                        <button 
                          className="action-btn cancel-btn"
                          onClick={() => handleCancelAppointment(appointment.appointmentId)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'accepted' && (
            <div className="appointments-section">
              <h2>Accepted Appointments</h2>
              {acceptedAppointments.length === 0 ? (
                <div className="no-appointments">
                  <p>No accepted appointments found.</p>
                </div>
              ) : (
                <div className="appointments-list">
                  {acceptedAppointments.map((appointment) => (
                    <div key={appointment.acceptedAppointmentId} className="appointment-card accepted">
                      <div className="appointment-header">
                        <div className="appointment-service">
                          <h3>{getServiceName(appointment.serviceId)}</h3>
                          <span className="appointment-price">₱{getServicePrice(appointment.serviceId)}</span>
                        </div>
                        <div className={`appointment-status ${getAttendanceColor(appointment.isAttended)}`}>
                          {getAttendanceStatus(appointment.isAttended)}
                        </div>
                      </div>
                      
                      <div className="appointment-details">
                        <div className="appointment-info">
                          <p><strong>Date & Time:</strong> {formatDateTime(appointment.preferredDateTime)}</p>
                          <p><strong>Symptoms/Reason:</strong> {appointment.symptom}</p>
                          <p><strong>Accepted Appointment ID:</strong> #{appointment.acceptedAppointmentId}</p>
                          <p><strong>Original Appointment ID:</strong> #{appointment.appointmentId}</p>
                          <p><strong>Accepted on:</strong> {formatDateTime(appointment.createdAt)}</p>
                          {(() => {
                            const sched = getScheduleForDate(appointment.preferredDateTime);
                            const noteText = sched ? (sched.notes || sched.note || '') : '';
                            if (sched && noteText.trim()) {
                              const short = noteText.length > 40 ? noteText.slice(0,40) + '...' : noteText;
                              return (
                                <p>
                                  <strong>Doctor Schedule Note:</strong> {short}
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Appointment Modal */}
      {isEditModalOpen && editingAppointment && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeEditModal}>×</button>
            
            <div className="modal-header">
              <h3>Reschedule Appointment</h3>
              <p>Service: {getServiceName(editingAppointment.serviceId)}</p>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="editDateTime">New Date & Time *</label>
                <input
                  type="datetime-local"
                  id="editDateTime"
                  name="preferredDateTime"
                  value={editFormData.preferredDateTime}
                  onChange={handleEditInputChange}
                  min={getMinDateTime()}
                  required
                />
              </div>
              {selectedDaySchedule && (
                <div className="schedule-info">
                  <p><strong>Schedule Status:</strong> {selectedDaySchedule.status}</p>
                  {selectedDaySchedule.start_time && selectedDaySchedule.end_time && (
                    <p><strong>Available Window:</strong> {selectedDaySchedule.start_time} - {selectedDaySchedule.end_time}</p>
                  )}
                  <p><strong>Note:</strong> {selectedDaySchedule.notes || 'None'}</p>
                </div>
              )}
              {availabilityMessage && (
                <div className="availability-message">
                  {availabilityMessage}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="editSymptom">Symptoms / Reason for Visit *</label>
                <textarea
                  id="editSymptom"
                  name="symptom"
                  value={editFormData.symptom}
                  onChange={handleEditInputChange}
                  placeholder="Update your symptoms or reason for this appointment..."
                  rows="4"
                  required
                />
              </div>
              <div className="modal-actions">
                <button className="action-btn cancel-btn" onClick={closeEditModal}>
                  Cancel
                </button>
                <button
                  className="action-btn save-btn"
                  onClick={handleUpdateAppointment}
                  disabled={!evaluateAvailability(editFormData.preferredDateTime).available}
                >
                  Update Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
