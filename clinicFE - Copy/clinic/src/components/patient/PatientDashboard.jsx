"use client"

import { useState, useEffect } from "react"
import Booking from "./Booking"
import Appointments from "./Appointments"
import Profile from "./Profile"
import Feedback from "./Feedback"
import Reminders from "./Reminders"
import "./PatientDashboard.css"

const PatientDashboard = ({ onNavigate, onLogout }) => {
  const [patient, setPatient] = useState(null)
  const [activeSection, setActiveSection] = useState("home")
  const [recentActivities, setRecentActivities] = useState([])
  const [services, setServices] = useState([])
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [pendingReschedules, setPendingReschedules] = useState([])
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)

  // Doctor's Note viewer state
  const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false)
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [noteContent, setNoteContent] = useState(null)
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteError, setNoteError] = useState(null)

  // Mobile navigation state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  // Function to get section from URL hash
  const getSectionFromURL = () => {
    const hash = window.location.hash.replace("#", "")
    return ["home", "book", "appointments", "feedback", "reminders", "settings"].includes(hash) ? hash : "home"
  }

  useEffect(() => {
    const patientData = localStorage.getItem("patient")
    if (patientData) {
      try {
        const parsedData = JSON.parse(patientData);
        setPatient(parsedData);
      } catch (error) {
        console.error('Error parsing patient data:', error);
        localStorage.removeItem('patient');
        localStorage.removeItem('rememberMe');
        onNavigate('home');
        return;
      }
    } else {
      onNavigate('home');
      return;
    }

    const sectionFromURL = getSectionFromURL()
    setActiveSection(sectionFromURL)

    const handleHashChange = () => {
      const newSection = getSectionFromURL()
      setActiveSection(newSection)
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [onNavigate])

  useEffect(() => {
    if (patient) {
      fetchServices();
      fetchPatientReschedules();
    }
  }, [patient])

  useEffect(() => {
    if (patient && services.length > 0) {
      fetchRecentActivities()
    }
  }, [patient, services])

  const fetchServices = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/medical-services")
      if (response.ok) {
        const servicesData = await response.json()
        setServices(servicesData)
      }
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }

  const fetchRecentActivities = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/appointments/patient/${patient.patientId}`)
      if (response.ok) {
        const appointments = await response.json()

        // Get upcoming appointments (future dates with pending/confirmed status)
        const now = new Date()
        const upcoming = appointments
          .filter(apt => {
            const aptDate = new Date(apt.preferredDateTime || apt.appointmentDate || apt.createdAt)
            return aptDate >= now && (apt.status === 'Pending' || apt.status === 'Confirmed' || apt.status === 'Accepted')
          })
          .sort((a, b) => new Date(a.preferredDateTime || a.appointmentDate) - new Date(b.preferredDateTime || b.appointmentDate))
          .slice(0, 3)
        
        setUpcomingAppointments(upcoming)

        const sortedAppointments = appointments
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)

        const activities = sortedAppointments.map((appointment) => {
          const dateISO =
            appointment.appointmentDate ||
            appointment.appointmentDateTime ||
            appointment.date ||
            appointment.scheduledAt ||
            appointment.createdAt

          return {
            id: appointment.appointmentId,
            type: `You booked ${getServiceName(appointment.serviceId)}`,
            date: new Date(dateISO).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            dateISO,
            status: appointment.status || "Pending",
          }
        })

        setRecentActivities(activities)
      }
    } catch (error) {
      console.error("Error fetching recent activities:", error)
      setRecentActivities([])
    }
  }

  const getServiceName = (serviceId) => {
    const service = services.find((s) => s.serviceId === serviceId)
    return service ? service.serviceName : "Medical Service"
  }

  const handleSectionChange = (section) => {
    setActiveSection(section)
    window.location.hash = section
  }

  const handleLogout = () => {
    localStorage.removeItem("patient");
    localStorage.removeItem("rememberMe");
    window.location.hash = "";
    onLogout();
    onNavigate("home");
    window.location.reload(); // <-- Add this line to force a reload
  }

  // Doctor's Note helpers
  const openNoteViewer = (dateISO) => {
    const d = dateISO ? new Date(dateISO) : new Date()
    setNoteDate(d.toISOString().slice(0, 10))
    setNoteContent(null)
    setNoteError(null)
    setIsNoteViewerOpen(true)
  }

  const closeNoteViewer = () => {
    setIsNoteViewerOpen(false)
  }

  const fetchDoctorNote = async () => {
    if (!patient) return
    setNoteLoading(true)
    setNoteError(null)
    setNoteContent(null)
    try {
      const weekday = new Date(noteDate).getDay()

      let res = await fetch("http://localhost:3000/api/schedules")
      if (!res.ok) {
        res = await fetch("http://localhost:3000/api/schedule")
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.data || []

      const getWeekday = (s) =>
        Number(s?.weekday ?? s?.day_of_week ?? s?.day ?? s?.dow)

      const sched = (list || []).find((s) => getWeekday(s) === Number(weekday))
      const notes = sched?.notes

      setNoteContent(notes && String(notes).trim() ? String(notes) : "No note found for this day.")
    } catch (e) {
      console.error("Error fetching doctor's note:", e)
      setNoteError("Unable to load note. Please try again.")
    } finally {
      setNoteLoading(false)
    }
  }

  const formatAppointmentDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatAppointmentTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  // Fetch patient's pending reschedules
  const fetchPatientReschedules = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/reschedules/patient/${patient.patientId}`);
      if (response.ok) {
        const data = await response.json();
        const pending = (Array.isArray(data) ? data : []).filter(r => r.confirmation === 'Pending');
        setPendingReschedules(pending);
        setShowRescheduleModal(pending.length > 0);
      }
    } catch (error) {
      setPendingReschedules([]);
      setShowRescheduleModal(false);
    }
  };

  // Handle patient action on reschedule (Confirm/Decline)
  const handleRescheduleAction = async (rescheduleId, action) => {
    try {
      const response = await fetch(`http://localhost:3000/api/reschedules/${rescheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: action })
      });
      if (response.ok) {
        // Remove from pending list and close modal if none left
        const updated = pendingReschedules.filter(r => r.rescheduleId !== rescheduleId);
        setPendingReschedules(updated);
        if (updated.length === 0) setShowRescheduleModal(false);
      }
    } catch (error) {
      // Optionally show error
    }
  };

  if (!patient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-wrapper">
      {/* Top Header */}
      <header className="top-header">
        <div className="header-brand">
          {/* Burger icon for mobile */}
          <button
            className="burger-btn"
            aria-label="Open navigation"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <span className="burger-icon">
              <span className="burger-line"></span>
              <span className="burger-line"></span>
              <span className="burger-line"></span>
            </span>
          </button>
          <div className="brand-logo">
            <span>WMC</span>
          </div>
          <div className="brand-text">
            <h1>Wahing Medical Clinic</h1>
            <p>Patient Health Dashboard</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-icon-btn" onClick={() => handleSectionChange("reminders")}>
            <span>🔔</span>
          </button>
          <button className="header-icon-btn" onClick={() => handleSectionChange("settings")}>
            <span>⚙️</span>
          </button>
          <button className="header-icon-btn user-btn" onClick={handleLogout}>
            <span>👤</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Panel */}
      {isMobileNavOpen && (
        <div className="mobile-nav-overlay" onClick={() => setIsMobileNavOpen(false)}>
          <nav
            className="mobile-nav-panel"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="mobile-nav-close"
              aria-label="Close navigation"
              onClick={() => setIsMobileNavOpen(false)}
            >
              ×
            </button>
            <div className="mobile-nav-list">
              <button
                className={`mobile-nav-item ${activeSection === "home" ? "active" : ""}`}
                onClick={() => { handleSectionChange("home"); setIsMobileNavOpen(false); }}
              >
                Dashboard
              </button>
              <div className="mobile-nav-divider"></div>
              <button
                className={`mobile-nav-item ${activeSection === "book" ? "active" : ""}`}
                onClick={() => { handleSectionChange("book"); setIsMobileNavOpen(false); }}
              >
                Book Appointment
              </button>
              <div className="mobile-nav-divider"></div>
              <button
                className={`mobile-nav-item ${activeSection === "appointments" ? "active" : ""}`}
                onClick={() => { handleSectionChange("appointments"); setIsMobileNavOpen(false); }}
              >
                My Appointments
              </button>
              <div className="mobile-nav-divider"></div>
              <button
                className={`mobile-nav-item ${activeSection === "feedback" ? "active" : ""}`}
                onClick={() => { handleSectionChange("feedback"); setIsMobileNavOpen(false); }}
              >
                Feedback
              </button>
              <div className="mobile-nav-divider"></div>
              <button
                className={`mobile-nav-item ${activeSection === "reminders" ? "active" : ""}`}
                onClick={() => { handleSectionChange("reminders"); setIsMobileNavOpen(false); }}
              >
                Reminders
              </button>
              <div className="mobile-nav-divider"></div>
              <button
                className={`mobile-nav-item ${activeSection === "settings" ? "active" : ""}`}
                onClick={() => { handleSectionChange("settings"); setIsMobileNavOpen(false); }}
              >
                Settings
              </button>
              <div className="mobile-nav-divider"></div>
              <button className="mobile-nav-item logout" onClick={() => { handleLogout(); setIsMobileNavOpen(false); }}>
                Log Out
              </button>
            </div>
            <div className="mobile-nav-footer">
              <div className="mobile-nav-divider"></div>
              <div className="mobile-nav-footer-text">
                Clinic Hours: MONDAY - SUNDAY, 9AM - 8PM
              </div>
            </div>
          </nav>
        </div>
      )}

      <div className="dashboard-layout">
        {/* Sidebar for desktop */}
        <aside className="sidebar-modern">
          <nav className="sidebar-nav-modern">
            <button
              className={`nav-item-modern ${activeSection === "home" ? "active" : ""}`}
              onClick={() => handleSectionChange("home")}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-label">Dashboard</span>
            </button>
            <button
              className={`nav-item-modern ${activeSection === "book" ? "active" : ""}`}
              onClick={() => handleSectionChange("book")}
            >
              <span className="nav-icon">📅</span>
              <span className="nav-label">Book Appointment</span>
            </button>
            <button
              className={`nav-item-modern ${activeSection === "appointments" ? "active" : ""}`}
              onClick={() => handleSectionChange("appointments")}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-label">My Appointments</span>
            </button>
            <button
              className={`nav-item-modern ${activeSection === "feedback" ? "active" : ""}`}
              onClick={() => handleSectionChange("feedback")}
            >
              <span className="nav-icon">⭐</span>
              <span className="nav-label">Feedback</span>
            </button>
            <button
              className={`nav-item-modern ${activeSection === "reminders" ? "active" : ""}`}
              onClick={() => handleSectionChange("reminders")}
            >
              <span className="nav-icon">🔔</span>
              <span className="nav-label">Reminders</span>
            </button>
            <button
              className={`nav-item-modern ${activeSection === "settings" ? "active" : ""}`}
              onClick={() => handleSectionChange("settings")}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </button>
          </nav>
          <div className="sidebar-logout">
            <button className="logout-btn-modern" onClick={handleLogout}>
              <span>🚪</span>
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile sidebar navigation */}
        {isMobileNavOpen && (
          <div className="mobile-nav-overlay" onClick={() => setIsMobileNavOpen(false)}>
            <nav
              className="mobile-nav-panel"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="mobile-nav-close"
                aria-label="Close navigation"
                onClick={() => setIsMobileNavOpen(false)}
              >
                ×
              </button>
              <div className="mobile-nav-list">
                <button
                  className={`mobile-nav-item ${activeSection === "home" ? "active" : ""}`}
                  onClick={() => { handleSectionChange("home"); setIsMobileNavOpen(false); }}
                >
                  Dashboard
                </button>
                <div className="mobile-nav-divider"></div>
                <button
                  className={`mobile-nav-item ${activeSection === "book" ? "active" : ""}`}
                  onClick={() => { handleSectionChange("book"); setIsMobileNavOpen(false); }}
                >
                  Book Appointment
                </button>
                <div className="mobile-nav-divider"></div>
                <button
                  className={`mobile-nav-item ${activeSection === "appointments" ? "active" : ""}`}
                  onClick={() => { handleSectionChange("appointments"); setIsMobileNavOpen(false); }}
                >
                  My Appointments
                </button>
                <div className="mobile-nav-divider"></div>
                <button
                  className={`mobile-nav-item ${activeSection === "feedback" ? "active" : ""}`}
                  onClick={() => { handleSectionChange("feedback"); setIsMobileNavOpen(false); }}
                >
                  Feedback
                </button>
                <div className="mobile-nav-divider"></div>
                <button
                  className={`mobile-nav-item ${activeSection === "reminders" ? "active" : ""}`}
                  onClick={() => { handleSectionChange("reminders"); setIsMobileNavOpen(false); }}
                >
                  Reminders
                </button>
                <div className="mobile-nav-divider"></div>
                <button
                  className={`mobile-nav-item ${activeSection === "settings" ? "active" : ""}`}
                  onClick={() => { handleSectionChange("settings"); setIsMobileNavOpen(false); }}
                >
                  Settings
                </button>
                <div className="mobile-nav-divider"></div>
                <button className="mobile-nav-item logout" onClick={() => { handleLogout(); setIsMobileNavOpen(false); }}>
                  Log Out
                </button>
              </div>
              <div className="mobile-nav-footer">
                <div className="mobile-nav-divider"></div>
                <div className="mobile-nav-footer-text">
                  Clinic Hours: MONDAY - SUNDAY, 9AM - 8PM
                </div>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="main-content-modern">
          {activeSection === "home" && (
            <div className="home-modern">
              {/* Health Overview Card */}
              <div className="content-grid">
                <div className="card-modern health-overview">
                  <div className="card-header-modern">
                    <h2>Health Overview</h2>
                    <p>Your wellness at a glance</p>
                  </div>
                  <div className="health-metrics">
                    <div className="metric-item">
                      <div className="metric-icon activity">
                        <span>📊</span>
                      </div>
                      <div className="metric-info">
                        <h4>Total Appointments</h4>
                        <p>Lifetime visits</p>
                      </div>
                      <div className="metric-value">
                        <span className="value-number">{recentActivities.length}</span>
                        <span className="value-unit">visits</span>
                      </div>
                      <div className="metric-bar">
                        <div className="metric-progress" style={{ width: `${Math.min(recentActivities.length * 10, 100)}%` }}></div>
                      </div>
                    </div>

                    <div className="metric-item">
                      <div className="metric-icon heart">
                        <span>❤️</span>
                      </div>
                      <div className="metric-info">
                        <h4>Health Status</h4>
                        <p>Current condition</p>
                      </div>
                      <div className="metric-value">
                        <span className="value-number good">Good</span>
                      </div>
                      <div className="metric-bar">
                        <div className="metric-progress heart-progress" style={{ width: "85%" }}></div>
                      </div>
                    </div>

                    <div className="metric-item">
                      <div className="metric-icon energy">
                        <span>⚡</span>
                      </div>
                      <div className="metric-info">
                        <h4>Upcoming</h4>
                        <p>Scheduled appointments</p>
                      </div>
                      <div className="metric-value">
                        <span className="value-number">{upcomingAppointments.length}</span>
                        <span className="value-unit">pending</span>
                      </div>
                      <div className="metric-bar">
                        <div className="metric-progress energy-progress" style={{ width: `${Math.min(upcomingAppointments.length * 33, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vital Signs Card */}
                <div className="card-modern vital-signs">
                  <div className="card-header-modern">
                    <h2>Patient Info</h2>
                    <p>Your profile details</p>
                  </div>
                  <div className="vital-list">
                    <div className="vital-item">
                      <div className="vital-icon temp">
                        <span>👤</span>
                      </div>
                      <div className="vital-info">
                        <h4>Name</h4>
                        <p>{patient.firstName} {patient.lastName}</p>
                      </div>
                    </div>
                    <div className="vital-item">
                      <div className="vital-icon bp">
                        <span>✉️</span>
                      </div>
                      <div className="vital-info">
                        <h4>Email</h4>
                        <p>{patient.email}</p>
                      </div>
                    </div>
                    <div className="vital-item">
                      <div className="vital-icon o2">
                        <span>📞</span>
                      </div>
                      <div className="vital-info">
                        <h4>Phone</h4>
                        <p>{patient.phone}</p>
                      </div>
                    </div>
                    <div className="vital-item">
                      <div className="vital-icon id">
                        <span>🆔</span>
                      </div>
                      <div className="vital-info">
                        <h4>Patient ID</h4>
                        <p>#{patient.patientId || patient.id || "1"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="content-grid bottom-row">
                {/* Upcoming Appointments */}
                <div className="card-modern appointments-card">
                  <div className="card-header-modern">
                    <h2>Upcoming Appointments</h2>
                    <p>Your scheduled visits</p>
                  </div>
                  <div className="appointments-list">
                    {upcomingAppointments.length === 0 ? (
                      <div className="no-appointments">
                        <p>No upcoming appointments</p>
                        <button className="btn-primary" onClick={() => handleSectionChange("book")}>
                          Book Now
                        </button>
                      </div>
                    ) : (
                      upcomingAppointments.map((apt) => (
                        <div key={apt.appointmentId} className="appointment-item">
                          <div className="appointment-avatar">
                            <span>👨‍⚕️</span>
                          </div>
                          <div className="appointment-details">
                            <h4>Dr. Jessieneth Wahing</h4>
                            <p>{getServiceName(apt.serviceId)}</p>
                            <div className="appointment-meta">
                              <span>📅 {formatAppointmentDate(apt.preferredDateTime || apt.appointmentDate)}</span>
                              <span>🕐 {formatAppointmentTime(apt.preferredDateTime || apt.appointmentDate)}</span>
                            </div>
                          </div>
                          <div className="appointment-actions">
                            <button className="btn-confirm">Confirmed</button>
                            <button className="btn-reschedule" onClick={() => handleSectionChange("appointments")}>View</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions / Reminders */}
                <div className="card-modern reminders-card">
                  <div className="card-header-modern">
                    <h2>Quick Actions</h2>
                    <p>Common tasks</p>
                  </div>
                  <div className="quick-actions-modern">
                    <button className="quick-action-item" onClick={() => handleSectionChange("book")}>
                      <div className="action-icon book">
                        <span>📅</span>
                      </div>
                      <div className="action-info">
                        <h4>Book Appointment</h4>
                        <p>Schedule a new visit</p>
                      </div>
                    </button>
                    <button className="quick-action-item" onClick={() => handleSectionChange("appointments")}>
                      <div className="action-icon view">
                        <span>📋</span>
                      </div>
                      <div className="action-info">
                        <h4>View History</h4>
                        <p>See past appointments</p>
                      </div>
                    </button>
                    <button className="quick-action-item" onClick={() => openNoteViewer()}>
                      <div className="action-icon note">
                        <span>📝</span>
                      </div>
                      <div className="action-info">
                        <h4>Doctor's Note</h4>
                        <p>View clinic schedule notes</p>
                      </div>
                    </button>
                    <button className="quick-action-item" onClick={() => handleSectionChange("feedback")}>
                      <div className="action-icon feedback">
                        <span>⭐</span>
                      </div>
                      <div className="action-info">
                        <h4>Leave Feedback</h4>
                        <p>Rate your experience</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* About Doctor Section */}
              <div className="card-modern doctor-card">
                <div className="doctor-content-modern">
                  <div className="doctor-info-modern">
                    <h2>About Your Doctor</h2>
                    <h3>Dr. Jessieneth Stephen F. Wahing</h3>
                    <div className="doctor-badges">
                      <span className="badge">General Medicine</span>
                      <span className="badge">10+ Years Experience</span>
                    </div>
                    <p className="doctor-bio">
                      "Dedicated to providing excellent healthcare services to the community with compassion and expertise."
                    </p>
                    <div className="doctor-vision-mission">
                      <div className="vm-item">
                        <span className="vm-icon">🎯</span>
                        <div>
                          <h4>Vision</h4>
                          <p>To be the leading healthcare provider in our community, delivering compassionate and quality medical care.</p>
                        </div>
                      </div>
                      <div className="vm-item">
                        <span className="vm-icon">❤️</span>
                        <div>
                          <h4>Mission</h4>
                          <p>To offer accessible, patient-centered, and high-quality healthcare services that improve lives.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="doctor-image-modern">
                    <img
                      src="/assets/wahing.jpg"
                      alt="Dr. Jessieneth Stephen F. Wahing"
                    />
                    <div className="doctor-name-tag">
                      <h4>DR. JESSIENETH STEPHEN WAHING</h4>
                      <p>General Practitioner</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "book" && <Booking patient={patient} />}
          {activeSection === "appointments" && <Appointments patient={patient} />}
          {activeSection === "feedback" && <Feedback patient={patient} />}
          {activeSection === "settings" && <Profile patient={patient} />}
          {activeSection === "reminders" && <Reminders patient={patient} />}

          {/* Doctor's Note Modal */}
          {isNoteViewerOpen && (
            <div className="modal-overlay-modern" onClick={closeNoteViewer}>
              <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-modern">
                  <h3>📝 Doctor's Note</h3>
                  <button className="modal-close-modern" onClick={closeNoteViewer}>×</button>
                </div>
                <div className="modal-body-modern">
                  <div className="note-date-picker">
                    <label htmlFor="noteDate">Select date:</label>
                    <input
                      id="noteDate"
                      type="date"
                      value={noteDate}
                      onChange={(e) => setNoteDate(e.target.value)}
                    />
                    <button className="btn-primary" onClick={fetchDoctorNote} disabled={noteLoading}>
                      {noteLoading ? "Loading..." : "View Note"}
                    </button>
                  </div>

                  {noteError && <div className="note-error">{noteError}</div>}

                  {noteContent && (
                    <div className="note-content">
                      {noteContent}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reschedule Modal for Pending Reschedules */}
          {showRescheduleModal && pendingReschedules.length > 0 && (
            <div className="modal-overlay-modern" onClick={() => setShowRescheduleModal(false)}>
              <div className="modal-content-modern" onClick={e => e.stopPropagation()}>
                <div className="modal-header-modern">
                  <h3>Appointment Reschedule Request</h3>
                  <button className="modal-close-modern" onClick={() => setShowRescheduleModal(false)}>×</button>
                </div>
                <div className="modal-body-modern">
                  {pendingReschedules.map(reschedule => (
                    <div key={reschedule.rescheduleId} className="reschedule-request-card" style={{
                      border: '1px solid #eee',
                      borderRadius: 8,
                      marginBottom: 16,
                      padding: 12,
                      background: '#fafbfc'
                    }}>
                      <div style={{ marginBottom: 6 }}>
                        <strong>Reason:</strong> {reschedule.notes}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <strong>Requested New Schedule:</strong>
                        <span style={{ marginLeft: 6 }}>
                          {reschedule.preferredDateTime
                            ? new Date(reschedule.preferredDateTime).toLocaleString('en-US')
                            : 'See appointment details'}
                        </span>
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <strong>Status:</strong> <span style={{ color: '#ff9800' }}>{reschedule.confirmation}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn-primary"
                          style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600 }}
                          onClick={() => handleRescheduleAction(reschedule.rescheduleId, 'Confirmed')}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600 }}
                          onClick={() => handleRescheduleAction(reschedule.rescheduleId, 'Declined')}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowRescheduleModal(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default PatientDashboard
