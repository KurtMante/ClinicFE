import React, { useState, useEffect } from 'react';
import './MessagesReminders.css';

const MessagesReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [newReminder, setNewReminder] = useState({
    patientId: '',
    reminderType: 'Appointment',
    reminderDate: '',
    reminderTime: '',
    message: '',
    isRead: false
  });

  useEffect(() => {
    fetchReminders();
    fetchPatients();
  }, []);

  useEffect(() => {
    filterReminders();
  }, [reminders, searchTerm]);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/reminders');
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      } else {
        setMessage('Failed to fetch reminders');
      }
    } catch (error) {
      setMessage('Error fetching reminders');
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

  // Utility to combine date and time to ISO "YYYY-MM-DDTHH:mm:ss"
  const combineDateTime = (date, time) => {
    if (!date || !time) return '';
    const timeString = time.length === 5 ? `${time}:00` : time; // pad seconds if needed
    return `${date}T${timeString}`;
  };

  const filterReminders = () => {
    let filtered = reminders.filter(reminder => {
      const patientName = getPatientName(reminder.patientId).toLowerCase();
      const message = reminder.message.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return patientName.includes(search) || 
             message.includes(search) ||
             reminder.reminderType.toLowerCase().includes(search);
    });

    // Sort by preferredDateTime (most recent first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.preferredDateTime.replace(' ', 'T'));
      const dateB = new Date(b.preferredDateTime.replace(' ', 'T'));
      return dateB - dateA;
    });

    setFilteredReminders(filtered);
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  const getPatientEmail = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? patient.email : 'N/A';
  };

  const handleCreateReminder = async () => {
    if (!newReminder.patientId || !newReminder.reminderDate || 
        !newReminder.reminderTime || !newReminder.message.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    const payload = {
      patientId: newReminder.patientId,
      reminderType: newReminder.reminderType,
      preferredDateTime: combineDateTime(newReminder.reminderDate, newReminder.reminderTime),
      // include normalized fields if the API expects them
      reminderDate: newReminder.reminderDate,
      reminderTime: newReminder.reminderTime,
      message: newReminder.message,
      isRead: false
    };

    try {
      const response = await fetch('http://localhost:3000/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage('Reminder created successfully');
        setIsCreateModalOpen(false);
        resetNewReminder();
        fetchReminders();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to create reminder');
      }
    } catch (error) {
      setMessage('Unable to create reminder. Please try again later.');
      console.error('Error:', error);
    }
  };

  const handleMarkAsRead = async (reminderId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setMessage('Reminder marked as read');
        fetchReminders();
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error || 'Failed to update reminder');
      }
    } catch (error) {
      setMessage('Network error while updating reminder.');
      console.error('Error:', error);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/reminders/${reminderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Reminder deleted successfully');
        fetchReminders();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to delete reminder');
      }
    } catch (error) {
      setMessage('Unable to delete reminder. Please try again later.');
      console.error('Error:', error);
    }
  };

  const handleViewReminder = (reminder) => {
    setSelectedReminder(reminder);
    setIsViewModalOpen(true);
    
    // Mark as read if not already read
    if (!reminder.isRead) {
      handleMarkAsRead(reminder.reminderId);
    }
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setMessage('');
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetNewReminder();
    setMessage('');
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedReminder(null);
  };

  const resetNewReminder = () => {
    setNewReminder({
      patientId: '',
      reminderType: 'Appointment',
      reminderDate: '',
      reminderTime: '',
      message: '',
      isRead: false
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReminder(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDateTime = (preferredDateTime) => {
    if (!preferredDateTime) return 'Invalid date';
    const dateTime = new Date(preferredDateTime.replace(' ', 'T'));
    if (isNaN(dateTime.getTime())) return 'Invalid date';
    return dateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Appointment': return 'type-appointment';
      case 'Medication': return 'type-medication';
      case 'Follow-up': return 'type-followup';
      case 'General': return 'type-general';
      default: return 'type-general';
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getReminderStats = () => {
    const total = reminders.length;
    const unread = reminders.filter(r => !r.isRead).length;
    const today = reminders.filter(r => r.reminderDate === new Date().toISOString().split('T')[0]).length;
    return { total, unread, today };
  };

  const stats = getReminderStats();

  return (
    <div className="messages-reminders-container">
      <div className="messages-header">
        <div className="header-content">
          <h1 style={{ color: '#333 !important' }}>Messages & Reminders</h1>
          <p style={{ color: '#333 !important' }}>Manage patient reminders and notifications</p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading reminders...</div>
      ) : (
        <div className="reminders-list">
          {filteredReminders.length === 0 ? (
            <div className="no-reminders">
              <div className="no-reminders-icon">📨</div>
              <p>No reminders found matching your criteria.</p>
              <button className="create-reminder-btn" onClick={openCreateModal}>
                Create First Reminder
              </button>
            </div>
          ) : (
            <div className="reminders-grid">
              {filteredReminders.map((reminder) => (
                <div 
                  key={reminder.reminderId} 
                  className={`reminder-card ${!reminder.isRead ? 'unread' : ''}`}
                  onClick={() => handleViewReminder(reminder)}
                >
                  <div className="reminder-header">
                    <div className={`reminder-type ${getTypeColor(reminder.reminderType)}`}>
                      {reminder.reminderType}
                    </div>
                    <div className="reminder-status">
                      {!reminder.isRead && <span className="unread-indicator">●</span>}
                    </div>
                  </div>
                  
                  <div className="reminder-content">
                    <h3>{getPatientName(reminder.patientId)}</h3>
                    <p className="reminder-message">
                      {reminder.message.length > 100 
                        ? `${reminder.message.substring(0, 100)}...` 
                        : reminder.message}
                    </p>
                    <div className="reminder-datetime">
                      📅 {formatDateTime(reminder.preferredDateTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Reminder Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="reminder-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeCreateModal}>×</button>
            
            <div className="modal-header">
              <h3>Create New Reminder</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="patientId">Patient *</label>
                <select
                  id="patientId"
                  name="patientId"
                  value={newReminder.patientId}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.patientId} value={patient.patientId}>
                      {patient.firstName} {patient.lastName} - {patient.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="reminderType">Reminder Type *</label>
                <select
                  id="reminderType"
                  name="reminderType"
                  value={newReminder.reminderType}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  <option value="Appointment">Appointment</option>
                  <option value="Medication">Medication</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reminderDate">Date *</label>
                  <input
                    type="date"
                    id="reminderDate"
                    name="reminderDate"
                    value={newReminder.reminderDate}
                    onChange={handleInputChange}
                    min={getMinDate()}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reminderTime">Time *</label>
                  <input
                    type="time"
                    id="reminderTime"
                    name="reminderTime"
                    value={newReminder.reminderTime}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={newReminder.message}
                  onChange={handleInputChange}
                  placeholder="Enter reminder message..."
                  rows="4"
                  className="form-control"
                  required
                />
              </div>

              <div className="modal-actions">
                <button className="action-btn cancel-btn" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button className="action-btn save-btn" onClick={handleCreateReminder}>
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Reminder Modal */}
      {isViewModalOpen && selectedReminder && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="reminder-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeViewModal}>×</button>
            
            <div className="modal-header">
              <h3>Reminder Details</h3>
              <div className={`reminder-type-badge ${getTypeColor(selectedReminder.reminderType)}`}>
                {selectedReminder.reminderType}
              </div>
            </div>

            <div className="modal-body">
              <div className="reminder-detail">
                <div className="detail-section">
                  <h4>Patient Information</h4>
                  <p><strong>Name:</strong> {getPatientName(selectedReminder.patientId)}</p>
                  <p><strong>Email:</strong> {getPatientEmail(selectedReminder.patientId)}</p>
                </div>

                <div className="detail-section">
                  <h4>Reminder Details</h4>
                  <p><strong>Type:</strong> {selectedReminder.reminderType}</p>
                 <p><strong>Date & Time:</strong> {formatDateTime(selectedReminder.preferredDateTime)}</p>
                  <p><strong>Status:</strong> {selectedReminder.isRead ? 'Read' : 'Unread'}</p>
                </div>

                <div className="detail-section">
                  <h4>Message</h4>
                  <div className="message-content">
                    <p>{selectedReminder.message}</p>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="action-btn close-btn" onClick={closeViewModal}>
                  Close
                </button>
                <button 
                  className="action-btn delete-btn"
                  onClick={() => {
                    closeViewModal();
                    handleDeleteReminder(selectedReminder.reminderId);
                  }}
                >
                  Delete Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesReminders;