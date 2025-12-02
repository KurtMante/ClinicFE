import React, { useState, useEffect } from 'react';
import './Booking.css';

const Booking = ({ patient }) => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Appointment form data
  const [appointmentData, setAppointmentData] = useState({
    preferredDateTime: '',
    symptom: ''
  });

  // Fetch medical services on component mount
  useEffect(() => {
    fetchMedicalServices();
  }, []);

  // Filter and sort services when search term or sort option changes
  useEffect(() => {
    let filtered = services.filter(service =>
      service.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort services based on selected option
    if (sortBy === 'a-z') {
      filtered = filtered.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
    } else if (sortBy === 'z-a') {
      filtered = filtered.sort((a, b) => b.serviceName.localeCompare(a.serviceName));
    } else if (sortBy === 'price-low') {
      filtered = filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === 'price-high') {
      filtered = filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    setFilteredServices(filtered);
  }, [services, searchTerm, sortBy]);

  const fetchMedicalServices = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/medical-services');
      if (response.ok) {
        const servicesData = await response.json();
        setServices(servicesData);
        setFilteredServices(servicesData);
      } else {
        setMessage('Failed to load medical services');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error fetching medical services:', error);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
    setMessage('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setAppointmentData({
      preferredDateTime: '',
      symptom: ''
    });
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAppointmentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBookAppointment = async () => {
    if (!appointmentData.preferredDateTime) {
      setMessage('Please select a preferred date and time');
      return;
    }

    if (!appointmentData.symptom.trim()) {
      setMessage('Please describe your symptoms or reason for visit');
      return;
    }

    if (!patient?.patientId || !selectedService?.serviceId) {
      setMessage('Missing patient or service information. Please try again.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const toSqlDateTime = (dtLocal) => {
        if (!dtLocal) return dtLocal;
        const [datePart, timePart] = dtLocal.split('T');
        const timeWithSeconds = timePart?.length === 5 ? `${timePart}:00` : timePart;
        return `${datePart} ${timeWithSeconds}`;
      };

      const appointmentPayload = {
        patientId: patient.patientId,
        serviceId: selectedService.serviceId,
        preferredDateTime: toSqlDateTime(appointmentData.preferredDateTime),
        symptom: appointmentData.symptom
      };

      const response = await fetch('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentPayload),
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        const text = await response.text();
        data = { error: text };
      }

      if (response.ok) {
        setMessage('Appointment booked successfully!');
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        const backendMsg = typeof data === 'string' ? data : (data?.error || data?.message);
        setMessage(backendMsg || 'Failed to book appointment');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      console.error('Error booking appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getServiceIcon = (serviceName) => {
    const name = serviceName.toLowerCase();
    if (name.includes('consult')) return '🩺';
    if (name.includes('check') || name.includes('exam')) return '📋';
    if (name.includes('vaccine') || name.includes('immun')) return '💉';
    if (name.includes('lab') || name.includes('test')) return '🧪';
    if (name.includes('xray') || name.includes('x-ray')) return '🔬';
    if (name.includes('dental')) return '🦷';
    if (name.includes('eye') || name.includes('vision')) return '👁️';
    if (name.includes('child') || name.includes('pedia')) return '👶';
    if (name.includes('heart') || name.includes('cardio')) return '❤️';
    if (name.includes('skin') || name.includes('derma')) return '🧴';
    return '⚕️';
  };

  return (
    <div className="booking-modern">
      {/* Header Section */}
      <div className="booking-header-modern">
        <div className="header-title">
          <h1>Book an Appointment</h1>
          <p>Choose from our available medical services</p>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <span className="stat-icon">📋</span>
            <div className="stat-info">
              <span className="stat-value">{services.length}</span>
              <span className="stat-label">Services</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="booking-controls-modern">
        <div className="search-box-modern">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${sortBy === 'default' ? 'active' : ''}`}
            onClick={() => setSortBy('default')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${sortBy === 'a-z' ? 'active' : ''}`}
            onClick={() => setSortBy('a-z')}
          >
            A-Z
          </button>
          <button 
            className={`filter-btn ${sortBy === 'z-a' ? 'active' : ''}`}
            onClick={() => setSortBy('z-a')}
          >
            Z-A
          </button>
          <button 
            className={`filter-btn ${sortBy === 'price-low' ? 'active' : ''}`}
            onClick={() => setSortBy('price-low')}
          >
            Price ↑
          </button>
          <button 
            className={`filter-btn ${sortBy === 'price-high' ? 'active' : ''}`}
            onClick={() => setSortBy('price-high')}
          >
            Price ↓
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && !isModalOpen && (
        <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
          <span className="message-icon">{message.includes('successfully') ? '✓' : '⚠'}</span>
          {message}
        </div>
      )}

      {/* Services Grid */}
      <div className="services-section-modern">
        <div className="section-header">
          <h2>Available Services</h2>
          <span className="service-count">{filteredServices.length} services found</span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="no-services-modern">
            <span className="empty-icon">🔍</span>
            <h3>No services found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="services-grid">
            {filteredServices.map((service) => (
              <div key={service.serviceId} className="service-card">
                <div className="service-card-header">
                  <div className="service-icon-wrapper">
                    <span>{getServiceIcon(service.serviceName)}</span>
                  </div>
                  <div className="service-price-tag">
                    ₱{service.price}
                  </div>
                </div>
                <div className="service-card-body">
                  <h3>{service.serviceName}</h3>
                  {service.description && (
                    <p className="service-desc">{service.description}</p>
                  )}
                </div>
                <div className="service-card-footer">
                  <button 
                    className="book-btn"
                    onClick={() => handleServiceSelect(service)}
                  >
                    <span>📅</span>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {isModalOpen && selectedService && (
        <div className="modal-overlay-modern" onClick={closeModal}>
          <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>×</button>
            
            <div className="modal-header-modern">
              <div className="modal-service-icon">
                <span>{getServiceIcon(selectedService.serviceName)}</span>
              </div>
              <div className="modal-title">
                <h3>Book Appointment</h3>
                <p>{selectedService.serviceName}</p>
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
                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">📅</span>
                    Preferred Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="preferredDateTime"
                    value={appointmentData.preferredDateTime}
                    onChange={handleInputChange}
                    min={getMinDateTime()}
                  />
                </div>

                <div className="form-group-modern">
                  <label>
                    <span className="label-icon">📝</span>
                    Symptoms / Reason for Visit
                  </label>
                  <textarea
                    name="symptom"
                    value={appointmentData.symptom}
                    onChange={handleInputChange}
                    placeholder="Please describe your symptoms or reason for this appointment..."
                    rows="4"
                  />
                </div>

                <div className="summary-card">
                  <h4>Appointment Summary</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Service</span>
                      <span className="summary-value">{selectedService.serviceName}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Price</span>
                      <span className="summary-value price">₱{selectedService.price}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Patient</span>
                      <span className="summary-value">{patient.firstName} {patient.lastName}</span>
                    </div>
                    {appointmentData.preferredDateTime && (
                      <div className="summary-item full-width">
                        <span className="summary-label">Scheduled</span>
                        <span className="summary-value">
                          {new Date(appointmentData.preferredDateTime).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  className="submit-btn-modern"
                  onClick={handleBookAppointment}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Booking...
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
