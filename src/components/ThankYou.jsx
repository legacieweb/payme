import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';

const ThankYou = () => {
  const location = useLocation();
  const { paymentData } = location.state || {};

  if (!paymentData) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="thank-you-page">
      <div className="container">
        <div className="thank-you-card">
          <div className="thank-you-header">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1>Payment Successful!</h1>
            <p>Thank you for your payment. Your transaction has been completed successfully.</p>
          </div>

          <div className="payment-details">
            <h2>Transaction Details</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Reference Number</span>
                <span className="value">{paymentData.reference}</span>
              </div>
              <div className="detail-item">
                <span className="label">Amount Paid</span>
                <span className="value">
                  {paymentData.currency} {parseFloat(paymentData.amount / 100).toFixed(2)}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Customer Name</span>
                <span className="value">{paymentData.customer_name || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Email Address</span>
                <span className="value">{paymentData.customer.email}</span>
              </div>
              <div className="detail-item">
                <span className="label">Date & Time</span>
                <span className="value">{new Date(paymentData.paid_at).toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="label">Status</span>
                <span className="value status-success">Successful</span>
              </div>
            </div>
          </div>

          <div className="thank-you-actions">
            <Link to="/" className="btn-primary">Back to Home</Link>
            <button onClick={() => window.print()} className="btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
