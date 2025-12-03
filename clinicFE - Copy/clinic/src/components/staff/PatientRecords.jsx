import React, { useState, useEffect } from 'react';
import './PatientRecords.css';

const PatientRecords = () => {
  const [attendedAppointments, setAttendedAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);

  useEffect(() => {
    fetchAttendedAppointments();
    fetchPatients();
    fetchServices();
  }, []);

  const fetchAttendedAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/accepted-appointments/attended');
      if (response.ok) {
        const data = await response.json();
        setAttendedAppointments(data);
      } else {
        setMessage('Failed to fetch patient records');
      }
    } catch (error) {
      setMessage('Error fetching patient records');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
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

  // Get unique patients who have attended appointments
  const getUniquePatients = () => {
    const patientIds = [...new Set(attendedAppointments.map(record => record.patientId))];
    
    return patientIds.map(patientId => {
      const patient = patients.find(p => p.patientId === patientId);
      const patientRecords = attendedAppointments.filter(r => r.patientId === patientId);
      const lastVisit = patientRecords.reduce((latest, record) => {
        return new Date(record.preferredDateTime) > new Date(latest.preferredDateTime) ? record : latest;
      }, patientRecords[0]);
      
      return {
        ...patient,
        patientId,
        totalVisits: patientRecords.length,
        lastVisitDate: lastVisit?.preferredDateTime,
        totalSpent: patientRecords.reduce((sum, record) => sum + (getServicePrice(record.serviceId) || 0), 0)
      };
    }).filter(patient => patient.firstName); // Filter out patients without data
  };

  // Filter patients based on search
  const getFilteredPatients = () => {
    const uniquePatients = getUniquePatients();
    
    if (!searchTerm) return uniquePatients;
    
    const search = searchTerm.toLowerCase();
    return uniquePatients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const email = (patient.email || '').toLowerCase();
      const phone = (patient.phone || '').toLowerCase();
      
      return fullName.includes(search) || email.includes(search) || phone.includes(search);
    });
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  const getPatientEmail = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? patient.email : 'N/A';
  };

  const getPatientPhone = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? patient.phone : 'N/A';
  };

  const getPatientDetails = (patientId) => {
    return patients.find(p => p.patientId === patientId) || {};
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.serviceId === serviceId);
    return service ? service.serviceName : 'Unknown Service';
  };

  const getServicePrice = (serviceId) => {
    const service = services.find(s => s.serviceId === serviceId);
    return service ? parseFloat(service.price) : 0;
  };

  const handleViewDetails = (patient) => {
    setSelectedPatient(patient);
    // Get all appointment history for this patient
    const history = attendedAppointments
      .filter(record => record.patientId === patient.patientId)
      .sort((a, b) => new Date(b.preferredDateTime) - new Date(a.preferredDateTime));
    setPatientHistory(history);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPatient(null);
    setPatientHistory([]);
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

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getRecordStats = () => {
    const total = attendedAppointments.length;
    const thisMonth = attendedAppointments.filter(record => {
      const recordDate = new Date(record.preferredDateTime);
      const currentDate = new Date();
      return recordDate.getMonth() === currentDate.getMonth() && 
             recordDate.getFullYear() === currentDate.getFullYear();
    }).length;

    const uniquePatients = new Set(attendedAppointments.map(record => record.patientId)).size;

    return { total, thisMonth, uniquePatients };
  };

  const stats = getRecordStats();
  const filteredPatients = getFilteredPatients();

  return (
    <div className="patient-records-modern">
      {/* Header Section */}
      <div className="records-header-modern">
        <div className="header-title">
          <h1>Patient Records</h1>
          <p>View patient profiles and their complete medical history</p>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <span className="stat-icon">👥</span>
            <div className="stat-info">
              <span className="stat-value">{stats.uniquePatients}</span>
              <span className="stat-label">Patients</span>
            </div>
          </div>
          <div className="stat-box highlight">
            <span className="stat-icon">📋</span>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Visits</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <span className="stat-value">{stats.thisMonth}</span>
              <span className="stat-label">This Month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="records-controls-modern">
        <div className="search-box-modern">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search patients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
          <span className="message-icon">{message.includes('successfully') ? '✓' : '⚠'}</span>
          {message}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="loading-modern">
          <div className="loading-spinner"></div>
          <p>Loading patient records...</p>
        </div>
      ) : (
        <div className="records-content-modern">
          {filteredPatients.length === 0 ? (
            <div className="no-records-modern">
              <div className="empty-illustration">
                <span>📋</span>
              </div>
              <h3>No Patient Records Found</h3>
              <p>No patients match your search criteria.</p>
            </div>
          ) : (
            <div className="patients-grid">
              {filteredPatients.map((patient) => (
                <div key={patient.patientId} className="patient-card-modern">
                  <div className="card-header-modern">
                    <div className="patient-avatar">
                      <span>{patient.firstName?.[0]}{patient.lastName?.[0]}</span>
                    </div>
                    <div className="patient-info-modern">
                      <h3>{patient.firstName} {patient.lastName}</h3>
                      <span className="patient-id">Patient ID: #{patient.patientId}</span>
                    </div>
                  </div>
                  
                  <div className="card-body-modern">
                    <div className="info-row">
                      <span className="info-icon">📧</span>
                      <span className="info-text">{patient.email || 'No email'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">📱</span>
                      <span className="info-text">{patient.phone || 'No phone'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-icon">🎂</span>
                      <span className="info-text">
                        {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} years old` : 'Age unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="card-stats-modern">
                    <div className="mini-stat">
                      <span className="mini-stat-value">{patient.totalVisits}</span>
                      <span className="mini-stat-label">Visits</span>
                    </div>
                    <div className="mini-stat">
                      <span className="mini-stat-value">₱{patient.totalSpent?.toLocaleString()}</span>
                      <span className="mini-stat-label">Total Spent</span>
                    </div>
                  </div>

                  <div className="card-footer-modern">
                    <div className="last-visit">
                      <span className="last-visit-label">Last Visit:</span>
                      <span className="last-visit-date">{formatDate(patient.lastVisitDate)}</span>
                    </div>
                    <button 
                      className="view-history-btn"
                      onClick={() => handleViewDetails(patient)}
                    >
                      <span>📋</span>
                      View History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patient History Modal */}
      {isDetailModalOpen && selectedPatient && (
        <div className="modal-overlay-modern" onClick={closeDetailModal}>
          <div className="patient-history-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeDetailModal}>×</button>
            
            {/* Modal Header */}
            <div className="modal-header-modern">
              <div className="modal-patient-info">
                <div className="modal-avatar">
                  <span>{selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}</span>
                </div>
                <div className="modal-patient-details">
                  <h2>{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                  <p>Patient ID: #{selectedPatient.patientId}</p>
                </div>
              </div>
              <div className="modal-stats">
                <div className="modal-stat">
                  <span className="modal-stat-value">{patientHistory.length}</span>
                  <span className="modal-stat-label">Total Visits</span>
                </div>
                <div className="modal-stat">
                  <span className="modal-stat-value">
                    ₱{patientHistory.reduce((sum, r) => sum + getServicePrice(r.serviceId), 0).toLocaleString()}
                  </span>
                  <span className="modal-stat-label">Total Spent</span>
                </div>
              </div>
            </div>

            <div className="modal-body-modern">
              {/* Patient Details Section */}
              <div className="patient-details-section">
                <h3>
                  <span>👤</span>
                  Patient Information
                </h3>
                <div className="details-grid">
                  <div className="detail-card">
                    <span className="detail-icon">📧</span>
                    <div className="detail-content">
                      <span className="detail-label">Email</span>
                      <span className="detail-value">{selectedPatient.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="detail-card">
                    <span className="detail-icon">📱</span>
                    <div className="detail-content">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{selectedPatient.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="detail-card">
                    <span className="detail-icon">🎂</span>
                    <div className="detail-content">
                      <span className="detail-label">Age</span>
                      <span className="detail-value">
                        {selectedPatient.dateOfBirth ? `${calculateAge(selectedPatient.dateOfBirth)} years old` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="detail-card">
                    <span className="detail-icon">📅</span>
                    <div className="detail-content">
                      <span className="detail-label">Date of Birth</span>
                      <span className="detail-value">
                        {selectedPatient.dateOfBirth ? formatDate(selectedPatient.dateOfBirth) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="emergency-contact-section">
                  <h4>
                    <span>🚨</span>
                    Emergency Contact
                  </h4>
                  <div className="emergency-details">
                    <div className="emergency-item">
                      <span className="emergency-label">Name:</span>
                      <span className="emergency-value">{selectedPatient.emergencyContactName || 'N/A'}</span>
                    </div>
                    <div className="emergency-item">
                      <span className="emergency-label">Relationship:</span>
                      <span className="emergency-value">{selectedPatient.emergencyContactRelationship || 'N/A'}</span>
                    </div>
                    <div className="emergency-item">
                      <span className="emergency-label">Phone:</span>
                      <span className="emergency-value">{selectedPatient.emergencyContactPhone1 || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment History Section */}
              <div className="history-section">
                <h3>
                  <span>📋</span>
                  Appointment History
                </h3>
                
                <div className="history-timeline">
                  {patientHistory.map((record, index) => (
                    <div key={record.acceptedAppointmentId} className="history-item">
                      <div className="timeline-marker">
                        <div className="marker-dot"></div>
                        {index < patientHistory.length - 1 && <div className="marker-line"></div>}
                      </div>
                      
                      <div className="history-card">
                        <div className="history-header">
                          <div className="history-service">
                            <span className="service-icon">🩺</span>
                            <span className="service-name">{getServiceName(record.serviceId)}</span>
                          </div>
                          <span className="history-price">₱{getServicePrice(record.serviceId).toLocaleString()}</span>
                        </div>
                        
                        <div className="history-date">
                          <span className="date-icon">📅</span>
                          <span>{formatDateTime(record.preferredDateTime)}</span>
                        </div>
                        
                        <div className="history-symptoms">
                          <div className="symptoms-header">
                            <span className="symptoms-icon">💬</span>
                            <span className="symptoms-label">Symptoms / Reason:</span>
                          </div>
                          <p className="symptoms-text">{record.symptom || 'No symptoms recorded'}</p>
                        </div>
                        
                        <div className="history-footer">
                          <span className="status-badge attended">
                            <span>✓</span>
                            Attended
                          </span>
                          <span className="record-id">Record #{record.acceptedAppointmentId}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer-modern">
              <button className="btn-close-modal" onClick={closeDetailModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecords;
