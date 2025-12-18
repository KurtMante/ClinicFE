import React, { useEffect, useState } from 'react';
import './StaffDashboard.css'; // Reuse the dashboard theme

const validConfirmations = ['Pending', 'Declined', 'Confirmed'];

const EmergencyReschedules = ({ onBack }) => {
  const [appointments, setAppointments] = useState([]);
  const [reschedules, setReschedules] = useState([]);
  const [services, setServices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({
    appointmentId: '',
    patientId: '',
    serviceId: '',
    notes: '',
    confirmation: 'Pending'
  });
  const [message, setMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchServices();
    fetchPatients();
    fetchReschedules();
  }, []);

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

  const fetchReschedules = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/reschedules');
      if (response.ok) {
        const data = await response.json();
        setReschedules(data);
      }
    } catch (error) {
      console.error('Error fetching reschedules:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAppointmentSelect = (e) => {
    const appointmentId = e.target.value;
    setForm(prev => ({
      ...prev,
      appointmentId
    }));
    // Optionally auto-fill patientId and serviceId
    const apt = appointments.find(a => String(a.appointmentId) === String(appointmentId));
    if (apt) {
      setForm(prev => ({
        ...prev,
        appointmentId,
        patientId: apt.patientId,
        serviceId: apt.serviceId
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsPosting(true);
    try {
      // Always set confirmation to 'Pending' on submit
      const submitData = { ...form, confirmation: 'Pending' };
      const response = await fetch('http://localhost:3000/api/reschedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      if (response.ok) {
        setMessage('Reschedule request submitted!');
        setForm({
          appointmentId: '',
          patientId: '',
          serviceId: '',
          notes: '',
          confirmation: 'Pending'
        });
        fetchReschedules();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to submit reschedule');
      }
    } catch (error) {
      setMessage('Network error');
    } finally {
      setIsPosting(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return '#888';
    if (status === 'Confirmed') return '#4caf50';
    if (status === 'Declined' || status === 'Rejected') return '#f44336';
    return '#ff9800';
  };

  // Back navigation handler
  const handleBack = () => {
    if (onBack) {
      onBack('dashboard');
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  // Sidebar navigation handler (reuse from staffDashboard)
  const handleSectionChange = (section) => {
    if (section === 'dashboard' && onBack) {
      onBack('dashboard');
    } else if (section === 'emergency-reschedules') {
      // Already here, do nothing
    } else {
      // For other sections, you can implement navigation as needed
      window.location.href = `/staff/${section}`;
    }
  };

  return (
    <div className="staff-dashboard-container">
      {/* Header */}
      <header className="staff-dashboard-header">
        <div className="header-left">
          <div className="clinic-logo">🏥</div>
          <h1>Wahing Medical Clinic - Staff Dashboard</h1>
        </div>
        <button className="logout-btn" onClick={() => { localStorage.removeItem('staff'); localStorage.removeItem('rememberMeStaff'); window.location.href = '/'; }}>
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
              className={`nav-item`}
              onClick={() => handleSectionChange('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-item`}
              onClick={() => handleSectionChange('calendar')}
            >
              📅 Calendar
            </button>
            <button
              className={`nav-item`}
              onClick={() => handleSectionChange('appointments')}
            >
              Manage Appointments
            </button>
            <button
              className={`nav-item`}
              onClick={() => handleSectionChange('messages')}
            >
              Messages/Reminders
            </button>
            <button
              className={`nav-item`}
              onClick={() => handleSectionChange('schedule')}
            >
              Manage Doctor Schedule
            </button>
            <button
              className={`nav-item`}
              onClick={() => handleSectionChange('feedback')}
            >
              Feedback
            </button>
            <button
              className={`nav-item`}
              onClick={() => handleSectionChange('records')}
            >
              Patient's Record
            </button>
            <button
              className={`nav-item active`}
              onClick={() => handleSectionChange('emergency-reschedules')}
            >
              🚨 Emergency Reschedules
            </button>
            <button
              className={`nav-item`}
              onClick={() => handleSectionChange('settings')}
              style={{ marginTop: '2rem' }}
            >
              Account Settings
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="staff-main-content">
          <div style={{
            padding: 0,
            background: '#f7f9fb',
            minHeight: '100%',
            borderRadius: 8,
            boxShadow: '0 1px 4px #0001'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              borderBottom: '1px solid #e0e0e0',
              padding: '12px 18px 6px 18px',
              background: '#fff',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8
            }}>
              <button
                onClick={onBack ? () => onBack('dashboard') : () => handleSectionChange('dashboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: '#234421', // changed from red
                  cursor: 'pointer',
                  marginRight: 8,
                  padding: 0,
                  lineHeight: 1
                }}
                title="Back to Dashboard"
              >
              </button>
              <h2 style={{ margin: 0, fontWeight: 700, color: '#234421', letterSpacing: 1, fontSize: 20 }}>
                Emergency Reschedules
              </h2>
              <button
                onClick={fetchReschedules}
                style={{
                  marginLeft: 'auto',
                  background: '#f5f5f5',
                  border: '1px solid #bbb',
                  borderRadius: 4,
                  padding: '2px 10px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14
                }}
                title="Refresh"
              >
                🔄
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              style={{
                margin: '12px auto 8px auto',
                background: '#fff',
                padding: '14px 14px 8px 14px',
                borderRadius: 8,
                boxShadow: '0 1px 4px #0001',
                maxWidth: 480,
                minWidth: 280
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', color: '#234421', fontWeight: 600, fontSize: 16 }}>Request Emergency Reschedule</h3>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                <label style={{ fontWeight: 500, minWidth: 100 }}>
                  Appointment:
                  <select
                    name="appointmentId"
                    value={form.appointmentId}
                    onChange={handleAppointmentSelect}
                    required
                    style={{ marginLeft: 8, minWidth: 140, padding: 3, borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    <option value="">-- Select Appointment --</option>
                    {appointments
                      .filter(apt => {
                        const patient = patients.find(p => p.patientId === apt.patientId);
                        return patient && patient.role !== 'Walkin'; // Exclude walk-ins by patient role
                      })
                      .map(apt => (
                        <option key={apt.appointmentId} value={apt.appointmentId}>
                          #{apt.appointmentId} - {patients.find(p => p.patientId === apt.patientId)?.firstName || 'Unknown'} {patients.find(p => p.patientId === apt.patientId)?.lastName || ''} ({services.find(s => s.serviceId === apt.serviceId)?.serviceName || 'Service'}) on {new Date(apt.preferredDateTime).toLocaleString()}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontWeight: 500 }}>
                  Notes:
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Reason for emergency reschedule"
                    rows={2}
                    style={{
                      width: '100%',
                      marginTop: 4,
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      padding: 5,
                      fontSize: 13,
                      resize: 'vertical'
                    }}
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isPosting}
                style={{
                  background: '#234421', // changed from red
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 12px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isPosting ? 'not-allowed' : 'pointer',
                  marginTop: 4,
                  width: '100%'
                }}
              >
                {isPosting ? 'Submitting...' : 'Submit Emergency Reschedule'}
              </button>
              {message && (
                <div style={{
                  marginTop: 6,
                  color: message.includes('submitted') ? '#388e3c' : '#234421', // changed error color to green
                  fontWeight: 500,
                  fontSize: 13
                }}>
                  {message}
                </div>
              )}
            </form>

            <div style={{
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 1px 4px #0001',
              padding: '8px 8px 2px 8px',
              margin: '0 auto 12px auto',
              maxWidth: 900
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#234421', fontWeight: 600, fontSize: 15 }}>All Emergency Reschedules</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: '#fff',
                  fontSize: 13
                }}>
                  <thead>
                    <tr style={{ background: '#f6f6f6' }}>
                      <th style={{ padding: 5, borderBottom: '1px solid #eee' }}>ID</th>
                      <th style={{ padding: 5, borderBottom: '1px solid #eee' }}>Appointment</th>
                      <th style={{ padding: 5, borderBottom: '1px solid #eee' }}>Patient</th>
                      <th style={{ padding: 5, borderBottom: '1px solid #eee' }}>Service</th>
                      <th style={{ padding: 5, borderBottom: '1px solid #eee' }}>Notes</th>
                      <th style={{ padding: 5, borderBottom: '1px solid #eee' }}>Confirmation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reschedules.map(r => (
                      <tr key={r.rescheduleId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: 5 }}>{r.rescheduleId}</td>
                        <td style={{ padding: 5 }}>
                          #{r.appointmentId} <br />
                          {appointments.find(a => a.appointmentId === r.appointmentId)
                            ? new Date(appointments.find(a => a.appointmentId === r.appointmentId).preferredDateTime).toLocaleString()
                            : ''}
                        </td>
                        <td style={{ padding: 5 }}>
                          {patients.find(p => p.patientId === r.patientId)?.firstName || 'Unknown'}{' '}
                          {patients.find(p => p.patientId === r.patientId)?.lastName || ''}
                        </td>
                        <td style={{ padding: 5 }}>
                          {services.find(s => s.serviceId === r.serviceId)?.serviceName || ''}
                        </td>
                        <td style={{ padding: 5 }}>{r.notes}</td>
                        <td style={{
                          padding: 5,
                          fontWeight: 600,
                          color: getStatusColor(r.confirmation),
                          letterSpacing: 1
                        }}>
                          {r.confirmation}
                        </td>
                      </tr>
                    ))}
                    {reschedules.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 10 }}>
                          No emergency reschedules found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmergencyReschedules;
