import React, { useState, useEffect, useCallback } from 'react';
import './FeedbackManagement.css';

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Default');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [anonymousFilter, setAnonymousFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const feedbacksPerPage = 5;

  useEffect(() => {
    fetchFeedbacks();
    fetchPatients();
    fetchServices();
  }, []);

  // memoize to satisfy react-hooks/exhaustive-deps
  const filterAndSortFeedbacks = useCallback(() => {
    let filtered = feedbacks.filter(feedback => {
      const patientName = getPatientName(feedback.patientId).toLowerCase();
      const comment = feedback.comment.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = patientName.includes(search) || comment.includes(search);
      const matchesRating = ratingFilter === 'All' || feedback.rating.toString() === ratingFilter;
      const matchesAnonymous = anonymousFilter === 'All' || 
        (anonymousFilter === 'Anonymous' && feedback.isAnonymous) ||
        (anonymousFilter === 'Public' && !feedback.isAnonymous);
      
      return matchesSearch && matchesRating && matchesAnonymous;
    });

    // Sort feedbacks
    if (sortBy === 'Date') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'Rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'Patient') {
      filtered.sort((a, b) => getPatientName(a.patientId).localeCompare(getPatientName(b.patientId)));
    }
    // Default keeps original order

    setFilteredFeedbacks(filtered);
  }, [feedbacks, patients, searchTerm, sortBy, ratingFilter, anonymousFilter]);

  useEffect(() => {
    filterAndSortFeedbacks();
  }, [filterAndSortFeedbacks]);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data);
      } else {
        setMessage('Failed to fetch feedbacks');
      }
    } catch (error) {
      setMessage('Error fetching feedbacks');
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

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    if (!patient) return 'Unknown Patient';
    return `${patient.firstName} ${patient.lastName}`;
  };

  const getPatientEmail = (patientId) => {
    const patient = patients.find(p => p.patientId === patientId);
    return patient ? patient.email : 'N/A';
  };

  const getServiceName = (serviceId) => {
    if (!serviceId) return 'No Service';
    const service = services.find(
      s => String(s.serviceId) === String(serviceId)
    );
    return service ? service.serviceName : 'Unknown Service';
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/feedback/${feedbackId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Feedback deleted successfully');
        fetchFeedbacks(); // Refresh the list
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to delete feedback');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedFeedback(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <span key={index} className={`star ${index < rating ? 'filled' : ''}`}>
        ⭐
      </span>
    ));
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'rating-excellent';
    if (rating >= 3) return 'rating-good';
    if (rating >= 2) return 'rating-average';
    return 'rating-poor';
  };

  const getFeedbackStats = () => {
    if (feedbacks.length === 0) return { average: 0, total: 0, distribution: {} };

    const average = (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1);
    const total = feedbacks.length;
    const distribution = {};
    
    for (let i = 1; i <= 5; i++) {
      distribution[i] = feedbacks.filter(f => f.rating === i).length;
    }

    return { average, total, distribution };
  };

  const stats = getFeedbackStats();

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on filter/sort/search
  }, [filteredFeedbacks]);

  const totalPages = Math.ceil(filteredFeedbacks.length / feedbacksPerPage);
  const paginatedFeedbacks = filteredFeedbacks.slice(
    (currentPage - 1) * feedbacksPerPage,
    currentPage * feedbacksPerPage
  );

  return (
    <div className="feedback-management">
      <div className="feedback-header">
        <div className="header-content">
          <h1>Feedback Management</h1>
          <p>Manage and review patient feedback</p>
        </div>
        
        <div className="feedback-stats-summary">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Reviews</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.average}</span>
            <span className="stat-label">Average Rating</span>
          </div>
        </div>
      </div>

      <div className="feedback-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search feedback by patient name or comment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="Default">Default</option>
            <option value="Date">Sort by Date</option>
            <option value="Rating">Sort by Rating</option>
            <option value="Patient">Sort by Patient</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            value={anonymousFilter}
            onChange={(e) => setAnonymousFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Feedback</option>
            <option value="Public">Public Only</option>
            <option value="Anonymous">Anonymous Only</option>
          </select>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading feedback...</div>
      ) : (
        <div className="feedback-content">
          <div className="feedback-table-container">
            <table className="feedback-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Rating</th>
                  <th>Comment Preview</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-feedback">
                      No feedback found matching your criteria
                    </td>
                  </tr>
                ) : (
                  paginatedFeedbacks.map((feedback) => (
                    <tr key={feedback.feedbackId}>
                      <td>
                        <div className="patient-info">
                          <span className="patient-name">
                            {feedback.isAnonymous ? 'Anonymous Patient' : getPatientName(feedback.patientId)}
                          </span>
                          {!feedback.isAnonymous && (
                            <span className="patient-email">{getPatientEmail(feedback.patientId)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="rating-display">
                          <div className="stars">{renderStars(feedback.rating)}</div>
                          <span className={`rating-badge ${getRatingColor(feedback.rating)}`}>
                            {feedback.rating}/5
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="comment-preview">
                          {feedback.comment.length > 100 
                            ? `${feedback.comment.substring(0, 100)}...` 
                            : feedback.comment}
                        </div>
                      </td>
                      <td>
                        <span className={`type-badge ${feedback.isAnonymous ? 'anonymous' : 'public'}`}>
                          {feedback.isAnonymous ? 'Anonymous' : 'Public'}
                        </span>
                      </td>
                      <td>
                        <div className="date-info">
                          <span className="date-primary">{formatDate(feedback.createdAt)}</span>
                          {feedback.updatedAt !== feedback.createdAt && (
                            <span className="date-updated">Updated: {formatDate(feedback.updatedAt)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view-btn"
                            onClick={() => handleViewDetails(feedback)}
                            title="View Details"
                          >
                            View
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteFeedback(feedback.feedbackId)}
                            title="Delete Feedback"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Detail Modal */}
      {isDetailModalOpen && selectedFeedback && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="feedback-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetailModal}>×</button>
            
            <div className="modal-header">
              <h3>Feedback Details</h3>
            </div>

            <div className="modal-body">
              <div className="feedback-detail">
                <div className="detail-section">
                  <h4>Patient Information</h4>
                  <p><strong>Name:</strong> {selectedFeedback.isAnonymous ? 'Anonymous Patient' : getPatientName(selectedFeedback.patientId)}</p>
                  {!selectedFeedback.isAnonymous && (
                    <>
                      <p><strong>Email:</strong> {getPatientEmail(selectedFeedback.patientId)}</p>
                      <p><strong>Patient ID:</strong> #{selectedFeedback.patientId}</p>
                    </>
                  )}
                  <p><strong>Feedback Type:</strong> {selectedFeedback.isAnonymous ? 'Anonymous' : 'Public'}</p>
                  <p><strong>Service:</strong> {getServiceName(selectedFeedback.serviceId)}</p>
                </div>

                <div className="detail-section">
                  <h4>Rating & Review</h4>
                  <div className="rating-detail">
                    <div className="stars-large">{renderStars(selectedFeedback.rating)}</div>
                    <span className={`rating-badge-large ${getRatingColor(selectedFeedback.rating)}`}>
                      {selectedFeedback.rating} out of 5 stars
                    </span>
                  </div>
                  <div className="comment-full">
                    <p>"{selectedFeedback.comment}"</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Timeline</h4>
                  <p><strong>Submitted:</strong> {formatDate(selectedFeedback.createdAt)}</p>
                  {selectedFeedback.updatedAt !== selectedFeedback.createdAt && (
                    <p><strong>Last Updated:</strong> {formatDate(selectedFeedback.updatedAt)}</p>
                  )}
                  <p><strong>Feedback ID:</strong> #{selectedFeedback.feedbackId}</p>
                </div>
              </div>

              <div className="modal-actions">
                <button className="action-btn close-btn" onClick={closeDetailModal}>
                  Close
                </button>
                <button 
                  className="action-btn delete-btn"
                  onClick={() => {
                    closeDetailModal();
                    handleDeleteFeedback(selectedFeedback.feedbackId);
                  }}
                >
                  Delete Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
