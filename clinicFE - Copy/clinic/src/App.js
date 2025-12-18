import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Homepage from './components/homepage';
import PatientRegister from './components/patient/patientRegister';
import StaffRegister from './components/staff/staffRegister';
import PatientDashboard from './components/patient/PatientDashboard';
import StaffDashboard from './components/staff/staffDashboard';
import EmergencyReschedules from './components/staff/EmergencyReschedules';
import LoginModal from './components/patient/LoginModal';
import StaffLoginModal from './components/staff/LoginModal';
import AdminLoginModal from './components/admin/AdminLoginModal';
import AdminDashboard from './components/admin/AdminDashboard';
import ResetPassword from './components/patient/ResetPassword';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isStaffLoginModalOpen, setIsStaffLoginModalOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Function to get current page from URL
  const getPageFromURL = () => {
    const path = window.location.pathname;
    const hash = window.location.hash.replace('#', '');
    
    // Check for hash-based routing first (for patient dashboard sections)
    if (path === '/dashboard' || hash) {
      return 'dashboard';
    }

    if (path === '/register') return 'register';
    if (path === '/staff-register') return 'staffRegister';
    if (path === '/staff-dashboard') return 'staffDashboard';
    if (path === '/admin-dashboard') return 'adminDashboard';
    if (path === '/reset') return 'resetPassword'; // added
    return 'home';
  };

  // Check if user is authenticated
  const checkAuthentication = (page) => {
    if (page === 'dashboard') {
      const patientData = localStorage.getItem('patient');
      const rememberMe = localStorage.getItem('rememberMe');
      return patientData !== null;
    }
    if (page === 'staffDashboard') {
      const staffData = localStorage.getItem('staff');
      const rememberMeStaff = localStorage.getItem('rememberMeStaff');
      return staffData !== null;
    }
    if (page === 'adminDashboard') {
      const adminData = localStorage.getItem('admin');
      const rememberMeAdmin = localStorage.getItem('rememberMeAdmin');
      return adminData !== null;
    }
    return true; // Other pages don't require authentication
  };

  // Initialize page from URL on component mount
  useEffect(() => {
    const pageFromURL = getPageFromURL();
    
    // Check if the requested page requires authentication
    if (checkAuthentication(pageFromURL)) {
      setCurrentPage(pageFromURL);
    } else {
      // If not authenticated, redirect to home and update URL
      setCurrentPage('home');
      window.history.replaceState({ page: 'home' }, '', '/');
    }

    // Listen for browser back/forward button
    const handlePopState = () => {
      const newPage = getPageFromURL();
      if (checkAuthentication(newPage)) {
        setCurrentPage(newPage);
      } else {
        setCurrentPage('home');
        window.history.replaceState({ page: 'home' }, '', '/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    let url;
    switch (page) {
      case 'home':
        url = '/';
        break;
      case 'register':
        url = '/register';
        break;
      case 'staffRegister':
        url = '/staff-register';
        break;
      case 'dashboard':
        url = '/dashboard';
        break;
      case 'staffDashboard':
        url = '/staff-dashboard';
        break;
      case 'adminDashboard':
        url = '/admin-dashboard';
        break;
      case 'resetPassword':
        url = '/reset';
        break;
      default:
        url = '/';
    }
    window.history.pushState({ page }, '', url);
  };

  const openLoginModal = () => {
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const openStaffLoginModal = () => {
    setIsStaffLoginModalOpen(true);
  };

  const closeStaffLoginModal = () => {
    setIsStaffLoginModalOpen(false);
  };

  const openAdminLoginModal = () => {
    setIsAdminLoginModalOpen(true);
  };

  const closeAdminLoginModal = () => {
    setIsAdminLoginModalOpen(false);
  };

  const handleLogout = () => {
    closeLoginModal();
    closeStaffLoginModal();
    closeAdminLoginModal();
    // Navigate to home and update URL
    navigateTo('home');
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            currentPage === 'home' ? (
              <Homepage 
                onNavigate={navigateTo} 
                onOpenLogin={openLoginModal}
                onOpenStaffLogin={openStaffLoginModal}
                onOpenAdminLogin={openAdminLoginModal}
              />
            ) : null
          } />
          <Route path="/register" element={
            currentPage === 'register' ? (
              <PatientRegister onNavigate={navigateTo} />
            ) : null
          } />
          <Route path="/staff-register" element={
            currentPage === 'staffRegister' ? (
              <StaffRegister onNavigate={navigateTo} />
            ) : null
          } />
          <Route path="/dashboard" element={
            currentPage === 'dashboard' ? (
              <PatientDashboard onNavigate={navigateTo} onLogout={handleLogout} />
            ) : null
          } />
          <Route path="/staff-dashboard" element={
            currentPage === 'staffDashboard' ? (
              <StaffDashboard onNavigate={navigateTo} onLogout={handleLogout} />
            ) : null
          } />
          <Route path="/admin-dashboard" element={
            currentPage === 'adminDashboard' ? (
              <AdminDashboard onNavigate={navigateTo} onLogout={handleLogout} />
            ) : null
          } />
          <Route path="/reset" element={
            currentPage === 'resetPassword' ? (
              <ResetPassword onBack={() => navigateTo('home')} />
            ) : null
          } />
          <Route path="/staff/:section" element={<StaffDashboard />} />
          <Route path="/staff/emergency-reschedules" element={<EmergencyReschedules />} />
          <Route path="/staff" element={<Navigate to="/staff/dashboard" />} />
        </Routes>

        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={closeLoginModal} 
          onNavigate={navigateTo}
          onOpenStaffLogin={openStaffLoginModal}
          onOpenAdminLogin={openAdminLoginModal}
        />
        
        <StaffLoginModal
          isOpen={isStaffLoginModalOpen}
          onClose={closeStaffLoginModal}
          onNavigate={navigateTo}
        />

        <AdminLoginModal
          isOpen={isAdminLoginModalOpen}
          onClose={closeAdminLoginModal}
          onNavigate={navigateTo}
        />
      </div>
    </Router>
  );
}

export default App;
