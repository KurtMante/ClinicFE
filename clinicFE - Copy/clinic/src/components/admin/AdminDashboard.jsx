import React, { useState, useEffect } from 'react';
import FeedbackManagement from '../staff/FeedbackManagement';
import PatientRecords from '../staff/PatientRecords';
import ServiceManagement from './ServiceManagement';
import StaffManagement from './StaffManagement';
import AppointmentManagement from '../staff/AppointmentManagement';
import AdminProfile from './AdminProfile';
import './AdminDashboard.css';

const AdminDashboard = ({ onNavigate, onLogout }) => {
  const [admin, setAdmin] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    ongoingAppointments: 0,
    completedAppointments: 0,
    totalWalkIns: 0,
    totalPatients: 0,
    totalStaff: 0
  });
  const [appointments, setAppointments] = useState([]);
  const [acceptedAppointments, setAcceptedAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [walkInPatients, setWalkInPatients] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
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
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      try {
        const parsedData = JSON.parse(adminData);
        setAdmin(parsedData);
      } catch (error) {
        console.error('Error parsing admin data:', error);
        // Clear invalid data and redirect to home
        localStorage.removeItem('admin');
        localStorage.removeItem('rememberMeAdmin');
        onNavigate('home');
      }
    } else {
      // No admin data found, redirect to home
      onNavigate('home');
    }
  }, [onNavigate]);

  useEffect(() => {
    if (admin) {
      fetchDashboardData();
    }
  }, [admin]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchAcceptedAppointments(),
        fetchServices(),
        fetchWalkInPatients(),
        fetchAllPatients(),
        fetchAllStaff()
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

  const fetchAllPatients = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/patients');
      if (response.ok) {
        const data = await response.json();
        setAllPatients(data);
        setStats(prev => ({
          ...prev,
          totalPatients: data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching all patients:', error);
    }
  };

  const fetchAllStaff = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/staff');
      if (response.ok) {
        const data = await response.json();
        setAllStaff(data);
        setStats(prev => ({
          ...prev,
          totalStaff: data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching all staff:', error);
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
    localStorage.removeItem('admin');
    localStorage.removeItem('rememberMeAdmin');
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
        !walkInFormData.phone.trim() || !walkInFormData.dateOfBirth) {
      setWalkInMessage('Please fill in all required fields');
      return;
    }

    setIsRegistering(true);
    setWalkInMessage('');

    try {
      // Generate a temporary password for walk-in patients
      const tempPassword = `walkin${Date.now().toString().slice(-4)}`;
      
      const registrationData = {
        ...walkInFormData,
        password: tempPassword,
        role: 'Walkin', // Override role to 'Walkin' for walk-in patients
        // Set default email if not provided
        email: walkInFormData.email || `${walkInFormData.firstName.toLowerCase()}.${walkInFormData.lastName.toLowerCase()}@walkin.temp`
      };

      const response = await fetch('http://localhost:3000/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (response.ok) {
        setWalkInMessage(`Walk-in patient registered successfully! Temporary password: ${tempPassword}`);
        // Refresh walk-in patients data
        fetchWalkInPatients();
        fetchAllPatients();
        
        // Clear form after successful registration
        setTimeout(() => {
          closeWalkInModal();
        }, 3000);
      } else {
        setWalkInMessage(data.error || 'Failed to register walk-in patient');
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

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!admin) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const mostBookedService = getMostBookedService();

  return (
    <div className="admin-dashboard-container">
      {/* Header */}
      <header className="admin-dashboard-header">
        <div className="header-left">
          <div className="clinic-logo">🏥</div>
          <h1>Wahing Medical Clinic - Admin Dashboard</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          LOG-OUT
        </button>
      </header>

      <div className="admin-dashboard-content">
        {/* Sidebar */}
        <aside className="admin-sidebar">
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
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
              onClick={() => handleSectionChange('services')}
            >
              Service Management
            </button>
            <button 
              className={`nav-item ${activeSection === 'staff' ? 'active' : ''}`}
              onClick={() => handleSectionChange('staff')}
            >
              Staff Management
            </button>
            <button 
              className={`nav-item ${activeSection === 'appointments' ? 'active' : ''}`}
              onClick={() => handleSectionChange('appointments')}
            >
              Appointment Logs
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
            <button 
              className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
              onClick={() => handleSectionChange('settings')}
            >
              Account Settings
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-main-content">
          {activeSection === 'dashboard' && (
            <div className="dashboard-section">
              {/* Welcome Header */}
              <div className="welcome-header">
                <div className="welcome-info">
                  <h2>Hi, {admin.firstName} {admin.lastName}!</h2>
                  <p>Logged in as <span className="admin-role">Administrator</span></p>
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
                      
                    </div>
                  </div>
                </div>

                <div className="stat-card system-card">
                  <h3>System Overview</h3>
                  <div className="system-info">
                    <div className="system-stat">
                      <span className="system-label">Total Patients:</span>
                      <span className="system-number">{stats.totalPatients}</span>
                    </div>
                    <div className="system-stat">
                      <span className="system-label">Total Staff:</span>
                      <span className="system-number">{stats.totalStaff}</span>
                    </div>
                    <div className="system-stat">
                      <span className="system-label">Total Services:</span>
                      <span className="system-number">{services.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'services' && (
            <ServiceManagement />
          )}

          {activeSection === 'staff' && (
            <StaffManagement />
          )}

          {activeSection === 'appointments' && (
            <AppointmentManagement isAdminView={true} />
          )}

          {activeSection === 'feedback' && (
            <FeedbackManagement />
          )}

          {activeSection === 'records' && (
            <PatientRecords />
          )}

          {activeSection === 'settings' && (
            <AdminProfile admin={admin} />
          )}

          {/* Placeholder sections */}
          {activeSection !== 'dashboard' && activeSection !== 'services' && 
           activeSection !== 'staff' && activeSection !== 'appointments' && 
           activeSection !== 'feedback' && activeSection !== 'records' && 
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
                        <th>Services</th> {/* Added column */}
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
                          <td>
                            {
                              // Find all appointments for this patient
                              appointments
                                .filter(apt => apt.patientId === patient.patientId)
                                .map(apt => {
                                  const service = services.find(s => s.serviceId === apt.serviceId);
                                  return service ? service.serviceName : 'Unknown';
                                })
                                .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
                                .join(', ') || <span className="service-tag">N/A</span>
                            }
                          </td>
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

export default AdminDashboard;
