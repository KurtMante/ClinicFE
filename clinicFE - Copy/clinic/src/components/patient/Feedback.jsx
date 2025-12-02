import React, { useState, useEffect } from 'react';
import './Feedback.css';

const Feedback = ({ patient }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  
  // Form data for new/edit feedback
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    isAnonymous: false
  });

  useEffect(() => {
    if (patient) {
      fetchFeedbacks();
    }
  }, [patient]);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/feedback/patient/${patient.patientId}`);
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data);
      } else if (response.status === 404) {
        // No feedbacks found is not an error
        setFeedbacks([]);
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

  const handleSubmitFeedback = async () => {
    if (!formData.comment.trim()) {
      setMessage('Please provide a comment for your feedback');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const feedbackData = {
        patientId: patient.patientId,
        rating: parseInt(formData.rating),
        comment: formData.comment.trim(),
        isAnonymous: formData.isAnonymous
      };

      let response;
      if (editingFeedback) {
        // Update existing feedback
        response = await fetch(`http://localhost:3000/api/feedback/${editingFeedback.feedbackId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData),
        });
      } else {
        // Create new feedback
        response = await fetch('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData),
        });
      }

      if (response.ok) {
        setMessage(editingFeedback ? 'Feedback updated successfully!' : 'Feedback submitted successfully!');
        closeModal();
        fetchFeedbacks(); // Refresh the list
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFeedback = (feedback) => {
    setEditingFeedback(feedback);
    setFormData({
      rating: feedback.rating,
      comment: feedback.comment,
      isAnonymous: feedback.isAnonymous || false
    });
    setIsModalOpen(true);
    setMessage('');
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

  const openNewFeedbackModal = () => {
    setEditingFeedback(null);
    setFormData({
      rating: 5,
      comment: '',
      isAnonymous: false
    });
    setIsModalOpen(true);
    setMessage('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFeedback(null);
    setFormData({
      rating: 5,
      comment: '',
      isAnonymous: false
    });
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const getAverageRating = () => {
    if (feedbacks.length === 0) return 0;
    return (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1);
  };

  const getRatingEmoji = (rating) => {
    const emojis = ['😞', '😕', '😐', '🙂', '😄'];
    return emojis[rating - 1] || '⭐';
  };

  const getRatingLabel = (rating) => {
    const labels = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
    return labels[rating - 1] || '';
  };

  return (
    <div className="feedback-modern">
      {/* Header Section */}
      <div className="feedback-header-modern">
        <div className="header-title">
          <h1>Feedback & Reviews</h1>
          <p>Share your experience with Wahing Medical Clinic</p>
        </div>
        <button className="add-review-btn" onClick={openNewFeedbackModal}>
          <span>✍️</span>
          Write a Review
        </button>
      </div>

      {/* Stats Cards */}
      <div className="feedback-stats-modern">
        <div className="stat-card-modern">
          <div className="stat-icon-wrapper blue">
            <span>📝</span>
          </div>
          <div className="stat-content">
            <span className="stat-number">{feedbacks.length}</span>
            <span className="stat-label">Total Reviews</span>
          </div>
        </div>
        
        {feedbacks.length > 0 && (
          <div className="stat-card-modern">
            <div className="stat-icon-wrapper gold">
              <span>⭐</span>
            </div>
            <div className="stat-content">
              <span className="stat-number">{getAverageRating()}</span>
              <span className="stat-label">Average Rating</span>
            </div>
            <div className="rating-stars-small">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star} 
                  className={`star-small ${star <= Math.round(getAverageRating()) ? 'filled' : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="stat-card-modern">
          <div className="stat-icon-wrapper green">
            <span>👍</span>
          </div>
          <div className="stat-content">
            <span className="stat-number">
              {feedbacks.filter(f => f.rating >= 4).length}
            </span>
            <span className="stat-label">Positive Reviews</span>
          </div>
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
      {isLoading && !isModalOpen ? (
        <div className="loading-modern">
          <div className="loading-spinner"></div>
          <p>Loading feedbacks...</p>
        </div>
      ) : (
        <div className="feedback-content-modern">
          <div className="section-header-modern">
            <h2>Your Reviews</h2>
            <span className="review-count">{feedbacks.length} reviews</span>
          </div>

          {feedbacks.length === 0 ? (
            <div className="no-feedback-modern">
              <div className="empty-illustration">
                <span>📝</span>
              </div>
              <h3>No Reviews Yet</h3>
              <p>You haven't written any reviews yet. Share your experience to help us improve!</p>
              <button className="add-review-btn" onClick={openNewFeedbackModal}>
                <span>✍️</span>
                Write Your First Review
              </button>
            </div>
          ) : (
            <div className="feedback-grid">
              {feedbacks.map((feedback) => (
                <div key={feedback.feedbackId} className="feedback-card-modern">
                  <div className="card-header-modern">
                    <div className="rating-display">
                      <div className="rating-badge">
                        <span className="rating-emoji">{getRatingEmoji(feedback.rating)}</span>
                        <span className="rating-value">{feedback.rating}/5</span>
                      </div>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            className={`star ${star <= feedback.rating ? 'filled' : ''}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="rating-label">{getRatingLabel(feedback.rating)}</span>
                    </div>
                    {feedback.isAnonymous && (
                      <div className="anonymous-badge-modern">
                        <span>🕶️</span>
                        Anonymous
                      </div>
                    )}
                  </div>

                  <div className="card-body-modern">
                    <p className="feedback-comment-text">"{feedback.comment}"</p>
                  </div>

                  <div className="card-footer-modern">
                    <div className="feedback-meta">
                      <span className="meta-date">
                        <span>📅</span>
                        {formatDate(feedback.createdAt)}
                      </span>
                      {feedback.updatedAt !== feedback.createdAt && (
                        <span className="meta-updated">
                          (Edited)
                        </span>
                      )}
                    </div>
                    <div className="feedback-actions-modern">
                      <button 
                        className="action-btn-modern edit"
                        onClick={() => handleEditFeedback(feedback)}
                      >
                        <span>✏️</span>
                        Edit
                      </button>
                      <button 
                        className="action-btn-modern delete"
                        onClick={() => handleDeleteFeedback(feedback.feedbackId)}
                      >
                        <span>🗑️</span>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      {isModalOpen && (
        <div className="modal-overlay-modern" onClick={closeModal}>
          <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>×</button>
            
            <div className="modal-header-modern">
              <div className="modal-icon">
                <span>{editingFeedback ? '✏️' : '✍️'}</span>
              </div>
              <div className="modal-title">
                <h3>{editingFeedback ? 'Edit Your Review' : 'Write a Review'}</h3>
                <p>Share your experience with our medical services</p>
              </div>
            </div>

            <div className="modal-body-modern">
              {message && (
                <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
                  <span className="message-icon">{message.includes('successfully') ? '✓' : '⚠'}</span>
                  {message}
                </div>
              )}

              <div className="form-modern">
                {/* Rating Selection */}
                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">⭐</span>
                    How would you rate your experience?
                  </label>
                  <div className="rating-selector">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`rating-option-modern ${formData.rating == value ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, rating: value }))}
                      >
                        <span className="rating-emoji-large">{getRatingEmoji(value)}</span>
                        <span className="rating-stars-option">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                              key={star} 
                              className={`star-option ${star <= value ? 'filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </span>
                        <span className="rating-text">{getRatingLabel(value)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">💬</span>
                    Your Review
                  </label>
                  <textarea
                    name="comment"
                    value={formData.comment}
                    onChange={handleInputChange}
                    placeholder="Please share your experience with our clinic, staff, and services..."
                    rows="5"
                  />
                  <div className="character-counter">
                    <span className={formData.comment.length > 450 ? 'warning' : ''}>
                      {formData.comment.length}/500
                    </span>
                  </div>
                </div>

                {/* Anonymous Option */}
                <div className="anonymous-toggle">
                  <label className="toggle-label">
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.isAnonymous}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          isAnonymous: e.target.checked
                        }))}
                      />
                      <span className="toggle-slider"></span>
                    </div>
                    <div className="toggle-content">
                      <span className="toggle-title">
                        <span>🕶️</span>
                        Submit Anonymously
                      </span>
                      <span className="toggle-description">
                        Your name won't be displayed publicly with this review
                      </span>
                    </div>
                  </label>
                </div>

                {/* Summary Card */}
                <div className="review-summary">
                  <h4>Review Summary</h4>
                  <div className="summary-content">
                    <div className="summary-row">
                      <span className="summary-label">Rating</span>
                      <span className="summary-value">
                        {getRatingEmoji(formData.rating)} {formData.rating}/5 - {getRatingLabel(formData.rating)}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Visibility</span>
                      <span className="summary-value">
                        {formData.isAnonymous ? '🕶️ Anonymous' : '👤 Public'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="modal-actions-modern">
                  <button className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleSubmitFeedback}
                    disabled={isLoading || !formData.comment.trim()}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        {editingFeedback ? 'Update Review' : 'Submit Review'}
                      </>
                    )}
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

export default Feedback;
