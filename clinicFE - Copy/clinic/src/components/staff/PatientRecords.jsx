import React, { useState, useEffect } from 'react';
import './PatientRecords.css';

const PatientRecords = () => {
  const [attendedAppointments, setAttendedAppointments] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchAttendedAppointments();
    fetchPatients();
    fetchServices();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [attendedAppointments, patients, services, searchTerm]);

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

  const filterRecords = () => {
    if (!patients.length || !services.length) return;

    let filtered = attendedAppointments.filter(record => {
      const patientName = getPatientName(record.patientId).toLowerCase();
      const patientEmail = getPatientEmail(record.patientId).toLowerCase();
      const serviceName = getServiceName(record.serviceId).toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return patientName.includes(search) || 
             patientEmail.includes(search) ||
             serviceName.includes(search) ||
             record.symptom.toLowerCase().includes(search);
    });

    // Sort by appointment date (most recent first)
    filtered.sort((a, b) => new Date(b.preferredDateTime) - new Date(a.preferredDateTime));

    setFilteredRecords(filtered);
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
    return service ? service.price : '0';
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecord(null);
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

  return (
    <div className="patient-records-container">
      <div className="records-header">
        <div className="header-content">
          <h1>Patient Records</h1>
          <p>View and manage completed patient appointments and medical records</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Records</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.thisMonth}</span>
            <span className="stat-label">This Month</span>
          </div>
          
        </div>
      </div>

      <div className="records-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by patient name, email, service, or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{
              border: '2px solid #000000',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '1rem',
              width: '100%',
              '--placeholder-color': 'rgba(0, 0, 0, 0.5)'
            }}
          />
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading patient records...</div>
      ) : (
        <div className="records-content">
          {filteredRecords.length === 0 ? (
            <div className="no-records">
              <div className="no-records-icon">📋</div>
              <p>No patient records found matching your criteria.</p>
            </div>
          ) : (
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Service</th>
                    <th>Date Attended</th>
                    <th>Symptoms/Reason</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.acceptedAppointmentId}>
                      <td>
                        <div className="patient-info">
                          <span className="patient-name">{getPatientName(record.patientId)}</span>
                          <span className="patient-email">{getPatientEmail(record.patientId)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="service-info">
                          <span className="service-name">{getServiceName(record.serviceId)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-info">
                          <span className="date-primary">{formatDate(record.preferredDateTime)}</span>
                          <span className="time-secondary">
                            {new Date(record.preferredDateTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="symptoms-preview">
                          {record.symptom.length > 50 
                            ? `${record.symptom.substring(0, 50)}...` 
                            : record.symptom}
                        </div>
                      </td>
                      <td>
                        <span className="price-badge">₱{getServicePrice(record.serviceId)}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view-btn"
                            onClick={() => handleViewDetails(record)}
                            title="View Details"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Detail Modal */}
      {isDetailModalOpen && selectedRecord && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="record-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetailModal}>×</button>
            
            <div className="modal-header">
              <h3>Patient Record Details</h3>
              <span className="record-id">Record ID: #{selectedRecord.acceptedAppointmentId}</span>
            </div>

            <div className="modal-body">
              <div className="record-detail">
                <div className="detail-section">
                  <h4>Patient Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Name:</strong> {getPatientName(selectedRecord.patientId)}
                    </div>
                    <div className="detail-item">
                      <strong>Email:</strong> {getPatientEmail(selectedRecord.patientId)}
                    </div>
                    <div className="detail-item">
                      <strong>Phone:</strong> {getPatientPhone(selectedRecord.patientId)}
                    </div>
                    <div className="detail-item">
                      <strong>Age:</strong> {calculateAge(getPatientDetails(selectedRecord.patientId).dateOfBirth)} years old
                    </div>
                    <div className="detail-item">
                      <strong>Patient ID:</strong> #{selectedRecord.patientId}
                    </div>
                    <div className="detail-item">
                      <strong>Date of Birth:</strong> {getPatientDetails(selectedRecord.patientId).dateOfBirth ? 
                        formatDate(getPatientDetails(selectedRecord.patientId).dateOfBirth) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Appointment Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Service:</strong> {getServiceName(selectedRecord.serviceId)}
                    </div>
                    <div className="detail-item">
                      <strong>Price:</strong> ₱{getServicePrice(selectedRecord.serviceId)}
                    </div>
                    <div className="detail-item">
                      <strong>Date & Time:</strong> {formatDateTime(selectedRecord.preferredDateTime)}
                    </div>
                    <div className="detail-item">
                      <strong>Original Appointment ID:</strong> #{selectedRecord.appointmentId}
                    </div>
                    <div className="detail-item">
                      <strong>Accepted on:</strong> {formatDateTime(selectedRecord.createdAt)}
                    </div>
                    <div className="detail-item">
                      <strong>Status:</strong> <span className="status-attended">Attended</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Medical Information</h4>
                  <div className="symptoms-full">
                    <strong>Symptoms/Reason for Visit:</strong>
                    <div className="symptoms-content">
                      <p>{selectedRecord.symptom}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Emergency Contact</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Contact Name:</strong> {getPatientDetails(selectedRecord.patientId).emergencyContactName || 'N/A'}
                    </div>
                    <div className="detail-item">
                      <strong>Relationship:</strong> {getPatientDetails(selectedRecord.patientId).emergencyContactRelationship || 'N/A'}
                    </div>
                    <div className="detail-item">
                      <strong>Phone:</strong> {getPatientDetails(selectedRecord.patientId).emergencyContactPhone1 || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="action-btn close-btn" onClick={closeDetailModal}>
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

export default PatientRecords;
