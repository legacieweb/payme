import React, { useState } from 'react';

const SignupModal = ({ isOpen, onClose, onSignupSuccess, onOpenLogin }) => {
  const [mode, setMode] = useState('verify'); // 'verify', 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://payme-pn5g.onrender.com'
    : 'https://payme-pn5g.onrender.com';

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${baseUrl}/api/payer/verify-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });

      const data = await response.json();

      if (data.success) {
        setMode('register');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${baseUrl}/api/payer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password })
      });

      const data = await response.json();

      if (data.success) {
        setError('Account created! Please login.');
        setTimeout(() => {
          onSignupSuccess();
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError('');
    setMode('verify');
    onClose();
  };

  return (
    <div className="modern-modal-overlay" onClick={handleClose}>
      <div className="modern-modal-content-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="modal-decorative-bg"></div>
        <button className="close-btn-elegant" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        
        <div className="modal-header-elegant">
          <div className="modal-icon-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
            </svg>
          </div>
          <h2>{mode === 'verify' ? 'Create Account' : 'Set Password'}</h2>
          <p>{mode === 'verify' ? 'Verify your payment details to register' : 'Choose a secure password'}</p>
        </div>

        <form onSubmit={mode === 'verify' ? handleVerify : handleRegister} className="elegant-form">
          <div className="form-group-elegant">
            <label>Full Name</label>
            <div className="input-with-icon-glass">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={mode === 'register'}
              />
            </div>
          </div>

          <div className="form-group-elegant">
            <label>Email Address</label>
            <div className="input-with-icon-glass">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mode === 'register'}
              />
            </div>
          </div>
          
          {mode === 'register' && (
            <>
              <div className="form-group-elegant">
                <label>New Password</label>
                <div className="input-with-icon-glass">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group-elegant">
                <label>Confirm Password</label>
                <div className="input-with-icon-glass">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}
          
          {error && (
            <div className={error.includes('created') ? 'success-badge-modern' : 'error-badge-modern'}>
              {error}
            </div>
          )}
          
          <button type="submit" className="primary-btn-elegant" disabled={loading}>
            {loading ? <span className="btn-spinner"></span> : (
              <span>{mode === 'verify' ? 'Verify Details' : 'Complete Registration'}</span>
            )}
          </button>
        </form>

        <div className="modal-footer-elegant">
          <p>Already have an account? <button className="inline-link" onClick={onClose}>Sign in here</button></p>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;