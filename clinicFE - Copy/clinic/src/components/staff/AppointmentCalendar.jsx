import React, { useState, useEffect } from 'react';
import './AppointmentCalendar.css';

const AppointmentCalendar = ({ rescheduleData = null, onClearReschedule }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isAppointmentDetailModalOpen, setIsAppointmentDetailModalOpen] = useState(false);
  const [message, setMessage] = useState('');

  // Reschedule states
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [isRescheduleConfirmModalOpen, setIsRescheduleConfirmModalOpen] = useState(false);

  // New appointment form
  const [newAppointmentForm, setNewAppointmentForm] = useState({
    patientType: 'existing', // 'existing' or 'walkin'
    patientId: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    email: '',
    serviceId: '',
    symptom: ''
  });

  useEffect(() => {
    // Check if we're in reschedule mode
    if (rescheduleData?.rescheduleMode && rescheduleData?.appointmentToReschedule) {
      setIsRescheduleMode(true);
      setAppointmentToReschedule(rescheduleData.appointmentToReschedule);
      // Set current date to the appointment's date for context
      setCurrentDate(new Date(rescheduleData.appointmentToReschedule.preferredDateTime));
      setMessage('📅 Select a new available slot for this appointment');
    }
    
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [rescheduleData]);

  // Clear reschedule mode if rescheduleData becomes null
  useEffect(() => {
    if (!rescheduleData) {
      setIsRescheduleMode(false);
      setAppointmentToReschedule(null);
      setSelectedSlot(null);
      setIsRescheduleConfirmModalOpen(false);
      setMessage('');
    }
  }, [rescheduleData]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchPatients(),
        fetchServices(),
        fetchSchedule()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/appointments');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
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

  const getWeekday = (date) => {
    return (date.getDay() + 6) % 7; // Convert JS weekday to schedule format (0=Mon)
  };

  const getDaySchedule = (date) => {
    const weekday = getWeekday(date);
    return schedule.find(s => s.weekday === weekday);
  };

  const getTimeSlots = (date) => {
    const daySchedule = getDaySchedule(date);
    const slots = [];

    if (!daySchedule || daySchedule.status === 'DAY_OFF' || daySchedule.status === 'UNAVAILABLE') {
      return slots;
    }

    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const startMins = parseTime(daySchedule.startTime);
    const endMins = parseTime(daySchedule.endTime);

    // Create 1-hour slots (not 30-minute)
    for (let mins = startMins; mins < endMins; mins += 60) {
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      slots.push({
        time: timeStr,
        minutes: mins,
        date: new Date(date),
        endTime: (() => {
          const endMins = mins + 60;
          const endHours = Math.floor(endMins / 60);
          const endMinutes = endMins % 60;
          return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        })()
      });
    }

    return slots;
  };

  const getAppointmentForSlot = (date, timeStr) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.find(apt => {
      const aptDateTime = new Date(apt.preferredDateTime);
      const aptDateStr = aptDateTime.toISOString().split('T')[0];
      const aptTime = String(aptDateTime.getHours()).padStart(2, '0') + ':' + 
                      String(aptDateTime.getMinutes()).padStart(2, '0');
      return aptDateStr === dateStr && aptTime === timeStr;
    });
  };

  const isSlotAvailable = (date, timeStr) => {
    return !getAppointmentForSlot(date, timeStr);
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.serviceId === serviceId);
    return service ? service.serviceName : 'Unknown Service';
  };

  const handleSlotClick = (date, timeStr) => {
    const appointment = getAppointmentForSlot(date, timeStr);
    
    if (isRescheduleMode && appointmentToReschedule) {
      // Reschedule mode: confirm new slot
      if (!appointment) {
        // Slot is available, show confirmation
        setSelectedSlot({
          date: date.toISOString().split('T')[0],
          time: timeStr,
          dateObj: date
        });
        setIsRescheduleConfirmModalOpen(true);
      } else {
        setMessage('❌ This slot is already booked. Please select another time.');
      }
    } else {
      // Normal mode: existing behavior
      if (appointment) {
        setSelectedAppointment(appointment);
        setIsAppointmentDetailModalOpen(true);
      } else {
        const dateStr = date.toISOString().split('T')[0];
        setSelectedSlot({
          date: dateStr,
          time: timeStr,
          dateObj: date
        });
        setIsSlotModalOpen(true);
        setNewAppointmentForm({
          patientType: 'existing',
          patientId: '',
          firstName: '',
          lastName: '',
          phone: '',
          dateOfBirth: '',
          email: '',
          serviceId: '',
          symptom: ''
        });
        setMessage('');
      }
    }
  };

  const handleNewAppointmentChange = (e) => {
    const { name, value } = e.target;
    setNewAppointmentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateAppointment = async () => {
    if (!selectedSlot) return;

    // Validation
    const { patientType, patientId, firstName, lastName, phone, dateOfBirth, serviceId, symptom } = newAppointmentForm;

    if (patientType === 'existing') {
      if (!patientId || !serviceId) {
        setMessage('Please select a patient and service');
        return;
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !phone.trim() || !dateOfBirth || !serviceId) {
        setMessage('Please fill in all required fields for walk-in patient');
        return;
      }
    }

    try {
      let appointmentPatientId = patientId;

      // Register walk-in patient if needed
      if (patientType === 'walkin') {
        const patientResponse = await fetch('http://localhost:3000/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            email: newAppointmentForm.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}@walkin.temp`,
            phone,
            dateOfBirth,
            emergencyContactName: "",
            emergencyContactRelationship: "",
            emergencyContactPhone1: "",
            emergencyContactPhone2: "",
            streetAddress: "",
            barangay: "",
            municipality: "",
            password: `walkin${Date.now().toString().slice(-4)}`,
            role: 'Walkin'
          })
        });

        if (!patientResponse.ok) {
          throw new Error('Failed to register walk-in patient');
        }

        const patientData = await patientResponse.json();
        appointmentPatientId = patientData.patientId;
      }

      // Create appointment
      const appointmentDateTime = `${selectedSlot.date} ${selectedSlot.time}:00`;
      const appointmentResponse = await fetch('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: appointmentPatientId,
          serviceId: parseInt(serviceId),
          preferredDateTime: appointmentDateTime,
          symptom: symptom || 'Consultation',
          status: patientType === 'walkin' ? 'Accepted' : 'Pending',
          isWalkIn: patientType === 'walkin'
        })
      });

      if (!appointmentResponse.ok) {
        const error = await appointmentResponse.json();
        throw new Error(error.error || 'Failed to create appointment');
      }

      const createdAppointment = await appointmentResponse.json();

      // If walk-in, mark as attended right away
      if (patientType === 'walkin') {
        await fetch('http://localhost:3000/api/accepted-appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: createdAppointment.appointmentId,
            isAttended: 1
          })
        });
      }

      setMessage('Appointment created successfully!');
      fetchAppointments();
      setTimeout(() => {
        setIsSlotModalOpen(false);
        setMessage('');
      }, 2000);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error('Error creating appointment:', error);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!selectedSlot || !appointmentToReschedule) return;

    try {
      const appointmentDateTime = `${selectedSlot.date} ${selectedSlot.time}:00`;
      const response = await fetch(`http://localhost:3000/api/appointments/${appointmentToReschedule.appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredDateTime: appointmentDateTime,
          symptom: appointmentToReschedule.symptom
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reschedule appointment');
      }

      setMessage('✅ Appointment rescheduled successfully!');
      setIsRescheduleConfirmModalOpen(false);
      setIsRescheduleMode(false);
      setAppointmentToReschedule(null);

      // Refresh data
      fetchAppointments();

      // Call parent to clear reschedule mode
      if (onClearReschedule) onClearReschedule();

      // Reset after 2 seconds
      setTimeout(() => {
        setMessage('');
      }, 2000);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      console.error('Error rescheduling appointment:', error);
    }
  };

  const cancelReschedule = () => {
    setIsRescheduleMode(false);
    setAppointmentToReschedule(null);
    setSelectedSlot(null);
    setIsRescheduleConfirmModalOpen(false);
    setMessage('');
    // Call parent to clear reschedule mode
    if (onClearReschedule) onClearReschedule();
  };

  const closeSlotModal = () => {
    setIsSlotModalOpen(false);
    setSelectedSlot(null);
    setMessage('');
  };

  const closeAppointmentDetailModal = () => {
    setIsAppointmentDetailModalOpen(false);
    setSelectedAppointment(null);
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const renderDayView = () => {
    const slots = getTimeSlots(currentDate);
    const daySchedule = getDaySchedule(currentDate);

    if (!daySchedule) {
      return <div className="schedule-unavailable">No schedule found for this day</div>;
    }

    if (daySchedule.status === 'DAY_OFF') {
      return <div className="schedule-unavailable">⛔ Doctor has a day off</div>;
    }

    if (daySchedule.status === 'UNAVAILABLE') {
      return <div className="schedule-unavailable">⛔ Doctor is unavailable</div>;
    }

    return (
      <div className="calendar-view day-view">
        <div className="day-schedule-header">
          <h3>{getDayName(currentDate)}</h3>
          <div className="time-window">
            {daySchedule.startTime} - {daySchedule.endTime}
          </div>
        </div>

        <div className="day-schedule-container">
          {slots.map((slot, idx) => {
            const appointment = getAppointmentForSlot(currentDate, slot.time);
            const isAvailable = !appointment;

            return (
              <div key={idx} className={`appointment-block ${isAvailable ? 'available' : 'booked'}`}>
                <div className="time-header">
                  <div className="start-time">{slot.time}</div>
                  <div className="end-time">{slot.endTime}</div>
                </div>

                {isAvailable ? (
                  <button
                    className="appointment-slot available-slot"
                    onClick={() => handleSlotClick(currentDate, slot.time)}
                    title="Click to create appointment"
                  >
                    <div className="slot-status">Available</div>
                  </button>
                ) : (
                  <button
                    className="appointment-slot booked-slot"
                    onClick={() => handleSlotClick(currentDate, slot.time)}
                    title="Click to view appointment"
                    style={{ backgroundColor: getAppointmentColor(appointment.serviceId) }}
                  >
                    <div className="appointment-content">
                      <div className="patient-name">{getPatientName(appointment.patientId)}</div>
                      <div className="service-name">{getServiceName(appointment.serviceId)}</div>
                      <div className="apt-id">ID: {appointment.appointmentId}</div>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Start from Monday
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });

    const allSlots = days.map(day => ({
      date: day,
      slots: getTimeSlots(day)
    }));

    const allTimes = new Set();
    allSlots.forEach(day => day.slots.forEach(slot => allTimes.add(slot.time)));
    const times = Array.from(allTimes).sort();

    return (
      <div className="calendar-view week-view">
        <div className="week-grid-header">
          <div className="time-column-header">Time</div>
          {days.map((day, idx) => (
            <div key={idx} className="day-column-header">
              <div className="day-name">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="day-date">
                {day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>

        <div className="week-grid-body">
          {times.map((time, timeIdx) => (
            <div key={timeIdx} className="week-time-row">
              <div className="time-label">{time}</div>
              {days.map((day, dayIdx) => {
                const appointment = getAppointmentForSlot(day, time);
                const isAvailable = !appointment;
                const daySchedule = getDaySchedule(day);
                const isScheduleActive = daySchedule && 
                  daySchedule.status !== 'DAY_OFF' && 
                  daySchedule.status !== 'UNAVAILABLE';

                return (
                  <div key={dayIdx} className={`week-slot ${isScheduleActive ? '' : 'inactive'}`}>
                    {isScheduleActive && (
                      isAvailable ? (
                        <button
                          className="week-appointment-slot available-slot"
                          onClick={() => handleSlotClick(day, time)}
                          title="Click to create appointment"
                        >
                          <span className="slot-indicator">✓</span>
                        </button>
                      ) : (
                        <button
                          className="week-appointment-slot booked-slot"
                          onClick={() => handleSlotClick(day, time)}
                          title={`${getPatientName(appointment.patientId)} - ${getServiceName(appointment.serviceId)}`}
                          style={{ backgroundColor: getAppointmentColor(appointment.serviceId) }}
                        >
                          <div className="week-apt-info">
                            <div className="patient-initial">
                              {getPatientName(appointment.patientId).charAt(0)}
                            </div>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getAppointmentColor = (serviceId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    return colors[serviceId % colors.length];
  };

  return (
    <div className="appointment-calendar">
      <div className="calendar-header">
        <h2>📅 EMR Appointment Calendar {isRescheduleMode && '(Reschedule Mode)'}</h2>
        
        {isRescheduleMode && appointmentToReschedule && (
          <div className="reschedule-banner">
            <div className="reschedule-info">
              <strong>Rescheduling Appointment:</strong>
              <span>{getPatientName(appointmentToReschedule.patientId)} - {getServiceName(appointmentToReschedule.serviceId)}</span>
              <span className="current-time">Current: {new Date(appointmentToReschedule.preferredDateTime).toLocaleString('en-US')}</span>
            </div>
            <button className="cancel-reschedule-btn" onClick={cancelReschedule}>
              ✕ Cancel
            </button>
          </div>
        )}
        
        <div className="calendar-controls">
          <button onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - (viewMode === 'day' ? 1 : 7));
            setCurrentDate(newDate);
          }} className="nav-btn">
            ← Previous
          </button>

          <div className="date-display">
            {viewMode === 'day' 
              ? currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : `Week of ${new Date(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            }
          </div>

          <button onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + (viewMode === 'day' ? 1 : 7));
            setCurrentDate(newDate);
          }} className="nav-btn">
            Next →
          </button>

          <button onClick={() => setCurrentDate(new Date())} className="today-btn">
            Today
          </button>

          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>

          <button onClick={fetchAllData} className="refresh-btn" title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') || message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading calendar...</div>
      ) : (
        viewMode === 'day' ? renderDayView() : renderWeekView()
      )}

      {/* New Appointment Modal */}
      {isSlotModalOpen && selectedSlot && (
        <div className="modal-overlay" onClick={closeSlotModal}>
          <div className="appointment-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeSlotModal}>×</button>
            
            <div className="modal-header">
              <h3>Create Appointment</h3>
              <p>📅 {selectedSlot.date} at {selectedSlot.time}</p>
            </div>

            <div className="modal-body">
              {message && (
                <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}

              <div className="form-section">
                <label>Patient Type *</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="patientType"
                      value="existing"
                      checked={newAppointmentForm.patientType === 'existing'}
                      onChange={handleNewAppointmentChange}
                    />
                    Existing Patient
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="patientType"
                      value="walkin"
                      checked={newAppointmentForm.patientType === 'walkin'}
                      onChange={handleNewAppointmentChange}
                    />
                    Walk-in Patient
                  </label>
                </div>
              </div>

              {newAppointmentForm.patientType === 'existing' ? (
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="patientId">Select Patient *</label>
                    <select
                      id="patientId"
                      name="patientId"
                      value={newAppointmentForm.patientId}
                      onChange={handleNewAppointmentChange}
                      required
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.filter(p => p.role !== 'Walkin').map(patient => (
                        <option key={patient.patientId} value={patient.patientId}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="form-section">
                  <h4>Walk-in Patient Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name *</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={newAppointmentForm.firstName}
                        onChange={handleNewAppointmentChange}
                        placeholder="First name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">Last Name *</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={newAppointmentForm.lastName}
                        onChange={handleNewAppointmentChange}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Phone *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={newAppointmentForm.phone}
                        onChange={handleNewAppointmentChange}
                        placeholder="09123456789"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="dateOfBirth">Date of Birth *</label>
                      <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={newAppointmentForm.dateOfBirth}
                        onChange={handleNewAppointmentChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email (Optional)</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={newAppointmentForm.email}
                      onChange={handleNewAppointmentChange}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              )}

              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="serviceId">Service *</label>
                  <select
                    id="serviceId"
                    name="serviceId"
                    value={newAppointmentForm.serviceId}
                    onChange={handleNewAppointmentChange}
                    required
                  >
                    <option value="">-- Select Service --</option>
                    {services.map(service => (
                      <option key={service.serviceId} value={service.serviceId}>
                        {service.serviceName} - ₱{service.price?.toLocaleString() || '0'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="symptom">Symptoms / Reason</label>
                  <textarea
                    id="symptom"
                    name="symptom"
                    value={newAppointmentForm.symptom}
                    onChange={handleNewAppointmentChange}
                    placeholder="Describe symptoms or reason for visit..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="action-btn cancel-btn" onClick={closeSlotModal}>
                  Cancel
                </button>
                <button className="action-btn create-btn" onClick={handleCreateAppointment}>
                  Create Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {isAppointmentDetailModalOpen && selectedAppointment && (
        <div className="modal-overlay" onClick={closeAppointmentDetailModal}>
          <div className="appointment-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeAppointmentDetailModal}>×</button>
            
            <div className="modal-header">
              <h3>Appointment Details</h3>
              <p>ID: {selectedAppointment.appointmentId}</p>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>📋 Appointment Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Date & Time:</span>
                  <span className="detail-value">
                    {new Date(selectedAppointment.preferredDateTime).toLocaleString('en-US')}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Service:</span>
                  <span className="detail-value">{getServiceName(selectedAppointment.serviceId)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value status-${selectedAppointment.status?.toLowerCase()}`}>
                    {selectedAppointment.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Symptoms:</span>
                  <span className="detail-value">{selectedAppointment.symptom}</span>
                </div>
              </div>

              {(() => {
                const patient = patients.find(p => p.patientId === selectedAppointment.patientId);
                return patient ? (
                  <div className="detail-section">
                    <h4>👤 Patient Information</h4>
                    <div className="detail-row">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{patient.firstName} {patient.lastName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{patient.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{patient.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">DOB:</span>
                      <span className="detail-value">
                        {new Date(patient.dateOfBirth).toLocaleDateString('en-US')}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Age:</span>
                      <span className="detail-value">
                        {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} years
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="modal-actions">
                <button className="action-btn close-btn" onClick={closeAppointmentDetailModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Confirmation Modal */}
      {isRescheduleConfirmModalOpen && selectedSlot && appointmentToReschedule && (
        <div className="modal-overlay" onClick={() => setIsRescheduleConfirmModalOpen(false)}>
          <div className="reschedule-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsRescheduleConfirmModalOpen(false)}>×</button>
            
            <div className="modal-header">
              <h3>Confirm Reschedule</h3>
              <p>New appointment time</p>
            </div>

            <div className="modal-body">
              <div className="confirm-section">
                <div className="info-group">
                  <label>Patient:</label>
                  <span className="info-value">{getPatientName(appointmentToReschedule.patientId)}</span>
                </div>

                <div className="info-group">
                  <label>Service:</label>
                  <span className="info-value">{getServiceName(appointmentToReschedule.serviceId)}</span>
                </div>

                <div className="info-group">
                  <label>Current Schedule:</label>
                  <span className="info-value old-time">
                    {new Date(appointmentToReschedule.preferredDateTime).toLocaleString('en-US')}
                  </span>
                </div>

                <div className="divider">⟶</div>

                <div className="info-group">
                  <label>New Schedule:</label>
                  <span className="info-value new-time">
                    {new Date(`${selectedSlot.date}T${selectedSlot.time}`).toLocaleString('en-US')}
                  </span>
                </div>

                <div className="info-group">
                  <label>Symptoms:</label>
                  <span className="info-value">{appointmentToReschedule.symptom}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="action-btn cancel-btn" 
                  onClick={() => setIsRescheduleConfirmModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="action-btn confirm-btn" 
                  onClick={handleRescheduleConfirm}
                >
                  Confirm Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;
