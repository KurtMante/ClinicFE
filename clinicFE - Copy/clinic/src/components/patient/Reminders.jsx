import React, { useState, useEffect } from 'react';
import './Reminders.css';

const Reminders = ({ patient }) => {
  const [reminders, setReminders] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  useEffect(() => {
    if (patient) {
      fetchReminders();
    }
  }, [patient]);

  useEffect(() => {
    filterReminders();
  }, [reminders, searchTerm, filterStatus]);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/reminders/patient/${patient.patientId}`);
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

  const filterReminders = () => {
    let filtered = reminders.filter(reminder => {
      const messageMatch = reminder.message.toLowerCase().includes(searchTerm.toLowerCase());
      const serviceMatch = reminder.serviceName?.toLowerCase().includes(searchTerm.toLowerCase());
      const searchMatch = messageMatch || serviceMatch;

      if (filterStatus === 'read') return searchMatch && reminder.isRead === 1;
      if (filterStatus === 'unread') return searchMatch && reminder.isRead === 0;
      return searchMatch;
    });

    // Sort by creation date (most recent first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredReminders(filtered);
  };

  const handleMarkAsRead = async (reminderId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/reminders/${reminderId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setMessage('Reminder marked as read');
        fetchReminders();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to update reminder');
      }
    } catch (error) {
      setMessage('Unable to update reminder. Please try again later.');
      console.error('Error:', error);
    }
  };

  const handleMarkAsUnread = async (reminderId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/reminders/${reminderId}/unread`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setMessage('Reminder marked as unread');
        fetchReminders();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to update reminder');
      }
    } catch (error) {
      setMessage('Unable to update reminder. Please try again later.');
      console.error('Error:', error);
    }
  };

  const handleViewReminder = (reminder) => {
    setSelectedReminder(reminder);
    setIsViewModalOpen(true);
    
    // Mark as read if not already read
    if (reminder.isRead === 0) {
      handleMarkAsRead(reminder.reminderId);
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedReminder(null);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const getReminderStats = () => {
    const total = reminders.length;
    const unread = reminders.filter(r => r.isRead === 0).length;
    const today = reminders.filter(r => {
      const reminderDate = new Date(r.preferredDateTime).toDateString();
      const todayDate = new Date().toDateString();
      return reminderDate === todayDate;
    }).length;
    return { total, unread, today };
  };

  const getServiceIcon = (serviceName) => {
    const name = serviceName?.toLowerCase() || '';
    if (name.includes('consult')) return '🩺';
    if (name.includes('check') || name.includes('exam')) return '📋';
    if (name.includes('vaccine') || name.includes('immun')) return '💉';
    if (name.includes('lab') || name.includes('test')) return '🧪';
    if (name.includes('dental')) return '🦷';
    if (name.includes('eye') || name.includes('vision')) return '👁️';
    if (name.includes('follow')) return '🔄';
    return '🔔';
  };

  const stats = getReminderStats();

  return (
    <div className="reminders-modern">
      {/* Header Section */}
      <div className="reminders-header-modern">
        <div className="header-title">
          <h1>My Reminders</h1>
          <p>Stay updated with your medical notifications</p>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <span className="stat-icon">🔔</span>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-box highlight">
            <span className="stat-icon">✨</span>
            <div className="stat-info">
              <span className="stat-value">{stats.unread}</span>
              <span className="stat-label">Unread</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <span className="stat-value">{stats.today}</span>
              <span className="stat-label">Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="reminders-controls-modern">
        <div className="search-box-modern">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search reminders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            <span>📋</span>
            All
            <span className="tab-count">{reminders.length}</span>
          </button>
          <button 
            className={`filter-tab ${filterStatus === 'unread' ? 'active' : ''}`}
            onClick={() => setFilterStatus('unread')}
          >
            <span>✨</span>
            Unread
            <span className="tab-count">{stats.unread}</span>
          </button>
          <button 
            className={`filter-tab ${filterStatus === 'read' ? 'active' : ''}`}
            onClick={() => setFilterStatus('read')}
          >
            <span>✓</span>
            Read
            <span className="tab-count">{stats.total - stats.unread}</span>
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message-modern ${message.includes('successfully') || message.includes('marked') ? 'success' : 'error'}`}>
          <span className="message-icon">{message.includes('successfully') || message.includes('marked') ? '✓' : '⚠'}</span>
          {message}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="loading-modern">
          <div className="loading-spinner"></div>
          <p>Loading reminders...</p>
        </div>
      ) : (
        <div className="reminders-content-modern">
          {filteredReminders.length === 0 ? (
            <div className="no-reminders-modern">
              <div className="empty-illustration">
                <span>🔔</span>
              </div>
              <h3>No Reminders Found</h3>
              <p>
                {filterStatus === 'unread' 
                  ? "You've read all your reminders! Great job staying updated."
                  : filterStatus === 'read'
                  ? "No read reminders yet."
                  : "You don't have any reminders at the moment."}
              </p>
            </div>
          ) : (
            <div className="reminders-list-modern">
              {filteredReminders.map((reminder) => (
                <div 
                  key={reminder.reminderId} 
                  className={`reminder-card-modern ${reminder.isRead === 0 ? 'unread' : 'read'}`}
                  onClick={() => handleViewReminder(reminder)}
                >
                  <div className="card-indicator"></div>
                  
                  <div className="card-content">
                    <div className="card-header-modern">
                      <div className="service-info-modern">
                        <div className="service-icon-modern">
                          <span>{getServiceIcon(reminder.serviceName)}</span>
                        </div>
                        <div className="service-details">
                          <h3>{reminder.serviceName || 'Medical Reminder'}</h3>
                          <span className="reminder-time">{getRelativeTime(reminder.createdAt)}</span>
                        </div>
                      </div>
                      <div className="card-badges">
                        {reminder.isRead === 0 && (
                          <span className="new-badge">
                            <span>✨</span>
                            New
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="card-body-modern">
                      <p className="reminder-message-modern">
                        {reminder.message.length > 120 
                          ? `${reminder.message.substring(0, 120)}...` 
                          : reminder.message}
                      </p>
                      
                      {reminder.preferredDateTime && (
                        <div className="appointment-info">
                          <div className="info-chip">
                            <span>📅</span>
                            {formatDate(reminder.preferredDateTime)}
                          </div>
                          <div className="info-chip">
                            <span>🕐</span>
                            {formatTime(reminder.preferredDateTime)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="card-footer-modern">
                      <div className="footer-meta">
                        <span className="reminder-id">ID: #{reminder.reminderId}</span>
                      </div>
                      <div className="footer-actions" onClick={(e) => e.stopPropagation()}>
                        {reminder.isRead === 0 ? (
                          <button 
                            className="action-btn-modern mark-read"
                            onClick={() => handleMarkAsRead(reminder.reminderId)}
                          >
                            <span>✓</span>
                            Mark Read
                          </button>
                        ) : (
                          <button 
                            className="action-btn-modern mark-unread"
                            onClick={() => handleMarkAsUnread(reminder.reminderId)}
                          >
                            <span>○</span>
                            Mark Unread
                          </button>
                        )}
                        <button className="action-btn-modern view">
                          <span>👁️</span>
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Reminder Modal */}
      {isViewModalOpen && selectedReminder && (
        <div className="modal-overlay-modern" onClick={closeViewModal}>
          <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeViewModal}>×</button>
            
            <div className="modal-header-modern">
              <div className="modal-icon">
                <span>{getServiceIcon(selectedReminder.serviceName)}</span>
              </div>
              <div className="modal-title">
                <h3>Reminder Details</h3>
                <p>{selectedReminder.serviceName || 'Medical Reminder'}</p>
              </div>
            </div>

            <div className="modal-body-modern">
              {/* Status Badge */}
              <div className="status-section">
                <span className={`status-badge-modern ${selectedReminder.isRead === 0 ? 'unread' : 'read'}`}>
                  <span>{selectedReminder.isRead === 0 ? '✨' : '✓'}</span>
                  {selectedReminder.isRead === 0 ? 'Unread' : 'Read'}
                </span>
              </div>

              {/* Message Section */}
              <div className="detail-card">
                <div className="detail-card-header">
                  <span className="detail-icon">💬</span>
                  <h4>Message</h4>
                </div>
                <div className="message-box">
                  <p>{selectedReminder.message}</p>
                </div>
              </div>

              {/* Appointment Details */}
              {selectedReminder.preferredDateTime && (
                <div className="detail-card">
                  <div className="detail-card-header">
                    <span className="detail-icon">📅</span>
                    <h4>Scheduled Appointment</h4>
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{formatDate(selectedReminder.preferredDateTime)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time</span>
                      <span className="detail-value">{formatTime(selectedReminder.preferredDateTime)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="detail-card">
                <div className="detail-card-header">
                  <span className="detail-icon">ℹ️</span>
                  <h4>Information</h4>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Reminder ID</span>
                    <span className="detail-value">#{selectedReminder.reminderId}</span>
                  </div>
                  {selectedReminder.appointmentId && (
                    <div className="detail-item">
                      <span className="detail-label">Appointment ID</span>
                      <span className="detail-value">#{selectedReminder.appointmentId}</span>
                    </div>
                  )}
                  <div className="detail-item full-width">
                    <span className="detail-label">Created</span>
                    <span className="detail-value">{formatDateTime(selectedReminder.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions-modern">
                <button className="btn-secondary" onClick={closeViewModal}>
                  Close
                </button>
                {selectedReminder.isRead === 0 ? (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      handleMarkAsRead(selectedReminder.reminderId);
                      closeViewModal();
                    }}
                  >
                    <span>✓</span>
                    Mark as Read
                  </button>
                ) : (
                  <button 
                    className="btn-primary secondary"
                    onClick={() => {
                      handleMarkAsUnread(selectedReminder.reminderId);
                      closeViewModal();
                    }}
                  >
                    <span>○</span>
                    Mark as Unread
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
