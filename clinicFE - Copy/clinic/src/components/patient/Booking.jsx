import React, { useState, useEffect } from 'react';
import './Booking.css';

// --- PatientAppointmentCalendar: Patient-only calendar for slot picking ---
const PatientAppointmentCalendar = ({
  appointments,
  services,
  schedule,
  onSelectSlot,
  onClose,
  isOpen,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calendar grid helpers
  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    // Fill blanks for first week
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    // Fill days of month
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    // Fill blanks for last week
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const isSameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Helper: get weekday (0=Sunday)
  const getWeekday = (date) => date.getDay();

  // Helper: get schedule for a day
  const getDaySchedule = (date) => {
    // JS: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Backend: 0=Monday, 1=Tuesday, ..., 6=Sunday
    const jsWeekday = date.getDay();
    // Map JS weekday to backend weekday
    // JS 0 (Sunday) -> backend 6
    // JS 1 (Monday) -> backend 0
    // JS 2 (Tuesday) -> backend 1
    // JS 3 (Wednesday) -> backend 2
    // JS 4 (Thursday) -> backend 3
    // JS 5 (Friday) -> backend 4
    // JS 6 (Saturday) -> backend 5
    const backendWeekday = jsWeekday === 0 ? 6 : jsWeekday - 1;
    const sched = schedule.find((s) => s.weekday === backendWeekday);
    return sched;
  };

  // Helper: get slots for a day
  const getTimeSlots = (date) => {
    const daySchedule = getDaySchedule(date);
    const slots = [];
    if (!daySchedule || daySchedule.status === 'DAY_OFF' || daySchedule.status === 'UNAVAILABLE') return slots;
    const parseTime = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const startMins = parseTime(daySchedule.startTime);
    const endMins = parseTime(daySchedule.endTime);
    for (let mins = startMins; mins < endMins; mins += 60) {
      const hours = String(Math.floor(mins / 60)).padStart(2, '0');
      const minutes = String(mins % 60).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      slots.push({ time: timeStr, minutes: mins, date: new Date(date) });
    }
    return slots;
  };

  // Helper: is slot occupied
  const isSlotOccupied = (date, timeStr) => {
    // Convert both date and appointment to Asia/Manila local date and time
    const toPHDateStr = (d) => {
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
    };
    const toPHTimeStr = (d) => {
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' }); // HH:MM
    };

    const dateStr = toPHDateStr(date);
    return appointments.some((apt) => {
      const validStatuses = ['Pending', 'Accepted'];
      if (!validStatuses.includes(apt.status)) return false;

      const aptDate = new Date(apt.preferredDateTime);
      const aptDateStr = toPHDateStr(aptDate);
      const aptTime = toPHTimeStr(aptDate);
      return aptDateStr === dateStr && aptTime === timeStr;
    });
  };

  // Helper: get service name
  const getServiceName = (serviceId) => {
    const s = services.find((x) => x.serviceId === serviceId);
    return s ? s.serviceName : '';
  };

  if (!isOpen) return null;

  const today = new Date();

  return (
    <div className="modal-overlay-modern" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-modern" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, minWidth: 340 }}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <div className="modal-header-modern" style={{ borderBottom: '1px solid #eee', marginBottom: 8 }}>
          <div className="modal-title">
            <h3 style={{ marginBottom: 0 }}>Select Appointment Slot</h3>
            <p style={{ margin: 0, color: '#666', fontSize: 15 }}>
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        {/* Month navigation and mini calendar */}
        <div className="calendar-modal-flex" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
                title="Previous month"
              >‹</button>
              <span style={{ fontWeight: 600 }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
                title="Next month"
              >›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 13, color: '#888', marginBottom: 2 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontWeight: 500 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {getMonthDays(currentDate).map((d, i) => (
                <button
                  key={i}
                  disabled={!d}
                  style={{
                    height: 28,
                    width: 28,
                    borderRadius: '50%',
                    border: isSameDay(d, currentDate) ? '2px solid #388e3c' : '1px solid #eee',
                    background: isSameDay(d, today) ? '#e8f5e9' : '#fff',
                    color: isSameDay(d, currentDate) ? '#fff' : isSameDay(d, today) ? '#388e3c' : '#333',
                    fontWeight: isSameDay(d, currentDate) ? 700 : 400,
                    backgroundColor: isSameDay(d, currentDate) ? '#388e3c' : isSameDay(d, today) ? '#e8f5e9' : '#fff',
                    cursor: d ? 'pointer' : 'default',
                    outline: 'none',
                    margin: 0,
                    padding: 0,
                  }}
                  onClick={() => d && setCurrentDate(new Date(d))}
                  tabIndex={d ? 0 : -1}
                >
                  {d ? d.getDate() : ''}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setCurrentDate(new Date())}
                style={{
                  background: '#f5f5f5',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  padding: '2px 10px',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <strong>Legend:</strong>
              <span style={{ marginLeft: 8, color: '#4caf50' }}>● Available</span>
              <span style={{ marginLeft: 8, color: '#f44336' }}>● Booked</span>
            </div>
          </div>
          {/* Slots for selected day */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>
              Available Slots
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(() => {
                const slots = getTimeSlots(currentDate);
                if (!slots.length) {
                  const daySchedule = getDaySchedule(currentDate);
                  if (!daySchedule) return <div style={{ color: '#888' }}>No schedule for this day.</div>;
                  if (daySchedule.status === 'DAY_OFF') return <div style={{ color: '#f44336' }}>⛔ Doctor has a day off.</div>;
                  if (daySchedule.status === 'UNAVAILABLE') return <div style={{ color: '#f44336' }}>⛔ Doctor is unavailable.</div>;
                  return <div style={{ color: '#888' }}>No available slots.</div>;
                }
                return slots.map((slot, idx) => {
                  const occupied = isSlotOccupied(currentDate, slot.time);
                  return (
                    <button
                      key={idx}
                      className="calendar-slot-btn"
                      style={{
                        background: occupied ? '#f8d7da' : '#e8f5e9',
                        color: occupied ? '#f44336' : '#388e3c',
                        border: occupied ? '1px solid #f44336' : '1px solid #388e3c',
                        padding: '10px 14px',
                        borderRadius: 6,
                        cursor: occupied ? 'not-allowed' : 'pointer',
                        opacity: occupied ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: 500,
                        fontSize: 16,
                        marginBottom: 2,
                        transition: 'background 0.2s'
                      }}
                      disabled={occupied}
                      onClick={() => !occupied && onSelectSlot(currentDate, slot.time)}
                    >
                      <span>
                        {slot.time} - {String(Number(slot.time.split(':')[0]) + 1).padStart(2, '0')}:{slot.time.split(':')[1]}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: 14 }}>
                        {occupied ? 'Booked' : 'Available'}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Booking component ---
const Booking = ({ patient }) => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allAppointments, setAllAppointments] = useState([]);
  const [calendarServices, setCalendarServices] = useState([]);
  const [calendarSchedule, setCalendarSchedule] = useState([]);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Appointment form data
  const [appointmentData, setAppointmentData] = useState({
    preferredDateTime: '',
    symptom: ''
  });

  // Fetch medical services on component mount
  useEffect(() => {
    fetchMedicalServices();
  }, []);

  // Filter and sort services when search term or sort option changes
  useEffect(() => {
    let filtered = services.filter(service =>
      service.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort services based on selected option
    if (sortBy === 'a-z') {
      filtered = filtered.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
    } else if (sortBy === 'z-a') {
      filtered = filtered.sort((a, b) => b.serviceName.localeCompare(a.serviceName));
    } else if (sortBy === 'price-low') {
      filtered = filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === 'price-high') {
      filtered = filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    setFilteredServices(filtered);
  }, [services, searchTerm, sortBy]);

  const fetchMedicalServices = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/medical-services');
      if (response.ok) {
        const servicesData = await response.json();
        setServices(servicesData);
        setFilteredServices(servicesData);
      } else {
        setMessage('Failed to load medical services');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error fetching medical services:', error);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
    setMessage('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setAppointmentData({
      preferredDateTime: '',
      symptom: ''
    });
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAppointmentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBookAppointment = async () => {
    if (!appointmentData.preferredDateTime) {
      setMessage('Please select a preferred date and time');
      return;
    }

    if (!appointmentData.symptom.trim()) {
      setMessage('Please describe your symptoms or reason for visit');
      return;
    }

    if (!patient?.patientId || !selectedService?.serviceId) {
      setMessage('Missing patient or service information. Please try again.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const toSqlDateTime = (dtLocal) => {
        if (!dtLocal) return dtLocal;
        const [datePart, timePart] = dtLocal.split('T');
        const timeWithSeconds = timePart?.length === 5 ? `${timePart}:00` : timePart;
        return `${datePart} ${timeWithSeconds}`;
      };

      const appointmentPayload = {
        patientId: patient.patientId,
        serviceId: selectedService.serviceId,
        preferredDateTime: toSqlDateTime(appointmentData.preferredDateTime),
        symptom: appointmentData.symptom
      };

      const response = await fetch('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentPayload),
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        const text = await response.text();
        data = { error: text };
      }

      if (response.ok) {
        setMessage('Appointment booked successfully!');
        // Refresh appointments for calendar
        fetch('http://localhost:3000/api/appointments')
          .then(res => res.ok ? res.json() : [])
          .then(setAllAppointments)
          .catch(() => setAllAppointments([]));
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        const backendMsg = typeof data === 'string' ? data : (data?.error || data?.message);
        setMessage(backendMsg || 'Failed to book appointment');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error booking appointment:', error);
    } finally {
      setIsLoading(false);
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

  const getServiceIcon = (serviceName) => {
    const name = serviceName.toLowerCase();
    if (name.includes('consult')) return '🩺';
    if (name.includes('check') || name.includes('exam')) return '📋';
    if (name.includes('vaccine') || name.includes('immun')) return '💉';
    if (name.includes('lab') || name.includes('test')) return '🧪';
    if (name.includes('xray') || name.includes('x-ray')) return '🔬';
    if (name.includes('dental')) return '🦷';
    if (name.includes('eye') || name.includes('vision')) return '👁️';
    if (name.includes('child') || name.includes('pedia')) return '👶';
    if (name.includes('heart') || name.includes('cardio')) return '❤️';
    if (name.includes('skin') || name.includes('derma')) return '🧴';
    return '⚕️';
  };

  // Fetch all appointments/services/schedule for calendar modal
  useEffect(() => {
    if (isCalendarModalOpen) {
      fetch('http://localhost:3000/api/appointments')
        .then(res => res.ok ? res.json() : [])
        .then(setAllAppointments)
        .catch(() => setAllAppointments([]));
      fetch('http://localhost:3000/api/medical-services')
        .then(res => res.ok ? res.json() : [])
        .then(setCalendarServices)
        .catch(() => setCalendarServices([]));
      fetch('http://localhost:3000/api/schedule')
        .then(res => res.ok ? res.json() : [])
        .then(setCalendarSchedule)
        .catch(() => setCalendarSchedule([]));
    }
  }, [isCalendarModalOpen]);

  // Instead of datetime-local input, use calendar modal for slot selection
  const handleOpenCalendarModal = () => {
    setIsCalendarModalOpen(true);
    setMessage('');
  };

  const handleCalendarSlotSelect = (dateObj, timeStr) => {
    // Use local date parts to avoid timezone shift
    const [hours, minutes] = timeStr.split(':').map(Number);
    const localDate = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      hours,
      minutes,
      0,
      0
    );
    // Format as 'YYYY-MM-DDTHH:mm' (local time, no Z)
    const pad = n => String(n).padStart(2, 0);
    const isoLocal = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;

    setAppointmentData(prev => ({
      ...prev,
      preferredDateTime: isoLocal
    }));
    setIsCalendarModalOpen(false);
  };

  return (
    <div className="booking-modern">
      {/* Header Section */}
      <div className="booking-header-modern">
        <div className="header-title">
          <h1>Book an Appointment</h1>
          <p>Choose from our available medical services</p>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <span className="stat-icon">📋</span>
            <div className="stat-info">
              <span className="stat-value">{services.length}</span>
              <span className="stat-label">Services</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="booking-controls-modern">
        <div className="search-box-modern">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${sortBy === 'default' ? 'active' : ''}`}
            onClick={() => setSortBy('default')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${sortBy === 'a-z' ? 'active' : ''}`}
            onClick={() => setSortBy('a-z')}
          >
            A-Z
          </button>
          <button 
            className={`filter-btn ${sortBy === 'z-a' ? 'active' : ''}`}
            onClick={() => setSortBy('z-a')}
          >
            Z-A
          </button>
          <button 
            className={`filter-btn ${sortBy === 'price-low' ? 'active' : ''}`}
            onClick={() => setSortBy('price-low')}
          >
            Price ↑
          </button>
          <button 
            className={`filter-btn ${sortBy === 'price-high' ? 'active' : ''}`}
            onClick={() => setSortBy('price-high')}
          >
            Price ↓
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && !isModalOpen && (
        <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
          <span className="message-icon">{message.includes('successfully') ? '✓' : '⚠'}</span>
          {message}
        </div>
      )}

      {/* Services Grid */}
      <div className="services-section-modern">
        <div className="section-header">
          <h2>Available Services</h2>
          <span className="service-count">{filteredServices.length} services found</span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="no-services-modern">
            <span className="empty-icon">🔍</span>
            <h3>No services found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="services-grid">
            {filteredServices.map((service) => (
              <div key={service.serviceId} className="service-card">
                <div className="service-card-header">
                  <div className="service-icon-wrapper">
                    <span>{getServiceIcon(service.serviceName)}</span>
                  </div>
                  <div className="service-price-tag">
                    ₱{service.price}
                  </div>
                </div>
                <div className="service-card-body">
                  <h3>{service.serviceName}</h3>
                  {service.description && (
                    <p className="service-desc">{service.description}</p>
                  )}
                </div>
                <div className="service-card-footer">
                  <button 
                    className="book-btn"
                    onClick={() => handleServiceSelect(service)}
                  >
                    <span>📅</span>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {isModalOpen && selectedService && (
        <div className="modal-overlay-modern" onClick={closeModal}>
          <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>×</button>
            
            <div className="modal-header-modern">
              <div className="modal-service-icon">
                <span>{getServiceIcon(selectedService.serviceName)}</span>
              </div>
              <div className="modal-title">
                <h3>Book Appointment</h3>
                <p>{selectedService.serviceName}</p>
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
                    Preferred Date & Time
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="calendar-select-btn"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: '1px solid #888',
                        background: '#f5f5f5',
                        cursor: 'pointer'
                      }}
                      onClick={handleOpenCalendarModal}
                    >
                      {appointmentData.preferredDateTime
                        ? new Date(appointmentData.preferredDateTime + '+08:00').toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })
                        : 'Select Date & Time'}
                    </button>
                    {appointmentData.preferredDateTime && (
                      <button
                        type="button"
                        style={{
                          marginLeft: 4,
                          border: 'none',
                          background: 'transparent',
                          color: '#f44336',
                          cursor: 'pointer'
                        }}
                        onClick={() => setAppointmentData(prev => ({ ...prev, preferredDateTime: '' }))}
                        title="Clear selection"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Calendar Modal for slot selection */}
                <PatientAppointmentCalendar
                  appointments={allAppointments}
                  services={calendarServices}
                  schedule={calendarSchedule}
                  isOpen={isCalendarModalOpen}
                  onSelectSlot={handleCalendarSlotSelect}
                  onClose={() => setIsCalendarModalOpen(false)}
                />

                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">📝</span>
                    Symptoms / Reason for Visit
                  </label>
                  <textarea
                    name="symptom"
                    value={appointmentData.symptom}
                    onChange={handleInputChange}
                    placeholder="Please describe your symptoms or reason for this appointment..."
                    rows="4"
                  />
                </div>

                <div className="summary-card">
                  <h4>Appointment Summary</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Service</span>
                      <span className="summary-value">{selectedService.serviceName}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Price</span>
                      <span className="summary-value price">₱{selectedService.price}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Patient</span>
                      <span className="summary-value">{patient.firstName} {patient.lastName}</span>
                    </div>
                    {appointmentData.preferredDateTime && (
                      <div className="summary-item full-width">
                        <span className="summary-label">Scheduled</span>
                        <span className="summary-value">
                          {new Date(appointmentData.preferredDateTime).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  className="submit-btn-modern"
                  onClick={handleBookAppointment}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Booking...
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
