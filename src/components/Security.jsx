import React from 'react';

const Security = () => {
  return (
    <div className="page-container">
      <div className="container">
        <h1 className="page-title">Security</h1>
        
        <div className="content-section">
          <h2>Security at Paylang</h2>
          <p>At Paylang, we take security seriously. We implement industry-leading measures to protect your data and transactions.</p>
        </div>

        <div className="content-section">
          <h2>Data Encryption</h2>
          <p>All sensitive data is encrypted using AES-256 encryption both in transit and at rest. We use TLS 1.3 for all communication.</p>
        </div>

        <div className="content-section">
          <h2>Fraud Protection</h2>
          <p>Our advanced fraud detection system monitors transactions in real-time using machine learning algorithms to identify and prevent fraudulent activities.</p>
        </div>

        <div className="content-section">
          <h2>Compliance</h2>
          <p>We are fully compliant with PCI DSS standards and follow industry best practices for payment security.</p>
        </div>

        <div className="content-section">
          <h2>Security Measures</h2>
          <ul>
            <li>24/7 security monitoring</li>
            <li>Regular security audits and penetration testing</li>
            <li>Multi-factor authentication</li>
            <li>Secure data centers with redundancy</li>
            <li>Incident response and recovery procedures</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Security;
