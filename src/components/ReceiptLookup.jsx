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

  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://payme-pn5g.onrender.com'
    : 'https://payme-pn5g.onrender.com';

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setPayments([]);
    setSearched(true);
    setRefundStatuses({});

    try {
      const response = await axios.get(`${baseUrl}/api/payments/${email}`);
      
      if (response.data.success && response.data.payments.length > 0) {
        setPayments(response.data.payments);
        // Check refund status for each payment
        response.data.payments.forEach(async (payment) => {
          try {
            const refundRes = await axios.get(`${baseUrl}/api/refunds/payment/${payment._id}`);
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
      const response = await axios.post(`${baseUrl}/api/refunds`, {
        paymentId: selectedPayment._id,
        paymentReference: selectedPayment.reference,
        customerName: selectedPayment.name,
        customerEmail: selectedPayment.email,
        amount: selectedPayment.amount,
        currency: selectedPayment.currency,
        reason: refundReason
      });

      if (response.data.success) {
        setRefundMessage('Refund request submitted successfully!');
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
      setRefundMessage(error.response?.data?.message || 'Error submitting refund request.');
    } finally {
      setRefundLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <section className="receipt-lookup-section" id="receipts">
      <div className="container">
        <div className="lookup-wrapper">
          <div className="lookup-header">
            <div className="header-icon-modern">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            </div>
            <h2>Transaction History</h2>
            <p>Enter the email address you used for payment to view your records.</p>
          </div>

          <div className="search-card-modern">
            <form onSubmit={handleSearch} className="lookup-form-modern">
              <div className="input-group-modern">
                <div className="input-with-icon-glass">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                  <input
                    type="email"
                    placeholder="Enter email to find records"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="modern-placeholder"
                    required
                  />
                </div>
                <button type="submit" className="primary-btn-modern glass-btn" disabled={loading}>
                  {loading ? <span className="btn-spinner"></span> : 'Find Transactions'}
                </button>
              </div>
            </form>
          </div>

          {message && <div className="message-box info">{message}</div>}

          {payments.length > 0 && (
            <div className="results-container">
              <div className="results-header">
                <h3>Found {payments.length} Payments</h3>
              </div>
              
              <div className="payments-grid">
                {payments.map((payment) => (
                  <div key={payment._id} className="receipt-card-modern">
                    <div className="card-top">
                      <div className="status-container">
                        <span className={`badge ${payment.status}`}>{payment.status}</span>
                        {refundStatuses[payment._id] && (
                          <span className={`badge refund ${refundStatuses[payment._id].status}`}>
                            Refund {refundStatuses[payment._id].status}
                          </span>
                        )}
                      </div>
                      <div className="amount-display">
                        <span className="currency">{payment.currency}</span>
                        <span className="amount">{payment.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="card-details">
                      <div className="detail-row">
                        <span className="label">Reference</span>
                        <span className="value font-mono">{payment.reference}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Date</span>
                        <span className="value">{formatDate(payment.paidAt || payment.createdAt)}</span>
                      </div>
                    </div>

                    <div className="card-actions">
                      {payment.status === 'success' && !refundStatuses[payment._id] ? (
                        <button className="action-btn refund" onClick={() => openRefundModal(payment)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                          Request Refund
                        </button>
                      ) : (
                        <button className="action-btn download">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          Download Receipt
                        </button>
                      )}
                    </div>

                    {refundStatuses[payment._id] && refundStatuses[payment._id].adminNotes && (
                      <div className="admin-note-box">
                        <strong>Note:</strong> {refundStatuses[payment._id].adminNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {searched && payments.length === 0 && !loading && !message && (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <p>No records found for this email.</p>
            </div>
          )}
        </div>
      </div>

      {showRefundModal && selectedPayment && (
        <div className="modern-modal-overlay" onClick={closeRefundModal}>
          <div className="modern-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Refund</h2>
              <button className="close-btn" onClick={closeRefundModal}>×</button>
            </div>
            
            <form onSubmit={submitRefundRequest} className="modern-form">
              <div className="summary-box">
                <div className="summary-row">
                  <span>Reference</span>
                  <span className="font-mono">{selectedPayment.reference}</span>
                </div>
                <div className="summary-row">
                  <span>Amount</span>
                  <span className="amount">{selectedPayment.currency} {selectedPayment.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Refund</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Tell us why you're requesting a refund..."
                  required
                />
              </div>

              {refundMessage && (
                <div className={`badge-message ${refundMessage.includes('success') ? 'success' : 'error'}`}>
                  {refundMessage}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeRefundModal}>Cancel</button>
                <button type="submit" className="primary-btn warning" disabled={refundLoading}>
                  {refundLoading ? <span className="spinner"></span> : 'Submit Request'}
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
