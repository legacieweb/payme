import React, { useState } from 'react';

const LoginModal = ({ isOpen, onClose, onLogin, onOpenSignup }) => {
  const [mode, setMode] = useState('login'); // 'login', 'forgot'
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: question, 3: new password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://payme-pn5g.onrender.com'
    : 'https://payme-pn5g.onrender.com';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        if (data.role === 'master') {
          sessionStorage.setItem('masterAdminLoggedIn', 'true');
          localStorage.setItem('adminLoggedIn', 'true');
          onLogin('master');
        } else if (data.role === 'admin') {
          localStorage.setItem('adminLoggedIn', 'true');
          onLogin('admin');
        } else if (data.role === 'payer') {
          localStorage.setItem('payerLoggedIn', 'true');
          localStorage.setItem('payerData', JSON.stringify(data.user));
          onLogin('payer');
        }
        handleClose();
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (resetStep === 1) {
        // Fetch security question
        const res = await fetch(`${baseUrl}/api/auth/forgot-password/get-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
          setSecurityQuestion(data.question);
          setResetStep(2);
        } else {
          setError(data.message);
        }
      } else if (resetStep === 2) {
        // Verify answer
        const res = await fetch(`${baseUrl}/api/auth/forgot-password/verify-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, answer: securityAnswer })
        });
        const data = await res.json();
        if (data.success) {
          setResetStep(3);
        } else {
          setError(data.message);
        }
      } else if (resetStep === 3) {
        // Reset password
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        const res = await fetch(`${baseUrl}/api/auth/forgot-password/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: password, answer: securityAnswer })
        });
        const data = await res.json();
        if (data.success) {
          setError('Password reset successful! Please login.');
          setMode('login');
          setResetStep(1);
        } else {
          setError(data.message);
        }
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
    setError('');
    setMode('login');
    setResetStep(1);
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
            {mode === 'login' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3.5"/></svg>
            )}
          </div>
          <h2>{mode === 'login' ? 'Welcome Back' : 'Reset Password'}</h2>
          <p>
            {mode === 'login' ? 'Sign in to access your dashboard' : 
             resetStep === 1 ? 'Enter your email to start reset' :
             resetStep === 2 ? 'Answer your security question' :
             'Choose a new secure password'}
          </p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleForgotPassword} className="elegant-form">
          {mode === 'forgot' && resetStep === 1 && (
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
                />
              </div>
            </div>
          )}

          {mode === 'forgot' && resetStep === 2 && (
            <>
              <div className="form-group-elegant">
                <label>Security Question</label>
                <div className="question-display-glass">{securityQuestion}</div>
              </div>
              <div className="form-group-elegant">
                <label>Your Answer</label>
                <div className="input-with-icon-glass">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    type="password"
                    placeholder="Enter your answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {(mode === 'forgot' && resetStep === 3) && (
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
                <label>Confirm New Password</label>
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

          {mode === 'login' && (
            <>
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
                  />
                </div>
              </div>
              <div className="form-group-elegant">
                <div className="label-row">
                  <label>Password</label>
                  <button type="button" className="forgot-password-link" onClick={() => { setMode('forgot'); setResetStep(1); }}>Forgot Password?</button>
                </div>
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
            </>
          )}
          
          {error && (
            <div className={error.includes('successful') ? 'success-badge-modern' : 'error-badge-modern'}>
              {error}
            </div>
          )}
          
          <button type="submit" className="primary-btn-elegant" disabled={loading}>
            {loading ? <span className="btn-spinner"></span> : (
              <span>
                {mode === 'login' ? 'Login to Account' : 
                 resetStep === 3 ? 'Reset Password' : 'Continue'}
              </span>
            )}
          </button>
        </form>

        <div className="modal-footer-elegant">
          {mode === 'login' ? (
            <p>Don't have an account? <button className="inline-link" onClick={onOpenSignup}>Create one now</button></p>
          ) : (
            <p>Remembered password? <button className="inline-link" onClick={() => { setMode('login'); setResetStep(1); }}>Sign in</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;