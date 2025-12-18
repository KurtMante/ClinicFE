import React, { useState, useEffect } from 'react';
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
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState(null);

  // Only keep the walk-in list modal state
  const [isWalkInListModalOpen, setIsWalkInListModalOpen] = useState(false);

  useEffect(() => {
    const staffData = localStorage.getItem('staff');
    const rememberMeStaff = localStorage.getItem('rememberMeStaff');
    if (staffData) {
      try {
        const parsedData = JSON.parse(staffData);
        setStaff(parsedData);
      } catch (error) {
        console.error('Error parsing staff data:', error);
        if (rememberMeStaff !== 'true') {
          localStorage.removeItem('staff');
          localStorage.removeItem('rememberMeStaff');
          onNavigate('home');
        }
      }
    } else {
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

  useEffect(() => {
    fetchSchedule();
  }, []);

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

  const handleSectionChange = (section, data = null) => {
    setActiveSection(section);
    if (data) {
      setCalendarData(data);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staff');
    localStorage.removeItem('rememberMeStaff');
    onLogout();
    onNavigate('home');
  };

  // Only keep the walk-in list modal open/close functions
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'calendar' && (
            <AppointmentCalendar rescheduleData={calendarData} />
          )}

          {activeSection === 'appointments' && (
            <AppointmentManagement onNavigateToCalendar={handleSectionChange} />
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;

