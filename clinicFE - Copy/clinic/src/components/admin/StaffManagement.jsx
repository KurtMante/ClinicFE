import React, { useState, useEffect } from 'react';
import './StaffManagement.css';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffFormData, setStaffFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone1: '',
    emergencyContactPhone2: '',
    streetAddress: '',
    barangay: '',
    municipality: ''
  });
  const [showHistory, setShowHistory] = useState(false);
  const [deletedStaff, setDeletedStaff] = useState([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm]);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/staff');
      if (response.ok) {
        const data = await response.json();
        // Only show non-deleted staff
        setStaff(data.filter(member => member.isDeleted !== 1));
        // Save deleted staff for history
        setDeletedStaff(data.filter(member => member.isDeleted === 1));
      } else {
        setMessage('Failed to fetch staff');
      }
    } catch (error) {
      setMessage('Error fetching staff');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = staff.filter(member => {
      const nameMatch = `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = member.email.toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = member.phone.includes(searchTerm);
      
      return nameMatch || emailMatch || phoneMatch;
    });

    // Sort by name alphabetically
    filtered.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

    setFilteredStaff(filtered);
  };

  const handleCreateStaff = async () => {
    if (!staffFormData.firstName.trim() || !staffFormData.lastName.trim() || 
        !staffFormData.email.trim() || !staffFormData.password.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(staffFormData),
      });

      if (response.ok) {
        setMessage('Staff member created successfully');
        setIsCreateModalOpen(false);
        resetForm();
        fetchStaff();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to create staff member');
      }
    } catch (error) {
      setMessage('Unable to create staff member. Please try again later.');
      console.error('Error:', error);
    }
  };

  const handleUpdateStaff = async () => {
    if (!staffFormData.firstName.trim() || !staffFormData.lastName.trim() || 
        !staffFormData.email.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      // Exclude password from update if it's empty
      const updateData = { ...staffFormData };
      if (!updateData.password.trim()) {
        delete updateData.password;
      }

      const response = await fetch(`http://localhost:3000/api/staff/${selectedStaff.staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setMessage('Staff member updated successfully');
        setIsEditModalOpen(false);
        resetForm();
        fetchStaff();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to update staff member');
      }
    } catch (error) {
      setMessage('Unable to update staff member. Please try again later.');
      console.error('Error:', error);
    }
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    const deletedByStaffId = localStorage.getItem('staffId'); // Or get from context/session
    if (!window.confirm(`Are you sure you want to delete "${staffName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/staff/${staffId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedByStaffId })
      });

      if (response.ok) {
        setMessage('Staff member soft deleted successfully');
        fetchStaff();
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to delete staff member');
      }
    } catch (error) {
      setMessage('Unable to delete staff member. Please try again later.');
      console.error('Error:', error);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
    setMessage('');
  };

  const openEditModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setStaffFormData({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      email: staffMember.email,
      phone: staffMember.phone,
      password: '', // Don't populate password for security
      dateOfBirth: staffMember.dateOfBirth ? staffMember.dateOfBirth.split('T')[0] : '',
      emergencyContactName: staffMember.emergencyContactName || '',
      emergencyContactRelationship: staffMember.emergencyContactRelationship || '',
      emergencyContactPhone1: staffMember.emergencyContactPhone1 || '',
      emergencyContactPhone2: staffMember.emergencyContactPhone2 || '',
      streetAddress: staffMember.streetAddress || '',
      barangay: staffMember.barangay || '',
      municipality: staffMember.municipality || ''
    });
    setIsEditModalOpen(true);
    setMessage('');
  };

  const openViewModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setIsViewModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setIsHistoryModalOpen(false);
    setSelectedStaff(null);
    resetForm();
    setMessage('');
  };

  const resetForm = () => {
    setStaffFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      dateOfBirth: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone1: '',
      emergencyContactPhone2: '',
      streetAddress: '',
      barangay: '',
      municipality: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStaffFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="staff-management-container">
      <div className="staff-management-header">
        <div className="header-content">
          <h1>Staff Management</h1>
          <p>Manage clinic staff members and their information</p>
        </div>
        <button className="create-staff-btn" onClick={openCreateModal}>
          + Add New Staff Member
        </button>
      </div>

      <div className="staff-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search staff by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          className="history-btn"
          style={{ marginLeft: '1rem' }}
          onClick={() => setIsHistoryModalOpen(true)}
        >
          Show Former Staff
        </button>
      </div>

      {/* Former Staff Modal */}
      {isHistoryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsHistoryModalOpen(false)}>×</button>
            <div className="modal-header">
              <h3>Former Staff (History)</h3>
            </div>
            <div className="modal-body">
              {deletedStaff.length === 0 ? (
                <div className="no-staff">
                  <div className="no-staff-icon">🕰️</div>
                  <p>No former staff members found.</p>
                </div>
              ) : (
                <div className="staff-table-container">
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>Staff ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Date of Birth</th>
                        <th>Deleted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedStaff.map((staffMember) => (
                        <tr key={staffMember.staffId}>
                          <td>#{staffMember.staffId}</td>
                          <td>
                            <div className="staff-name">
                              {staffMember.firstName} {staffMember.lastName}
                            </div>
                          </td>
                          <td>
                            <div className="staff-email">
                              {staffMember.email}
                            </div>
                          </td>
                          <td>{staffMember.phone}</td>
                          <td>{formatDate(staffMember.dateOfBirth)}</td>
                          <td>{staffMember.deletedAt ? formatDateTime(staffMember.deletedAt) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading staff...</div>
      ) : (
        <div className="staff-content">
          {filteredStaff.length === 0 ? (
            <div className="no-staff">
              <div className="no-staff-icon">👥</div>
              <p>No staff members found matching your criteria.</p>
              {staff.length === 0 && (
                <button className="create-staff-btn" onClick={openCreateModal}>
                  Add First Staff Member
                </button>
              )}
            </div>
          ) : (
            <div className="staff-table-container">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Date of Birth</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staffMember) => (
                    <tr key={staffMember.staffId}>
                      <td>#{staffMember.staffId}</td>
                      <td>
                        <div className="staff-name">
                          {staffMember.firstName} {staffMember.lastName}
                        </div>
                      </td>
                      <td>
                        <div className="staff-email">
                          {staffMember.email}
                        </div>
                      </td>
                      <td>{staffMember.phone}</td>
                      <td>{formatDate(staffMember.dateOfBirth)}</td>
                      <td>{formatDateTime(staffMember.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view-btn"
                            onClick={() => openViewModal(staffMember)}
                            title="View Details"
                          >
                            View
                          </button>
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => openEditModal(staffMember)}
                            title="Edit Staff Member"
                          >
                            Edit
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteStaff(staffMember.staffId, `${staffMember.firstName} ${staffMember.lastName}`)}
                            title="Delete Staff Member"
                          >
                            Delete
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

      {/* Create Staff Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModals}>×</button>
            
            <div className="modal-header">
              <h3>Add New Staff Member</h3>
            </div>

            <div className="modal-body">
              <div className="staff-form">
                <div className="form-section">
                  <h4>Personal Information</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name *</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={staffFormData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">Last Name *</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={staffFormData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={staffFormData.email}
                        onChange={handleInputChange}
                        placeholder="staff@wahingclinic.com"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">Phone Number *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={staffFormData.phone}
                        onChange={handleInputChange}
                        placeholder="09123456789"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="password">Password *</label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={staffFormData.password}
                        onChange={handleInputChange}
                        placeholder="Minimum 6 characters"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="dateOfBirth">Date of Birth</label>
                      <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={staffFormData.dateOfBirth}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Emergency Contact</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="emergencyContactName">Contact Name</label>
                      <input
                        type="text"
                        id="emergencyContactName"
                        name="emergencyContactName"
                        value={staffFormData.emergencyContactName}
                        onChange={handleInputChange}
                        placeholder="Emergency contact name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="emergencyContactRelationship">Relationship</label>
                      <input
                        type="text"
                        id="emergencyContactRelationship"
                        name="emergencyContactRelationship"
                        value={staffFormData.emergencyContactRelationship}
                        onChange={handleInputChange}
                        placeholder="Relationship"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="emergencyContactPhone1">Primary Phone</label>
                      <input
                        type="tel"
                        id="emergencyContactPhone1"
                        name="emergencyContactPhone1"
                        value={staffFormData.emergencyContactPhone1}
                        onChange={handleInputChange}
                        placeholder="09123456789"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="emergencyContactPhone2">Secondary Phone</label>
                      <input
                        type="tel"
                        id="emergencyContactPhone2"
                        name="emergencyContactPhone2"
                        value={staffFormData.emergencyContactPhone2}
                        onChange={handleInputChange}
                        placeholder="09876543211"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Address</h4>
                  
                  <div className="form-group">
                    <label htmlFor="streetAddress">Street Address</label>
                    <input
                      type="text"
                      id="streetAddress"
                      name="streetAddress"
                      value={staffFormData.streetAddress}
                      onChange={handleInputChange}
                      placeholder="Complete street address"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="barangay">Barangay</label>
                      <input
                        type="text"
                        id="barangay"
                        name="barangay"
                        value={staffFormData.barangay}
                        onChange={handleInputChange}
                        placeholder="Barangay"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="municipality">Municipality</label>
                      <input
                        type="text"
                        id="municipality"
                        name="municipality"
                        value={staffFormData.municipality}
                        onChange={handleInputChange}
                        placeholder="Municipality"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="action-btn cancel-btn" onClick={closeModals}>
                    Cancel
                  </button>
                  <button className="action-btn save-btn" onClick={handleCreateStaff}>
                    Create Staff Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && selectedStaff && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModals}>×</button>
            
            <div className="modal-header">
              <h3>Edit Staff Member</h3>
              <p>Staff ID: #{selectedStaff.staffId}</p>
            </div>

            <div className="modal-body">
              <div className="staff-form">
                <div className="form-section">
                  <h4>Personal Information</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="editFirstName">First Name *</label>
                      <input
                        type="text"
                        id="editFirstName"
                        name="firstName"
                        value={staffFormData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editLastName">Last Name *</label>
                      <input
                        type="text"
                        id="editLastName"
                        name="lastName"
                        value={staffFormData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="editEmail">Email *</label>
                      <input
                        type="email"
                        id="editEmail"
                        name="email"
                        value={staffFormData.email}
                        onChange={handleInputChange}
                        placeholder="staff@wahingclinic.com"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editPhone">Phone Number *</label>
                      <input
                        type="tel"
                        id="editPhone"
                        name="phone"
                        value={staffFormData.phone}
                        onChange={handleInputChange}
                        placeholder="09123456789"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="editPassword">New Password (leave blank to keep current)</label>
                      <input
                        type="password"
                        id="editPassword"
                        name="password"
                        value={staffFormData.password}
                        onChange={handleInputChange}
                        placeholder="Enter new password"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editDateOfBirth">Date of Birth</label>
                      <input
                        type="date"
                        id="editDateOfBirth"
                        name="dateOfBirth"
                        value={staffFormData.dateOfBirth}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Emergency Contact</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="editEmergencyContactName">Contact Name</label>
                      <input
                        type="text"
                        id="editEmergencyContactName"
                        name="emergencyContactName"
                        value={staffFormData.emergencyContactName}
                        onChange={handleInputChange}
                        placeholder="Emergency contact name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editEmergencyContactRelationship">Relationship</label>
                      <input
                        type="text"
                        id="editEmergencyContactRelationship"
                        name="emergencyContactRelationship"
                        value={staffFormData.emergencyContactRelationship}
                        onChange={handleInputChange}
                        placeholder="Relationship"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="editEmergencyContactPhone1">Primary Phone</label>
                      <input
                        type="tel"
                        id="editEmergencyContactPhone1"
                        name="emergencyContactPhone1"
                        value={staffFormData.emergencyContactPhone1}
                        onChange={handleInputChange}
                        placeholder="09123456789"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editEmergencyContactPhone2">Secondary Phone</label>
                      <input
                        type="tel"
                        id="editEmergencyContactPhone2"
                        name="emergencyContactPhone2"
                        value={staffFormData.emergencyContactPhone2}
                        onChange={handleInputChange}
                        placeholder="09876543211"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Address</h4>
                  
                  <div className="form-group">
                    <label htmlFor="editStreetAddress">Street Address</label>
                    <input
                      type="text"
                      id="editStreetAddress"
                      name="streetAddress"
                      value={staffFormData.streetAddress}
                      onChange={handleInputChange}
                      placeholder="Complete street address"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="editBarangay">Barangay</label>
                      <input
                        type="text"
                        id="editBarangay"
                        name="barangay"
                        value={staffFormData.barangay}
                        onChange={handleInputChange}
                        placeholder="Barangay"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editMunicipality">Municipality</label>
                      <input
                        type="text"
                        id="editMunicipality"
                        name="municipality"
                        value={staffFormData.municipality}
                        onChange={handleInputChange}
                        placeholder="Municipality"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="action-btn cancel-btn" onClick={closeModals}>
                    Cancel
                  </button>
                  <button className="action-btn save-btn" onClick={handleUpdateStaff}>
                    Update Staff Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Modal */}
      {isViewModalOpen && selectedStaff && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="staff-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModals}>×</button>
            
            <div className="modal-header">
              <h3>Staff Member Details</h3>
            </div>

            <div className="modal-body">
              <div className="staff-detail">
                <div className="detail-section">
                  <h4>Personal Information</h4>
                  <p><strong>Staff ID:</strong> #{selectedStaff.staffId}</p>
                  <p><strong>Name:</strong> {selectedStaff.firstName} {selectedStaff.lastName}</p>
                  <p><strong>Email:</strong> {selectedStaff.email}</p>
                  <p><strong>Phone:</strong> {selectedStaff.phone}</p>
                  <p><strong>Date of Birth:</strong> {formatDate(selectedStaff.dateOfBirth)}</p>
                </div>

                <div className="detail-section">
                  <h4>Emergency Contact</h4>
                  <p><strong>Name:</strong> {selectedStaff.emergencyContactName || 'Not provided'}</p>
                  <p><strong>Relationship:</strong> {selectedStaff.emergencyContactRelationship || 'Not provided'}</p>
                  <p><strong>Primary Phone:</strong> {selectedStaff.emergencyContactPhone1 || 'Not provided'}</p>
                  <p><strong>Secondary Phone:</strong> {selectedStaff.emergencyContactPhone2 || 'Not provided'}</p>
                </div>

                <div className="detail-section">
                  <h4>Address</h4>
                  <p><strong>Street Address:</strong> {selectedStaff.streetAddress || 'Not provided'}</p>
                  <p><strong>Barangay:</strong> {selectedStaff.barangay || 'Not provided'}</p>
                  <p><strong>Municipality:</strong> {selectedStaff.municipality || 'Not provided'}</p>
                </div>

                <div className="detail-section">
                  <h4>Account Information</h4>
                  <p><strong>Created:</strong> {formatDateTime(selectedStaff.createdAt)}</p>
                  <p><strong>Last Updated:</strong> {formatDateTime(selectedStaff.updatedAt)}</p>
                </div>
              </div>

              <div className="modal-actions">
                <button className="action-btn close-btn" onClick={closeModals}>
                  Close
                </button>
                <button 
                  className="action-btn edit-btn"
                  onClick={() => {
                    closeModals();
                    openEditModal(selectedStaff);
                  }}
                >
                  Edit Staff Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
