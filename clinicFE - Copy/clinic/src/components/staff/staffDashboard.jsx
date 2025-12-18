import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppointmentManagement from './AppointmentManagement';
import AppointmentCalendar from './AppointmentCalendar';
import DoctorSchedule from './DoctorSchedule';
import FeedbackManagement from './FeedbackManagement';
import MessagesReminders from './MessagesReminders';
import PatientRecords from './PatientRecords';
import StaffProfile from './StaffProfile';
import './StaffDashboard.css';

const StaffDashboard = ({ onNavigate, onLogout }) => {
  const [staff, setStaff] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    ongoingAppointments: 0,
    completedAppointments: 0,
    totalWalkIns: 0
  });
  const [appointments, setAppointments] = useState([]);
  const [acceptedAppointments, setAcceptedAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [walkInPatients, setWalkInPatients] = useState([]);
  const [schedule, setSchedule] = useState([]); // Add this state
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState(null);

  // Walk-in patient registration modal state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isWalkInListModalOpen, setIsWalkInListModalOpen] = useState(false);
  const [walkInFormData, setWalkInFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    serviceId: '',
    symptom: '',
    appointmentDate: '',
    appointmentTime: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone1: '',
    emergencyContactPhone2: '',
    streetAddress: '',
    barangay: '',
    municipality: ''
  });
  const [walkInMessage, setWalkInMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState({
    dashboard: 0,
    calendar: 0,
    appointments: 0,
    schedule: 0,
    feedback: 0,
    messages: 0,
    records: 0,
    settings: 0,
  });

  const { section } = useParams();
  const navigate = useNavigate();

  // Helper to navigate to a page or fallback to react-router navigation
  const safeNavigate = (pageOrPath) => {
    if (typeof onNavigate === 'function') {
      onNavigate(pageOrPath);
    } else {
      // Fallback: if passed a known string, map to path, else use as path
      let path = '/';
      switch (pageOrPath) {
        case 'home':
          path = '/';
          break;
        case 'dashboard':
          path = '/dashboard';
          break;
        case 'staffDashboard':
          path = '/staff-dashboard';
          break;
        default:
          // If it's a route section, use /staff/:section
          if (typeof pageOrPath === 'string' && pageOrPath.startsWith('staff/')) {
            path = `/${pageOrPath}`;
          } else {
            path = '/';
          }
      }
      navigate(path);
    }
  };

  const refreshSection = useCallback((section) => {
    setRefreshKeys(prev => ({
      ...prev,
      [section]: prev[section] + 1
    }));
  }, []);

  // Sync section from URL param
  useEffect(() => {
    setActiveSection(section || 'dashboard');
  }, [section]);

  useEffect(() => {
    const staffData = localStorage.getItem('staff');
    const rememberMeStaff = localStorage.getItem('rememberMeStaff');
    
    if (staffData) {
      try {
        const parsedData = JSON.parse(staffData);
        setStaff(parsedData);
      } catch (error) {
        console.error('Error parsing staff data:', error);
        // Only clear data and redirect if remember me is not set
        if (rememberMeStaff !== 'true') {
          localStorage.removeItem('staff');
          localStorage.removeItem('rememberMeStaff');
          safeNavigate('home');
        }
      }
    } else {
      // Only redirect to home if remember me is not set
      if (rememberMeStaff !== 'true') {
        safeNavigate('home');
      }
    }
  }, [onNavigate]);

  useEffect(() => {
    if (staff) {
      fetchDashboardData();
    }
  }, [staff]);

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Only fetch dashboard data when dashboard section is shown
  useEffect(() => {
    if (activeSection === 'dashboard' && staff) {
      fetchDashboardData();
    }
  }, [activeSection, staff, refreshKeys.dashboard]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchAcceptedAppointments(),
        fetchServices(),
        fetchWalkInPatients()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
        calculateAppointmentStats(data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchAcceptedAppointments = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/accepted-appointments');
      if (response.ok) {
        const data = await response.json();
        setAcceptedAppointments(data);
        calculateAcceptedAppointmentStats(data);
      }
    } catch (error) {
      console.error('Error fetching accepted appointments:', error);
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

  const fetchWalkInPatients = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/patients');
      if (response.ok) {
        const data = await response.json();
        // Filter patients with role 'Walkin'
        const walkInData = data.filter(patient => patient.role === 'Walkin');
        setWalkInPatients(walkInData);
        
        // Calculate today's walk-ins
        const today = new Date().toDateString();
        const todayWalkIns = walkInData.filter(patient => 
          new Date(patient.createdAt).toDateString() === today
        );
        
        setStats(prev => ({
          ...prev,
          totalWalkIns: todayWalkIns.length
        }));
      }
    } catch (error) {
      console.error('Error fetching walk-in patients:', error);
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

  const calculateAppointmentStats = (appointmentData) => {
    const today = new Date().toDateString();
    const pendingAppointments = appointmentData.filter(apt => apt.status === 'Pending');
    const todayAppointments = appointmentData.filter(apt => 
      new Date(apt.preferredDateTime).toDateString() === today
    );

    setStats(prev => ({
      ...prev,
      upcomingAppointments: pendingAppointments.length,
      todayAppointments: todayAppointments.length
    }));
  };

  const calculateAcceptedAppointmentStats = (acceptedData) => {
    const ongoingAppointments = acceptedData.filter(apt => apt.isAttended === 0);
    const completedAppointments = acceptedData.filter(apt => apt.isAttended === 1);

    setStats(prev => ({
      ...prev,
      ongoingAppointments: ongoingAppointments.length,
      completedAppointments: completedAppointments.length
    }));
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.serviceId === serviceId);
    return service ? service.serviceName : 'Unknown Service';
  };

  const getMostBookedService = () => {
    if (appointments.length === 0) return { name: 'No data', count: 0 };
    
    const serviceCounts = {};
    appointments.forEach(apt => {
      const serviceName = getServiceName(apt.serviceId);
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    });

    const mostBooked = Object.entries(serviceCounts).reduce((a, b) => 
      serviceCounts[a[0]] > serviceCounts[b[0]] ? a : b
    );

    return { name: mostBooked[0], count: mostBooked[1] };
  };

  const clearCalendarReschedule = () => {
    setCalendarData(null);
  };

  const handleSectionChange = (section, data = null) => {
    if (activeSection === 'calendar' && section !== 'calendar') {
      setCalendarData(null);
    }
    navigate(`/staff/${section}`);
    if (data) {
      setCalendarData(data);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staff');
    localStorage.removeItem('rememberMeStaff');
    if (typeof onLogout === 'function') {
      onLogout();
    }
    safeNavigate('home');
  };

  // Get current date and time for default values
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const getMinDate = () => {
    return getCurrentDate();
  };

  const openWalkInModal = () => {
    setIsWalkInModalOpen(true);
    setWalkInMessage('');
    // Set default date and time to current
    setWalkInFormData(prev => ({
      ...prev,
      appointmentDate: getCurrentDate(),
      appointmentTime: getCurrentTime()
    }));
  };

  const closeWalkInModal = () => {
    setIsWalkInModalOpen(false);
    setWalkInFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      serviceId: '',
      symptom: '',
      appointmentDate: '',
      appointmentTime: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone1: '',
      emergencyContactPhone2: '',
      streetAddress: '',
      barangay: '',
      municipality: ''
    });
    setWalkInMessage('');
    fetchWalkInPatients();
    fetchAppointments();
    refreshSection('dashboard');
    // If you want to refresh other sections, call refreshSection('appointments'), etc.
  };

  const handleWalkInInputChange = (e) => {
    const { name, value } = e.target;
    setWalkInFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getWeekday = (dateStr) => {
    return new Date(dateStr).getDay();
  };

  const checkDoctorAvailability = () => {
    if (!walkInFormData.appointmentDate || !walkInFormData.appointmentTime || schedule.length === 0) {
      return { available: true, reason: '' };
    }
    const weekday = getWeekday(walkInFormData.appointmentDate);
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
      const start = toMinutes(sched.startTime); // <-- FIXED
      const end = toMinutes(sched.endTime);     // <-- FIXED
      const selected = toMinutes(walkInFormData.appointmentTime + ':00');
      if (start === null || end === null) return { available: false, reason: 'No time window set for this day.' };
      if (selected === null) return { available: false, reason: 'Invalid appointment time.' };
      if (selected < start) return { available: false, reason: `Selected time is before doctor's available hours (${sched.startTime} - ${sched.endTime}).` };
      if (selected > end) return { available: false, reason: `Selected time is after doctor's available hours (${sched.startTime} - ${sched.endTime}).` };
      return { available: true, reason: '' };
    }
    return { available: true, reason: '' };
  };

  const doctorAvailability = checkDoctorAvailability();

  const handleWalkInRegistration = async () => {
    // Basic validation
    if (!walkInFormData.firstName.trim() || !walkInFormData.lastName.trim() || 
        !walkInFormData.phone.trim() || !walkInFormData.dateOfBirth || 
        !walkInFormData.serviceId || !walkInFormData.appointmentDate || 
        !walkInFormData.appointmentTime) {
      setWalkInMessage('Please fill in all required fields including date and time');
      return;
    }

    // Doctor availability check
    if (!doctorAvailability.available) {
      setWalkInMessage(`Doctor is unavailable for the selected date/time. Reason: ${doctorAvailability.reason}`);
      return;
    }

    setIsRegistering(true);
    setWalkInMessage('');

    try {
      // Generate a temporary password for walk-in patients
      const tempPassword = `walkin${Date.now().toString().slice(-4)}`;
      
      const registrationData = {
        firstName: walkInFormData.firstName,
        lastName: walkInFormData.lastName,
        email: walkInFormData.email || `${walkInFormData.firstName.toLowerCase()}.${walkInFormData.lastName.toLowerCase()}@walkin.temp`,
        phone: walkInFormData.phone,
        dateOfBirth: walkInFormData.dateOfBirth,
        password: tempPassword,
        role: 'Walkin',
        emergencyContactName: walkInFormData.emergencyContactName,
        emergencyContactRelationship: walkInFormData.emergencyContactRelationship,
        emergencyContactPhone1: walkInFormData.emergencyContactPhone1,
        emergencyContactPhone2: walkInFormData.emergencyContactPhone2,
        streetAddress: walkInFormData.streetAddress,
        barangay: walkInFormData.barangay,
        municipality: walkInFormData.municipality
      };

      // First, register the patient
      const patientResponse = await fetch('http://localhost:3000/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const patientData = await patientResponse.json();

      if (patientResponse.ok) {
        // Combine date and time into MySQL datetime format
        const appointmentDateTime = `${walkInFormData.appointmentDate} ${walkInFormData.appointmentTime}:00`;

        // Now create an appointment for the walk-in patient
        const appointmentData = {
          patientId: patientData.patientId,
          serviceId: parseInt(walkInFormData.serviceId),
          preferredDateTime: appointmentDateTime,
          symptom: walkInFormData.symptom || 'Walk-in consultation',
          status: 'Accepted',
          isWalkIn: true  // Flag to identify walk-in appointments
        };

        const appointmentResponse = await fetch('http://localhost:3000/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appointmentData),
        });

        if (appointmentResponse.ok) {
          const selectedService = services.find(s => s.serviceId === parseInt(walkInFormData.serviceId));
          const formattedDate = new Date(walkInFormData.appointmentDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const formattedTime = new Date(`2000-01-01T${walkInFormData.appointmentTime}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          setWalkInMessage(`Walk-in patient registered successfully!\n\n📅 Date: ${formattedDate}\n⏰ Time: ${formattedTime}\n🩺 Service: ${selectedService?.serviceName || 'Unknown'}\n🔑 Temporary password: ${tempPassword}`);
        } else {
          const errorData = await appointmentResponse.json();
          setWalkInMessage(`Patient registered but appointment creation failed: ${errorData.error || 'Unknown error'}. Temporary password: ${tempPassword}`);
        }

        // Remove these lines (handled in closeWalkInModal)
        // fetchWalkInPatients();
        // fetchAppointments();

        // Clear form after successful registration
        setTimeout(() => {
          closeWalkInModal();
        }, 5000);
      } else {
        setWalkInMessage(patientData.error || 'Failed to register walk-in patient');
      }
    } catch (error) {
      setWalkInMessage('Unable to register patient. Please try again later.');
      console.error('Error:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const openWalkInListModal = () => {
    setIsWalkInListModalOpen(true);
  };

  const closeWalkInListModal = () => {
    setIsWalkInListModalOpen(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!staff) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const mostBookedService = getMostBookedService();

  return (
    <div className="staff-dashboard-container">
      {/* Header */}
      <header className="staff-dashboard-header">
        <div className="header-left">
          <div className="clinic-logo">🏥</div>
          <h1>Wahing Medical Clinic - Staff Dashboard</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          LOG-OUT
        </button>
      </header>

      <div className="staff-dashboard-content">
        {/* Sidebar */}
        <aside className="staff-sidebar" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
          <div className="sidebar-header">
            <h3>Main Menu</h3>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleSectionChange('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-item ${activeSection === 'calendar' ? 'active' : ''}`}
              onClick={() => handleSectionChange('calendar')}
            >
              📅 Calendar
            </button>
            <button 
              className={`nav-item ${activeSection === 'appointments' ? 'active' : ''}`}
              onClick={() => handleSectionChange('appointments')}
            >
              Manage Appointments
            </button>
            <button 
              className={`nav-item ${activeSection === 'messages' ? 'active' : ''}`}
              onClick={() => handleSectionChange('messages')}
            >
              Messages/Reminders
            </button>
            <button 
              className={`nav-item ${activeSection === 'schedule' ? 'active' : ''}`}
              onClick={() => handleSectionChange('schedule')}
            >
              Manage Doctor Schedule
            </button>
            <button 
              className={`nav-item ${activeSection === 'feedback' ? 'active' : ''}`}
              onClick={() => handleSectionChange('feedback')}
            >
              Feedback
            </button>
            <button 
              className={`nav-item ${activeSection === 'records' ? 'active' : ''}`}
              onClick={() => handleSectionChange('records')}
            >
              Patient's Record
            </button>
            {/* Account Settings directly below Patient's Record */}
            <button 
              className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
              onClick={() => handleSectionChange('settings')}
              style={{ marginTop: '2rem' }}
            >
              Account Settings
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="staff-main-content">
          {activeSection === 'dashboard' && (
            <div className="dashboard-section">
              {/* Welcome Header */}
              <div className="welcome-header">
                <div className="welcome-info">
                  <h2>Hi, {staff.firstName} {staff.lastName}!</h2>
                  <p>Logged in as <span className="staff-role">Staff</span></p>
                </div>
              </div>

              {/* Dashboard Stats */}
              <div className="dashboard-stats">
                <div className="stat-card today-card">
                  <h3>Today</h3>
                  <div className="stat-number">{stats.todayAppointments}</div>
                  <p className="stat-label">Appointments</p>
                  <div className="stat-details">
                    <div className="stat-detail">
                      <span className="status-indicator ongoing"></span>
                      <span>Ongoing Appointments: {stats.ongoingAppointments}</span>
                    </div>
                    <div className="stat-detail">
                      <span className="status-indicator upcoming"></span>
                      <span>Upcoming Appointments: {stats.upcomingAppointments}</span>
                    </div>
                    <div className="stat-detail">
                      <span className="status-indicator completed"></span>
                      <span>Completed Appointments: {stats.completedAppointments}</span>
                    </div>
                  </div>
                </div>

                <div className="stat-card service-card">
                  <h3>Most Booked Service</h3>
                  <div className="service-info">
                    <div className="service-name">{mostBookedService.name}</div>
                    <div className="service-count">Bookings: {mostBookedService.count}</div>
                  </div>
                </div>

                <div className="stat-card walkin-card">
                  <h3>Walk-in Patients</h3>
                  <div className="walkin-info">
                    <div className="walkin-count">Today: {stats.totalWalkIns}</div>
                    <div className="walkin-actions">
                      <button 
                        className="view-walkin-btn"
                        onClick={openWalkInListModal}
                        title="View All Walk-in Patients"
                      >
                        View All
                      </button>
                      <button 
                        className="register-walkin-btn"
                        // onClick={openWalkInModal}
                        onClick={() => handleSectionChange('calendar')}
                        title="Register Walk-in Patient"
                      >
                        + Add Patient
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'calendar' && (
            <AppointmentCalendar
              rescheduleData={calendarData}
              refreshKey={refreshKeys.calendar}
              onRecordAdded={() => refreshSection('calendar')}
              onClearReschedule={clearCalendarReschedule}
            />
          )}

          {activeSection === 'appointments' && (
            <AppointmentManagement
              onNavigateToCalendar={handleSectionChange}
              refreshKey={refreshKeys.appointments}
              onRecordAdded={() => refreshSection('appointments')}
            />
          )}

          {activeSection === 'schedule' && (
            <DoctorSchedule
              refreshKey={refreshKeys.schedule}
              onRecordAdded={() => refreshSection('schedule')}
            />
          )}

          {activeSection === 'feedback' && (
            <FeedbackManagement
              refreshKey={refreshKeys.feedback}
              onRecordAdded={() => refreshSection('feedback')}
            />
          )}

          {activeSection === 'messages' && (
            <MessagesReminders
              refreshKey={refreshKeys.messages}
              onRecordAdded={() => refreshSection('messages')}
            />
          )}

          {activeSection === 'records' && (
            <PatientRecords
              refreshKey={refreshKeys.records}
              onRecordAdded={() => refreshSection('records')}
            />
          )}

          {activeSection === 'settings' && (
            <StaffProfile
              staff={staff}
              refreshKey={refreshKeys.settings}
              onRecordAdded={() => refreshSection('settings')}
            />
          )}
        </main>
      </div>

      {/* Walk-in Patients List Modal */}
      {isWalkInListModalOpen && (
        <div className="modal-overlay" onClick={closeWalkInListModal}>
          <div className="walkin-list-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeWalkInListModal}>×</button>
            
            <div className="modal-header">
              <h3>Walk-in Patients</h3>
              <p>Total walk-in patients: {walkInPatients.length}</p>
            </div>

            <div className="modal-body">
              {walkInPatients.length === 0 ? (
                <div className="no-patients">
                  <div className="no-patients-icon">👥</div>
                  <p>No walk-in patients found.</p>
                  <button 
                    className="register-walkin-btn"
                    onClick={() => {
                      closeWalkInListModal();
                      openWalkInModal();
                    }}
                  >
                    Register First Walk-in Patient
                  </button>
                </div>
              ) : (
                <div className="patients-table-container">
                  <table className="patients-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Registered On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walkInPatients.map((patient) => (
                        <tr key={patient.patientId}>
                          <td>
                            <div className="patient-name">
                              {patient.firstName} {patient.lastName}
                            </div>
                          </td>
                          <td>{patient.phone}</td>
                          <td>
                            <div className="patient-email">
                              {patient.email}
                            </div>
                          </td>
                          <td>{formatDateTime(patient.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-actions">
                <button className="action-btn close-btn" onClick={closeWalkInListModal}>
                  Close
                </button>
                <button 
                  className="action-btn register-btn"
                  onClick={() => {
                    closeWalkInListModal();
                    openWalkInModal();
                  }}
                >
                  Add New Walk-in Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Patient Registration Modal */}
      {isWalkInModalOpen && (
        <div className="modal-overlay" onClick={closeWalkInModal}>
          <div className="walkin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeWalkInModal}>×</button>
            
            <div className="modal-header">
              <h3>Register Walk-in Patient</h3>
              <p>Register a new patient for walk-in consultation</p>
            </div>

            <div className="modal-body">
              {walkInMessage && (
                <div className={`message ${walkInMessage.includes('successfully') ? 'success' : 'error'}`}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{walkInMessage}</pre>
                </div>
              )}

              <div className="walkin-form">
                <div className="form-section">
                  <h4>Personal Information</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="walkInFirstName">First Name *</label>
                      <input
                        type="text"
                        id="walkInFirstName"
                        name="firstName"
                        value={walkInFormData.firstName}
                        onChange={handleWalkInInputChange}
                        placeholder="Enter first name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="walkInLastName">Last Name *</label>
                      <input
                        type="text"
                        id="walkInLastName"
                        name="lastName"
                        value={walkInFormData.lastName}
                        onChange={handleWalkInInputChange}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="walkInPhone">Phone Number *</label>
                      <input
                        type="tel"
                        id="walkInPhone"
                        name="phone"
                        value={walkInFormData.phone}
                        onChange={handleWalkInInputChange}
                        placeholder="09123456789"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="walkInDateOfBirth">Date of Birth *</label>
                      <input
                        type="date"
                        id="walkInDateOfBirth"
                        name="dateOfBirth"
                        value={walkInFormData.dateOfBirth}
                        onChange={handleWalkInInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="walkInEmail">Email (Optional)</label>
                    <input
                      type="email"
                      id="walkInEmail"
                      name="email"
                      value={walkInFormData.email}
                      onChange={handleWalkInInputChange}
                      placeholder="patient@email.com"
                    />
                  </div>
                </div>

                {/* Appointment Date & Time Section */}
                <div className="form-section">
                  <h4>📅 Appointment Schedule</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="walkInAppointmentDate">Appointment Date *</label>
                      <input
                        type="date"
                        id="walkInAppointmentDate"
                        name="appointmentDate"
                        value={walkInFormData.appointmentDate}
                        onChange={handleWalkInInputChange}
                        min={getMinDate()}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="walkInAppointmentTime">Appointment Time *</label>
                      <input
                        type="time"
                        id="walkInAppointmentTime"
                        name="appointmentTime"
                        value={walkInFormData.appointmentTime}
                        onChange={handleWalkInInputChange}
                        required
                      />
                    </div>
                  </div>

                  {walkInFormData.appointmentDate && walkInFormData.appointmentTime && (
                    !doctorAvailability.available ? (
                      <div className="doctor-unavailable-message" style={{ color: 'red', marginBottom: '10px' }}>
                        Doctor is unavailable for the selected date/time.<br />
                        <strong>Reason:</strong> {doctorAvailability.reason}
                      </div>
                    ) : (
                      <div className="appointment-preview">
                        <span className="preview-icon">🗓️</span>
                        <div className="preview-content">
                          <span className="preview-label">Scheduled for:</span>
                          <span className="preview-value">
                            {new Date(walkInFormData.appointmentDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })} at {new Date(`2000-01-01T${walkInFormData.appointmentTime}`).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Service Selection Section */}
                <div className="form-section">
                  <h4>Service Selection</h4>
                  
                  <div className="form-group">
                    <label htmlFor="walkInService">Select Service *</label>
                    <select
                      id="walkInService"
                      name="serviceId"
                      value={walkInFormData.serviceId}
                      onChange={handleWalkInInputChange}
                      required
                      className="service-select"
                    >
                      <option value="">-- Select a Service --</option>
                      {services.map((service) => (
                        <option key={service.serviceId} value={service.serviceId}>
                          {service.serviceName} - ₱{service.price?.toLocaleString() || '0'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {walkInFormData.serviceId && (
                    <div className="selected-service-info">
                      {(() => {
                        const selectedService = services.find(s => s.serviceId === parseInt(walkInFormData.serviceId));
                        return selectedService ? (
                          <>
                            <div className="service-detail">
                              <span className="service-icon">🩺</span>
                              <div className="service-info">
                                <strong>{selectedService.serviceName}</strong>
                                <span className="service-price">Price: ₱{selectedService.price?.toLocaleString() || '0'}</span>
                              </div>
                            </div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="walkInSymptom">Symptoms / Reason for Visit</label>
                    <textarea
                      id="walkInSymptom"
                      name="symptom"
                      value={walkInFormData.symptom}
                      onChange={handleWalkInInputChange}
                      placeholder="Describe the patient's symptoms or reason for visit..."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4>Emergency Contact</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="walkInEmergencyName">Contact Name</label>
                      <input
                        type="text"
                        id="walkInEmergencyName"
                        name="emergencyContactName"
                        value={walkInFormData.emergencyContactName}
                        onChange={handleWalkInInputChange}
                        placeholder="Emergency contact name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="walkInEmergencyRelationship">Relationship</label>
                      <input
                        type="text"
                        id="walkInEmergencyRelationship"
                        name="emergencyContactRelationship"
                        value={walkInFormData.emergencyContactRelationship}
                        onChange={handleWalkInInputChange}
                        placeholder="Relationship"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="walkInEmergencyPhone">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      id="walkInEmergencyPhone"
                      name="emergencyContactPhone1"
                      value={walkInFormData.emergencyContactPhone1}
                      onChange={handleWalkInInputChange}
                      placeholder="09123456789"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4>Address (Optional)</h4>
                  
                  <div className="form-group">
                    <label htmlFor="walkInStreetAddress">Street Address</label>
                    <input
                      type="text"
                      id="walkInStreetAddress"
                      name="streetAddress"
                      value={walkInFormData.streetAddress}
                      onChange={handleWalkInInputChange}
                      placeholder="Complete street address"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="walkInBarangay">Barangay</label>
                      <input
                        type="text"
                        id="walkInBarangay"
                        name="barangay"
                        value={walkInFormData.barangay}
                        onChange={handleWalkInInputChange}
                        placeholder="Barangay"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="walkInMunicipality">Municipality</label>
                      <input
                        type="text"
                        id="walkInMunicipality"
                        name="municipality"
                        value={walkInFormData.municipality}
                        onChange={handleWalkInInputChange}
                        placeholder="Municipality"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="action-btn cancel-btn" onClick={closeWalkInModal}>
                    Cancel
                  </button>
                  <button 
                    className="action-btn register-btn"
                    onClick={handleWalkInRegistration}
                    disabled={isRegistering}
                  >
                    {isRegistering ? 'Registering...' : 'Register Patient'}
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

export default StaffDashboard;

