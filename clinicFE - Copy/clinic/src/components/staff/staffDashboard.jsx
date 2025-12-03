import React, { useState, useEffect } from 'react';
import AppointmentManagement from './AppointmentManagement';
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
  const [isLoading, setIsLoading] = useState(false);

  // Walk-in patient registration modal state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isWalkInListModalOpen, setIsWalkInListModalOpen] = useState(false);
  const [walkInFormData, setWalkInFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    serviceId: '', // Add service selection
    symptom: '', // Add symptom/reason field
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
          onNavigate('home');
        }
      }
    } else {
      // Only redirect to home if remember me is not set
      if (rememberMeStaff !== 'true') {
        onNavigate('home');
      }
    }
  }, [onNavigate]);

  useEffect(() => {
    if (staff) {
      fetchDashboardData();
    }
  }, [staff]);

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

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const handleLogout = () => {
    localStorage.removeItem('staff');
    localStorage.removeItem('rememberMeStaff');
    onLogout();
    onNavigate('home');
  };

  const openWalkInModal = () => {
    setIsWalkInModalOpen(true);
    setWalkInMessage('');
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
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone1: '',
      emergencyContactPhone2: '',
      streetAddress: '',
      barangay: '',
      municipality: ''
    });
    setWalkInMessage('');
  };

  const handleWalkInInputChange = (e) => {
    const { name, value } = e.target;
    setWalkInFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWalkInRegistration = async () => {
    // Basic validation
    if (!walkInFormData.firstName.trim() || !walkInFormData.lastName.trim() || 
        !walkInFormData.phone.trim() || !walkInFormData.dateOfBirth || 
        !walkInFormData.serviceId) {
      setWalkInMessage('Please fill in all required fields including service selection');
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
        // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const mysqlDateTime = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + ' ' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0') + ':' +
          String(now.getSeconds()).padStart(2, '0');

        // Now create an appointment for the walk-in patient
        const appointmentData = {
          patientId: patientData.patientId,
          serviceId: parseInt(walkInFormData.serviceId),
          preferredDateTime: mysqlDateTime,
          symptom: walkInFormData.symptom || 'Walk-in consultation',
          status: 'Pending',
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
          setWalkInMessage(`Walk-in patient registered successfully!\nService: ${selectedService?.serviceName || 'Unknown'}\nTemporary password: ${tempPassword}`);
        } else {
          const errorData = await appointmentResponse.json();
          setWalkInMessage(`Patient registered but appointment creation failed: ${errorData.error || 'Unknown error'}. Temporary password: ${tempPassword}`);
        }

        // Refresh data
        fetchWalkInPatients();
        fetchAppointments();
        
        // Clear form after successful registration
        setTimeout(() => {
          closeWalkInModal();
        }, 4000);
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
        <aside className="staff-sidebar">
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
          </nav>
          
          <div className="sidebar-separator"></div>
          
          <div className="sidebar-footer">
            <h3>Others</h3>
            <button 
              className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
              onClick={() => handleSectionChange('settings')}
            >
              Account Settings
            </button>
          </div>
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
                        onClick={openWalkInModal}
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

          {activeSection === 'appointments' && (
            <AppointmentManagement />
          )}

          {activeSection === 'schedule' && (
            <DoctorSchedule />
          )}

          {activeSection === 'feedback' && (
            <FeedbackManagement />
          )}

          {activeSection === 'messages' && (
            <MessagesReminders />
          )}

          {activeSection === 'records' && (
            <PatientRecords />
          )}

          {activeSection === 'settings' && (
            <StaffProfile staff={staff} />
          )}

          {/* Placeholder sections */}
          {activeSection !== 'dashboard' && activeSection !== 'appointments' && 
           activeSection !== 'schedule' && activeSection !== 'feedback' && 
           activeSection !== 'messages' && activeSection !== 'records' && 
           activeSection !== 'settings' && (
            <div className="section-placeholder">
              <h2>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section</h2>
              <p>This section will be implemented based on your requirements.</p>
            </div>
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
                  {walkInMessage}
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

