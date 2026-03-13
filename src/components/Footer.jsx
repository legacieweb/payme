import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="modern-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <div className="logo-icon-small">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <span className="logo-text-small">Paylang</span>
            </Link>
            <p className="footer-tagline">Building the infrastructure for the next generation of global commerce.</p>
          </div>

          <div className="footer-nav-groups">
            <div className="footer-nav-col">
              <h4>Product</h4>
              <Link to="/receipt-lookup">Receipt Lookup</Link>
              <Link to="/security">Security</Link>
              <Link to="/settlements">Settlements</Link>
            </div>
            <div className="footer-nav-col">
              <h4>Legal</h4>
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-of-service">Terms of Service</Link>
              <Link to="/cookie-policy">Cookie Policy</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p className="copyright">&copy; {currentYear} Paylang Inc. All rights reserved.</p>
          <div className="powered-by">
            <span>Powered by</span>
            <a href="https://iyonicoro.com" target="_blank" rel="noopener noreferrer" className="iyonicoro-link">
              <span className="iyonicoro-text">iyonicoro</span>
              <div className="iyonicoro-pulse"></div>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
