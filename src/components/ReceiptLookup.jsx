import React, { useState } from 'react';
import axios from 'axios';

const ReceiptLookup = () => {
  const [email, setEmail] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState(false);
  
  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  const [refundStatuses, setRefundStatuses] = useState({});

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setPayments([]);
    setSearched(true);
    setRefundStatuses({});

    try {
      const response = await axios.get(`https://payme-pn5g.onrender.com/api/payments/${email}`);
      
      if (response.data.success && response.data.payments.length > 0) {
        setPayments(response.data.payments);
        // Check refund status for each payment
        response.data.payments.forEach(async (payment) => {
          try {
            const refundRes = await axios.get(`https://payme-pn5g.onrender.com/api/refunds/payment/${payment._id}`);
            if (refundRes.data.refund) {
              setRefundStatuses(prev => ({
                ...prev,
                [payment._id]: refundRes.data.refund
              }));
            }
          } catch (err) {
            // No refund found for this payment
          }
        });
      } else {
        setMessage('No payments found for this email address.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessage('Error searching for payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openRefundModal = (payment) => {
    setSelectedPayment(payment);
    setRefundReason('');
    setRefundMessage('');
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setSelectedPayment(null);
    setRefundReason('');
    setRefundMessage('');
  };

  const submitRefundRequest = async (e) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      setRefundMessage('Please provide a reason for the refund.');
      return;
    }

    setRefundLoading(true);
    setRefundMessage('');

    try {
      const response = await axios.post('https://payme-pn5g.onrender.com/api/refunds', {
        paymentId: selectedPayment._id,
        paymentReference: selectedPayment.reference,
        customerName: selectedPayment.name,
        customerEmail: selectedPayment.email,
        amount: selectedPayment.amount,
        currency: selectedPayment.currency,
        reason: refundReason
      });

      if (response.data.success) {
        setRefundMessage('Refund request submitted successfully! You will receive an email once it is reviewed.');
        setRefundStatuses(prev => ({
          ...prev,
          [selectedPayment._id]: response.data.refundRequest
        }));
        setTimeout(() => {
          closeRefundModal();
        }, 2000);
      }
    } catch (error) {
      console.error('Refund request error:', error);
      setRefundMessage(error.response?.data?.message || 'Error submitting refund request. Please try again.');
    } finally {
      setRefundLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRefundStatusBadge = (paymentId) => {
    const refund = refundStatuses[paymentId];
    if (!refund) return null;

    const statusColors = {
      pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
      approved: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
      rejected: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }
    };

    const { bg, color } = statusColors[refund.status] || statusColors.pending;

    return (
      <span 
        className="status-badge"
        style={{ 
          background: bg, 
          color: color,
          marginLeft: '8px',
          fontSize: '11px',
          padding: '3px 8px'
        }}
      >
        Refund: {refund.status}
      </span>
    );
  };

  return (
    <section className="receipt-section" id="receipts">
      <div className="container">
        <div className="receipt-container">
          <div className="receipt-header">
            <h2>Find Your Receipts</h2>
            <p>Enter your email address to view your payment history</p>
          </div>

          <form className="receipt-search-form" onSubmit={handleSearch}>
            <div className="search-input-group">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="search-btn" disabled={loading}>
                {loading ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </path>
                  </svg>
                ) : (
                  <>
                    Search
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {message && (
            <div className="message info">
              {message}
            </div>
          )}

          {payments.length > 0 && (
            <div className="payments-list">
              <h3>Your Payments</h3>
              {payments.map((payment) => (
                <div key={payment._id} className="payment-receipt-card">
                  <div className="receipt-header-row">
                    <div className="receipt-status">
                      <span className={`status-badge ${payment.status}`}>
                        {payment.status === 'success' ? 'Successful' : payment.status}
                      </span>
                      {getRefundStatusBadge(payment._id)}
                    </div>
                    <div className="receipt-amount">
                      {payment.currency} {payment.amount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="receipt-details">
                    <div className="receipt-row">
                      <span className="receipt-label">Reference</span>
                      <span className="receipt-value">{payment.reference}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Name</span>
                      <span className="receipt-value">{payment.name}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Email</span>
                      <span className="receipt-value">{payment.email}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Date</span>
                      <span className="receipt-value">{formatDate(payment.paidAt || payment.createdAt)}</span>
                    </div>
                  </div>

                  {/* Refund Button */}
                  {payment.status === 'success' && !refundStatuses[payment._id] && (
                    <div className="receipt-actions" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <button 
                        className="refund-btn"
                        onClick={() => openRefundModal(payment)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #f59e0b',
                          color: '#f59e0b',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(245, 158, 11, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                        </svg>
                        Request Refund
                      </button>
                    </div>
                  )}

                  {/* Refund Status Display */}
                  {refundStatuses[payment._id] && (
                    <div className="refund-status-display" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <div className="receipt-row">
                        <span className="receipt-label">Refund Status</span>
                        <span className="receipt-value" style={{ 
                          color: refundStatuses[payment._id].status === 'approved' ? '#10b981' : 
                                 refundStatuses[payment._id].status === 'rejected' ? '#ef4444' : '#f59e0b',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {refundStatuses[payment._id].status}
                        </span>
                      </div>
                      {refundStatuses[payment._id].adminNotes && (
                        <div className="receipt-row" style={{ marginTop: '8px' }}>
                          <span className="receipt-label">Admin Notes</span>
                          <span className="receipt-value">{refundStatuses[payment._id].adminNotes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {searched && payments.length === 0 && !message && (
            <div className="no-results">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <p>No payments found</p>
            </div>
          )}
        </div>
      </div>

      {/* Refund Request Modal */}
      {showRefundModal && selectedPayment && (
        <div 
          className="refund-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRefundModal();
          }}
        >
          <div 
            className="refund-modal"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>Request Refund</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Submit a refund request for your payment
              </p>
            </div>

            <div style={{ 
              background: 'var(--bg)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '1px solid var(--border)'
            }}>
              <div className="receipt-row" style={{ marginBottom: '8px' }}>
                <span className="receipt-label">Reference</span>
                <span className="receipt-value">{selectedPayment.reference}</span>
              </div>
              <div className="receipt-row" style={{ marginBottom: '8px' }}>
                <span className="receipt-label">Amount</span>
                <span className="receipt-value" style={{ color: 'var(--accent)', fontWeight: '600' }}>
                  {selectedPayment.currency} {selectedPayment.amount.toFixed(2)}
                </span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Date</span>
                <span className="receipt-value">{formatDate(selectedPayment.paidAt || selectedPayment.createdAt)}</span>
              </div>
            </div>

            <form onSubmit={submitRefundRequest}>
              <div style={{ marginBottom: '20px' }}>
                <label 
                  htmlFor="refundReason"
                  style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    marginBottom: '8px',
                    color: 'var(--text)'
                  }}
                >
                  Reason for Refund *
                </label>
                <textarea
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please explain why you are requesting a refund..."
                  required
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px 16px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {refundMessage && (
                <div 
                  className={`message ${refundMessage.includes('success') ? 'success' : 'error'}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    background: refundMessage.includes('success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: refundMessage.includes('success') ? '#10b981' : '#ef4444',
                    border: `1px solid ${refundMessage.includes('success') ? '#10b981' : '#ef4444'}`
                  }}
                >
                  {refundMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeRefundModal}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'var(--text-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'var(--border)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: '#f59e0b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: refundLoading ? 'not-allowed' : 'pointer',
                    opacity: refundLoading ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {refundLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ReceiptLookup;
