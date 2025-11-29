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

  // Doctor's Note viewer state
  const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false)
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [noteContent, setNoteContent] = useState(null)
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteError, setNoteError] = useState(null)

  // Function to get section from URL hash
  const getSectionFromURL = () => {
    const hash = window.location.hash.replace("#", "")
    return ["home", "book", "appointments", "feedback", "reminders", "settings"].includes(hash) ? hash : "home"
  }

  useEffect(() => {
    // Get patient data from localStorage
    const patientData = localStorage.getItem("patient")
    if (patientData) {
      try {
        const parsedData = JSON.parse(patientData);
        setPatient(parsedData);
      } catch (error) {
        console.error('Error parsing patient data:', error);
        // Only redirect if there's no valid patient data
        localStorage.removeItem('patient');
        localStorage.removeItem('rememberMe');
        onNavigate('home');
        return;
      }
    } else {
      // No patient data found, redirect to home
      onNavigate('home');
      return;
    }

    // Set active section from URL hash
    const sectionFromURL = getSectionFromURL()
    setActiveSection(sectionFromURL)

    // Listen for hash changes
    const handleHashChange = () => {
      const newSection = getSectionFromURL()
      setActiveSection(newSection)
    }

    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [onNavigate])

  useEffect(() => {
    if (patient) {
      fetchServices()
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

        // Sort appointments by creation date (most recent first) and take the last 3
        const sortedAppointments = appointments
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)

        // Transform appointments into activity format
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
      // Fallback to empty array if there's an error
      setRecentActivities([])
    }
  }

  const getServiceName = (serviceId) => {
    const service = services.find((s) => s.serviceId === serviceId)
    return service ? service.serviceName : "Medical Service"
  }

  const handleSectionChange = (section) => {
    setActiveSection(section)
    // Update URL hash without page reload
    window.location.hash = section
  }

  const handleLogout = () => {
    localStorage.removeItem("patient")
    localStorage.removeItem("rememberMe")
    // Clear hash when logging out
    window.location.hash = ""
    onLogout()
    onNavigate("home")
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

      // Try plural path first, then fallback to singular if needed
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

  if (!patient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="clinic-logo">🏥</div>
          <h1>Wahing Medical Clinic</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span>🚪</span>
          LOG-OUT
        </button>
      </header>

      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Main Menu</h3>
          </div>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeSection === "home" ? "active" : ""}`}
              onClick={() => handleSectionChange("home")}
            >
              <span className="nav-item-icon">🏠</span>
              Home
            </button>
            <button
              className={`nav-item ${activeSection === "book" ? "active" : ""}`}
              onClick={() => handleSectionChange("book")}
            >
              <span className="nav-item-icon">📅</span>
              Book Appointment
            </button>
            <button
              className={`nav-item ${activeSection === "appointments" ? "active" : ""}`}
              onClick={() => handleSectionChange("appointments")}
            >
              <span className="nav-item-icon">📋</span>
              My Appointments
            </button>
            <button
              className={`nav-item ${activeSection === "feedback" ? "active" : ""}`}
              onClick={() => handleSectionChange("feedback")}
            >
              <span className="nav-item-icon">⭐</span>
              Feedback
            </button>
            <button
              className={`nav-item ${activeSection === "reminders" ? "active" : ""}`}
              onClick={() => handleSectionChange("reminders")}
            >
              <span className="nav-item-icon">🔔</span>
              Reminders
            </button>
          </nav>

          <div className="sidebar-separator"></div>

          <div className="sidebar-footer">
            <h4>Others</h4>
            <button
              className={`nav-item ${activeSection === "settings" ? "active" : ""}`}
              onClick={() => handleSectionChange("settings")}
            >
              <span className="nav-item-icon">⚙️</span>
              Account Settings
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {activeSection === "home" && (
            <div className="home-section">
              {/* Welcome Section */}
              <div className="welcome-section">
                <div className="welcome-content">
                  <div className="user-avatar">
                    {patient.firstName?.[0]}
                    {patient.lastName?.[0]}
                  </div>
                  <div className="welcome-text">
                    <h2>
                      Welcome back, {patient.firstName} {patient.lastName}!
                    </h2>
                    <p>We're glad to see you again</p>
                  </div>
                </div>
                
              </div>

              {/* Dashboard Grid */}
              <div className="dashboard-grid">
                {/* Profile Information */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span>👤</span>
                      Profile Information
                    </h3>
                  </div>
                  <div className="card-content">
                    <div className="profile-details">
                      <div className="profile-item">
                        <div className="profile-item-label">
                          <span>✉️</span>
                          <span>Email:</span>
                        </div>
                        <span className="profile-item-value">{patient.email}</span>
                      </div>
                      <div className="profile-item">
                        <div className="profile-item-label">
                          <span>📞</span>
                          <span>Phone:</span>
                        </div>
                        <span className="profile-item-value">{patient.phone}</span>
                      </div>
                      <div className="profile-item">
                        <div className="profile-item-label">
                          <span>🆔</span>
                          <span>Patient ID:</span>
                        </div>
                        <span className="profile-item-value">UID #{patient.patientId || patient.id || "1"}</span>
                      </div>
                      <div className="profile-item">
                        <div className="profile-item-label">
                          <span>⏰</span>
                          <span>Member Since:</span>
                        </div>
                        <span className="profile-item-value">
                          {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : "Recently joined"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span>📊</span>
                      Recent Activity
                    </h3>
                  </div>
                  <div className="card-content">
                    <div className="activity-list">
                      {recentActivities.length === 0 ? (
                        <div className="no-activities">
                          <p>No recent appointments found.</p>
                          <button className="action-btn action-btn-outline" onClick={() => handleSectionChange("book")}>
                            Book Your First Appointment
                          </button>
                        </div>
                      ) : (
                        recentActivities.map((activity) => (
                          <div key={activity.id} className="activity-item">
                            <div className="activity-info">
                              <p>{activity.type}</p>
                              <small>{activity.date}</small>
                            </div>
                            <div className="activity-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              {/* Removed the View Note button per request */}
                              <div className={`activity-status ${activity.status.toLowerCase()}`}>{activity.status}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <span>⚡</span>
                      Quick Actions
                    </h3>
                  </div>
                  <div className="card-content">
                    <div className="quick-actions">
                      <button className="action-btn action-btn-primary" onClick={() => handleSectionChange("book")}>
                        <span>📅</span>
                        Book Appointment
                      </button>
                      <button
                        className="action-btn action-btn-outline"
                        onClick={() => handleSectionChange("appointments")}
                      >
                        <span>📊</span>
                        View History
                      </button>
                      <button className="action-btn action-btn-outline" onClick={() => handleSectionChange("settings")}>
                        <span>👤</span>
                        Edit Profile
                      </button>
                      {/* New: Open Doctor's Note viewer for a specific day */}
                      <button className="action-btn action-btn-outline" onClick={() => openNoteViewer()}>
                        <span>📝</span>
                        Doctor's Note
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* About Doctor Section */}
              <div className="about-doctor-section">
                <div className="doctor-header">
                  <h2>🏥 About Doctor Wahing</h2>
                </div>
                <div className="doctor-content">
                  <div className="doctor-info">
                    <h3>Dr. Jessieneth Stephen F. Wahing</h3>
                    <div className="doctor-specialties">
                      <div className="specialty-item">
                        <div className="specialty-bullet"></div>
                        <span>
                          <strong>Specialization:</strong> General Medicine
                        </span>
                      </div>
                      <div className="specialty-item">
                        <div className="specialty-bullet"></div>
                        <span>
                          <strong>Years of Experience:</strong> 10+ years
                        </span>
                      </div>
                      <div className="specialty-item">
                        <div className="specialty-bullet"></div>
                        <span>
                          <strong>Short Bio:</strong> "Dedicated to providing excellent healthcare services to the
                          community."
                        </span>
                      </div>
                    </div>

                    <div className="doctor-mission-vision">
                      <div className="vision-card">
                        <h4>
                          <span>🎯</span>
                          Vision
                        </h4>
                        <p>
                          "To be the leading healthcare provider in our community, delivering compassionate and quality
                          medical care."
                        </p>
                      </div>
                      <div className="mission-card">
                        <h4>
                          <span>❤️</span>
                          Mission
                        </h4>
                        <p>
                          "To offer accessible, patient-centered, and high-quality healthcare services that improve the
                          lives of our patients."
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="doctor-image-container">
                    <img
                      src="/assets/wahing.jpg" 
                      alt="Dr. Jessieneth Stephen F. Wahing"
                      className="doctor-image"
                    />
                    <div className="doctor-card">
                      <h4>DR. JESSIENETH STEPHEN WAHING</h4>
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
            <div
              className="modal-backdrop"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="dashboard-card"
                style={{ width: "min(720px, 92vw)", maxHeight: "85vh", overflow: "auto" }}
              >
                <div className="card-header">
                  <h3 className="card-title">
                    <span>📝</span>
                    Doctor's Note
                  </h3>
                </div>
                <div className="card-content">
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
                    <label htmlFor="noteDate"><strong>Select date:</strong></label>
                    <input
                      id="noteDate"
                      type="date"
                      value={noteDate}
                      onChange={(e) => setNoteDate(e.target.value)}
                    />
                    <button className="action-btn action-btn-primary" onClick={fetchDoctorNote} disabled={noteLoading}>
                      {noteLoading ? "Loading..." : "View Note"}
                    </button>
                    <button className="action-btn action-btn-outline" onClick={closeNoteViewer}>Close</button>
                  </div>

                  {noteError && (
                    <div style={{ color: "#b00020", marginBottom: "0.75rem" }}>{noteError}</div>
                  )}

                  {noteContent && (
                    <div
                      className="note-body"
                      style={{
                        whiteSpace: "pre-wrap",
                        background: "#fafafa",
                        border: "1px solid #eee",
                        borderRadius: "8px",
                        padding: "1rem",
                      }}
                    >
                      {noteContent}
                    </div>
                  )}
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
