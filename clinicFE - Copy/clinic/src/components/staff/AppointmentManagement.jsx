import React, { useState, useEffect } from 'react';
import './AppointmentManagement.css';

const AppointmentManagement = ({ isAdminView = false }) => {
  const [appointments, setAppointments] = useState([]);
  const [acceptedAppointments, setAcceptedAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [filteredAcceptedAppointments, setFilteredAcceptedAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Default');
  const [viewMode, setViewMode] = useState('List view');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal states
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    preferredDateTime: '',
    symptom: ''
  });
  const [schedule, setSchedule] = useState([]); // Add this state
  const [rescheduleError, setRescheduleError] = useState(''); // Error message for rescheduling

  // Reminder states
  const [remindingAppointments, setRemindingAppointments] = useState([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderPatient, setReminderPatient] = useState(null);
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchAcceptedAppointments();
    fetchPatients();
    fetchServices();
    fetchSchedule();
  }, []);

  useEffect(() => {
    filterAndSortAppointments();
    filterAndSortAcceptedAppointments();
  }, [appointments, acceptedAppointments, searchTerm, sortBy]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/appointments');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      } else {
        setMessage('Failed to fetch appointments');
      }
    } catch (error) {
      setMessage('Error fetching appointments');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAcceptedAppointments = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/accepted-appointments');
      if (response.ok) {
        const data = await response.json();
        setAcceptedAppointments(data);
      } else {
        console.error('Failed to fetch accepted appointments');
      }
    } catch (error) {
      console.error('Error fetching accepted appointments:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/medical-services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/schedule');
      if (response.ok) {
        const data = await response.json();
        setSchedule(data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const filterAndSortAppointments = () => {
    let filtered = appointments.filter(appointment => {
      const patientName = getPatientName(appointment.patientId).toLowerCase();
      const serviceName = getServiceName(appointment.serviceId).toLowerCase();
      const search = searchTerm.toLowerCase();
      
      // Filter out appointments with "Accepted" status
      const isNotAccepted = appointment.status?.toLowerCase() !== 'accepted';
      
      const matchesSearch = patientName.includes(search) || 
                           serviceName.includes(search) ||
                           appointment.status?.toLowerCase().includes(search);
      
      return isNotAccepted && matchesSearch;
    });

    // Sort appointments
    if (sortBy === 'A-Z') {
      filtered.sort((a, b) => getPatientName(a.patientId).localeCompare(getPatientName(b.patientId)));
    } else if (sortBy === 'Date') {
      filtered.sort((a, b) => new Date(a.preferredDateTime) - new Date(b.preferredDateTime));
    }
    // Default keeps original order

    setFilteredAppointments(filtered);
  };

  const filterAndSortAcceptedAppointments = () => {
    let filtered = acceptedAppointments.filter(appointment => {
      const patientName = getPatientName(appointment.patientId).toLowerCase();
      const serviceName = getServiceName(appointment.serviceId).toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return patientName.includes(search) || 
             serviceName.includes(search);
    });

    // Sort accepted appointments
    if (sortBy === 'A-Z') {
      filtered.sort((a, b) => getPatientName(a.patientId).localeCompare(getPatientName(b.patientId)));
    } else if (sortBy === 'Date') {
      filtered.sort((a, b) => new Date(a.preferredDateTime) - new Date(b.preferredDateTime));
    }

    setFilteredAcceptedAppointments(filtered);
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  const getPatientEmail = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? patient.email : null;
  };

  const getPatientPhone = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? patient.phone : null;
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.serviceId === serviceId);
    return service ? service.serviceName : 'Unknown Service';
  };

  const handleAcceptAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to accept this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/accepted-appointments/accept/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setMessage('Appointment accepted successfully');
        fetchAppointments();
        fetchAcceptedAppointments();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to accept appointment');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleMarkAsAttended = async (acceptedAppointmentId) => {
    if (!window.confirm('Mark this appointment as attended?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/accepted-appointments/${acceptedAppointmentId}/attend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setMessage('Appointment marked as attended successfully');
        fetchAcceptedAppointments();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to mark as attended');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Appointment deleted successfully');
        fetchAppointments(); // Refresh the list
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to delete appointment');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleRemindPatient = async (appointment) => {
    const appointmentId = appointment.appointmentId || appointment.acceptedAppointmentId;
    
    // Prevent multiple clicks
    if (remindingAppointments.includes(appointmentId)) {
      return;
    }

    const patientName = getPatientName(appointment.patientId);
    const patientEmail = getPatientEmail(appointment.patientId);
    const patientPhone = getPatientPhone(appointment.patientId);
    const serviceName = getServiceName(appointment.serviceId);
    const appointmentDate = new Date(appointment.preferredDateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const appointmentTime = new Date(appointment.preferredDateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create automatic reminder message
    const autoMessage = `Dear ${patientName},

This is a friendly reminder about your upcoming appointment.

📅 Date: ${appointmentDate}
⏰ Time: ${appointmentTime}
🏥 Service: ${serviceName}

Please arrive 10-15 minutes before your scheduled time. If you need to reschedule or cancel, please contact us as soon as possible.

Thank you for choosing our clinic!

Best regards,
Clinic Management Team`;

    // Set reminder details and open modal
    setReminderPatient({
      name: patientName,
      email: patientEmail,
      phone: patientPhone,
      serviceName: serviceName,
      date: appointmentDate,
      time: appointmentTime
    });
    setReminderMessage(autoMessage);
    setReminderSent(false);

    // Add to reminding state
    setRemindingAppointments(prev => [...prev, appointmentId]);

    try {
      // Create reminder in database using ReminderController
      const response = await fetch('http://localhost:3000/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: appointment.patientId,
          appointmentId: appointmentId,
          serviceId: appointment.serviceId,
          serviceName: serviceName,
          message: autoMessage,
          preferredDateTime: appointment.preferredDateTime,
          isRead: 0
        })
      });

      if (response.ok) {
        const reminderData = await response.json();
        console.log('Reminder created:', reminderData);
        setMessage(`Reminder sent successfully to ${patientName}`);
        setReminderSent(true);
        setIsReminderModalOpen(true);
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to send reminder');
        setReminderSent(false);
        setIsReminderModalOpen(true);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      setMessage('Failed to send reminder. Please try again.');
      setReminderSent(false);
      setIsReminderModalOpen(true);
    } finally {
      // Remove from reminding state after 2 seconds
      setTimeout(() => {
        setRemindingAppointments(prev => prev.filter(id => id !== appointmentId));
      }, 2000);
    }
  };

  const closeReminderModal = () => {
    setIsReminderModalOpen(false);
    setReminderMessage('');
    setReminderPatient(null);
    setReminderSent(false);
  };

  const handleRescheduleClick = (appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleData({
      preferredDateTime: appointment.preferredDateTime,
      symptom: appointment.symptom
    });
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleInputChange = (e) => {
    const { name, value } = e.target;
    setRescheduleData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check doctor availability on date/time change
    if (name === 'preferredDateTime') {
      const availability = checkDoctorAvailability(value);
      setRescheduleError(availability.available ? '' : availability.reason);
    }
  };

  const checkDoctorAvailability = (dateTime) => {
    if (!dateTime || schedule.length === 0) return { available: true, reason: '' };
    const weekday = getWeekday(dateTime);
    const sched = schedule.find(s => s.weekday === weekday);
    if (!sched) return { available: false, reason: 'No schedule found for this day.' };
    if (sched.status === 'DAY_OFF') return { available: false, reason: 'Doctor has a day off.' };
    if (sched.status === 'UNAVAILABLE') return { available: false, reason: 'Doctor is unavailable.' };
    if (sched.status === 'AVAILABLE' || sched.status === 'HALF_DAY') {
      // Convert times to minutes
      const toMinutes = (t) => {
        if (!t) return null;
        const [h, m, s] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const start = toMinutes(sched.startTime);
      const end = toMinutes(sched.endTime);
      const selected = toMinutes(new Date(dateTime).toTimeString().slice(0,5) + ':00');
      if (start === null || end === null) return { available: false, reason: 'No time window set for this day.' };
      if (selected === null) return { available: false, reason: 'Invalid appointment time.' };
      if (selected < start) return { available: false, reason: `Selected time is before doctor's available hours (${sched.startTime} - ${sched.endTime}).` };
      if (selected > end) return { available: false, reason: `Selected time is after doctor's available hours (${sched.startTime} - ${sched.endTime}).` };
      return { available: true, reason: '' };
    }
    return { available: true, reason: '' };
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleData.preferredDateTime) {
      setMessage('Please select a new date and time');
      return;
    }

    // Check doctor availability before submitting
    const availability = checkDoctorAvailability(rescheduleData.preferredDateTime);
    if (!availability.available) {
      setRescheduleError(availability.reason);
      return;
    }

    try {
      // Only send the preferredDateTime, keep the original symptom
      const response = await fetch(`http://localhost:3000/api/appointments/${selectedAppointment.appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredDateTime: rescheduleData.preferredDateTime,
          symptom: selectedAppointment.symptom // Keep original symptom
        })
      });

      if (response.ok) {
        setMessage('Appointment rescheduled successfully');
        setIsRescheduleModalOpen(false);
        fetchAppointments(); // Refresh the list
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to reschedule appointment');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error:', error);
    }
  };

  const closeRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    setSelectedAppointment(null);
    setRescheduleData({
      preferredDateTime: '',
      symptom: ''
    });
    setMessage('');
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  const getAttendanceStatusColor = (isAttended) => {
    return isAttended === 1 ? 'status-attended' : 'status-not-attended';
  };

  const getAttendanceStatusText = (isAttended) => {
    return isAttended === 1 ? 'ATTENDED' : 'NOT ATTENDED';
  };

  // Helper to get weekday (0=Sunday, 6=Saturday)
  const getWeekday = (dateStr) => {
    return new Date(dateStr).getDay();
  };

  return (
    <div className="appointment-management">
      <div className="management-header">
        <h1>Manage Appointments</h1>
        
        <div className="management-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="control-buttons">
            <button 
              className={`control-btn ${sortBy === 'Default' ? 'active' : ''}`}
              onClick={() => setSortBy('Default')}
            >
              Default
            </button>
            <button 
              className={`control-btn ${sortBy === 'A-Z' ? 'active' : ''}`}
              onClick={() => setSortBy('A-Z')}
            >
              A-Z
            </button>
            <button 
              className={`control-btn ${viewMode === 'List view' ? 'active' : ''}`}
              onClick={() => setViewMode('List view')}
            >
              List view
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') || message.includes('Reminder sent') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading appointments...</div>
      ) : (
        <div className="appointments-tables-container">
          {/* Pending Appointments Table */}
          <div className="appointments-table-section">
            <h2>Pending Appointments ({filteredAppointments.length})</h2>
            <div className="appointments-table-container">
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Service</th>
                    <th>Status</th>
                    {!isAdminView && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminView ? "5" : "6"} className="no-appointments">
                        No pending appointments found
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <tr key={appointment.appointmentId}>
                        <td>
                          <div className="user-info">
                            <span className="user-name">{getPatientName(appointment.patientId)}</span>
                          </div>
                        </td>
                        <td>
                          {new Date(appointment.preferredDateTime).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td>
                          {new Date(appointment.preferredDateTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td>{getServiceName(appointment.serviceId)}</td>
                        <td>
                          <span className={`table-status-badge ${getStatusColor(appointment.status)}`}>
                            {appointment.status || 'PENDING'}
                          </span>
                        </td>
                        {!isAdminView && (
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="action-btn accept-btn"
                                onClick={() => handleAcceptAppointment(appointment.appointmentId)}
                                title="Accept"
                              >
                                ACCEPT
                              </button>
                              <button 
                                className="action-btn reschedule-btn"
                                onClick={() => handleRescheduleClick(appointment)}
                                title="Reschedule"
                              >
                                RESCHEDULE
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Accepted Appointments Table */}
          <div className="appointments-table-section">
            <h2>Accepted Appointments ({filteredAcceptedAppointments.length})</h2>
            <div className="appointments-table-container">
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Service</th>
                    <th>Status</th>
                    {!isAdminView && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAcceptedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminView ? "5" : "6"} className="no-appointments">
                        No accepted appointments found
                      </td>
                    </tr>
                  ) : (
                    filteredAcceptedAppointments.map((appointment) => (
                      <tr key={appointment.acceptedAppointmentId}>
                        <td>
                          <div className="user-info">
                            <span className="user-name">{getPatientName(appointment.patientId)}</span>
                          </div>
                        </td>
                        <td>
                          {new Date(appointment.preferredDateTime).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td>
                          {new Date(appointment.preferredDateTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td>{getServiceName(appointment.serviceId)}</td>
                        <td>
                          <span className={`table-status-badge ${getAttendanceStatusColor(appointment.isAttended)}`}>
                            {getAttendanceStatusText(appointment.isAttended)}
                          </span>
                        </td>
                        {!isAdminView && (
                          <td>
                            <div className="action-buttons">
                              {appointment.isAttended === 0 ? (
                                <>
                                  <button 
                                    className="action-btn attend-btn"
                                    onClick={() => handleMarkAsAttended(appointment.acceptedAppointmentId)}
                                    title="Mark as Attended"
                                  >
                                    MARK ATTENDED
                                  </button>
                                  <button 
                                    className={`action-btn remind-btn ${remindingAppointments.includes(appointment.acceptedAppointmentId) ? 'reminding' : ''}`}
                                    onClick={() => handleRemindPatient(appointment)}
                                    title="Send Reminder"
                                    disabled={remindingAppointments.includes(appointment.acceptedAppointmentId)}
                                  >
                                    {remindingAppointments.includes(appointment.acceptedAppointmentId) ? 'SENDING...' : 'REMIND'}
                                  </button>
                                </>
                              ) : (
                                <span className="action-completed">COMPLETED</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && selectedAppointment && (
        <div className="modal-overlay" onClick={closeRescheduleModal}>
          <div className="reschedule-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeRescheduleModal}>×</button>
            
            <div className="modal-header">
              <h3>Reschedule Appointment</h3>
              <p>Patient: {getPatientName(selectedAppointment.patientId)}</p>
              <p>Service: {getServiceName(selectedAppointment.serviceId)}</p>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="rescheduleDateTime">New Date & Time *</label>
                <input
                  type="datetime-local"
                  id="rescheduleDateTime"
                  name="preferredDateTime"
                  value={rescheduleData.preferredDateTime}
                  onChange={handleRescheduleInputChange}
                  min={getMinDateTime()}
                  required
                />
              </div>
              {rescheduleError && (
                <div style={{ color: 'red', marginBottom: '10px' }}>
                  Doctor is unavailable for the selected date/time.<br />
                  <strong>Reason:</strong> {rescheduleError}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="rescheduleSymptom">Symptoms / Reason</label>
                <textarea
                  id="rescheduleSymptom"
                  name="symptom"
                  value={rescheduleData.symptom}
                  onChange={handleRescheduleInputChange}
                  placeholder="Symptoms or reason for visit..."
                  rows="4"
                  disabled
                  className="disabled-input"
                />
                <span className="input-note">Symptoms cannot be modified when rescheduling</span>
              </div>

              <div className="modal-actions">
                <button className="action-btn cancel-btn" onClick={closeRescheduleModal}>
                  Cancel
                </button>
                <button className="action-btn save-btn" onClick={handleRescheduleSubmit}>
                  Update Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {isReminderModalOpen && reminderPatient && (
        <div className="modal-overlay" onClick={closeReminderModal}>
          <div className="reminder-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeReminderModal}>×</button>
            
            <div className={`reminder-modal-header ${reminderSent ? 'success' : 'error'}`}>
              <div className="reminder-icon">{reminderSent ? '✅' : '❌'}</div>
              <h3>{reminderSent ? 'Reminder Sent Successfully!' : 'Failed to Send Reminder'}</h3>
            </div>

            <div className="reminder-modal-body">
              <div className="reminder-recipient">
                <h4>Patient Information:</h4>
                <div className="recipient-details">
                  <p><strong>👤 Name:</strong> {reminderPatient.name}</p>
                  {reminderPatient.email && <p><strong>📧 Email:</strong> {reminderPatient.email}</p>}
                  {reminderPatient.phone && <p><strong>📱 Phone:</strong> {reminderPatient.phone}</p>}
                </div>
              </div>

              <div className="reminder-appointment-details">
                <h4>Appointment Details:</h4>
                <div className="appointment-info-cards">
                  <div className="info-card">
                    <span className="info-icon">📅</span>
                    <div className="info-content">
                      <span className="info-label">Date</span>
                      <span className="info-value">{reminderPatient.date}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <span className="info-icon">⏰</span>
                    <div className="info-content">
                      <span className="info-label">Time</span>
                      <span className="info-value">{reminderPatient.time}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <span className="info-icon">🏥</span>
                    <div className="info-content">
                      <span className="info-label">Service</span>
                      <span className="info-value">{reminderPatient.serviceName}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="reminder-message-preview">
                <h4>Message Sent to Patient:</h4>
                <div className="message-box">
                  <pre>{reminderMessage}</pre>
                </div>
              </div>

              {reminderSent && (
                <div className="reminder-success-note">
                  <span>💡</span>
                  <p>This reminder has been saved and the patient can view it in their <strong>Reminders</strong> section.</p>
                </div>
              )}
            </div>

            <div className="reminder-modal-footer">
              <button className="action-btn confirm-btn" onClick={closeReminderModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentManagement;

