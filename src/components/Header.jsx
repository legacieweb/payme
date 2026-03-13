import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';

const Header = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // Check login status on mount and whenever it changes
  useEffect(() => {
    const admin = localStorage.getItem('adminLoggedIn') === 'true';
    const master = sessionStorage.getItem('masterAdminLoggedIn') === 'true';
    const payer = localStorage.getItem('payerLoggedIn') === 'true';
    const payerData = localStorage.getItem('payerData');

    if (master) {
      setUserRole('master');
      setUserName('Master Admin');
    } else if (admin) {
      setUserRole('admin');
      setUserName('Admin');
    } else if (payer && payerData) {
      setUserRole('payer');
      const parsed = JSON.parse(payerData);
      setUserName(parsed.name);
    } else {
      setUserRole(null);
      setUserName('');
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.user-menu-container')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleLoginSuccess = (role) => {
    setUserRole(role);
    setShowLoginModal(false);
    
    // Refresh name
    if (role === 'payer') {
      const payerData = localStorage.getItem('payerData');
      if (payerData) setUserName(JSON.parse(payerData).name);
    } else if (role === 'master') {
      setUserName('Master Admin');
    } else if (role === 'admin') {
      setUserName('Admin');
    }

    if (role === 'master') navigate('/master-admin');
    else if (role === 'admin') navigate('/admin');
    else if (role === 'payer') navigate('/payer-dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('masterAdminLoggedIn');
    localStorage.removeItem('payerLoggedIn');
    localStorage.removeItem('payerData');
    setUserRole(null);
    setUserName('');
    setShowDropdown(false);
    navigate('/');
  };

  const openLogin = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };

  const openSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  const handleSignupSuccess = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };

  return (
    <>
      <header className="main-header">
        <div className="container">
          <nav className="header-nav">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <span className="logo-text">Paylang</span>
            </Link>
            
            <div className="nav-actions">
              {userRole ? (
                <div className="user-menu-container">
                  <button 
                    className={`user-profile-trigger ${showDropdown ? 'active' : ''}`}
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <div className="user-avatar-sm">
                      {userName.charAt(0)}
                    </div>
                    <span className="user-name-label">{userName.split(' ')[0]}</span>
                    <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </button>

                  {showDropdown && (
                    <div className="user-dropdown-menu">
                      <div className="dropdown-header">
                        <span className="full-name">{userName}</span>
                        <span className="role-tag">{userRole}</span>
                      </div>
                      <div className="dropdown-divider"></div>
                      <button className="dropdown-item" onClick={() => { navigate(userRole === 'payer' ? '/payer-dashboard' : userRole === 'master' ? '/master-admin' : '/admin'); setShowDropdown(false); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        Dashboard
                      </button>
                      <div className="dropdown-divider"></div>
                      <button className="dropdown-item logout" onClick={handleLogout}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="auth-button-group">
                  <button className="login-btn-text" onClick={openLogin}>Log In</button>
                  <button className="signup-btn-filled" onClick={openSignup}>Sign Up</button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLoginSuccess}
        onOpenSignup={openSignup}
      />

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignupSuccess={handleSignupSuccess}
        onOpenLogin={openLogin}
      />
    </>
  );
};

export default Header;
