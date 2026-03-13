import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const InvoicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [showSettledPopup, setShowSettledPopup] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(20);

  // Base API URL
  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://payme-pn5g.onrender.com'
    : 'https://payme-pn5g.onrender.com';

  const PAYSTACK_PUBLIC_KEY = 'pk_live_7ab8e015626516d7d00210b2e7fe169805c226b8';

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = localStorage.getItem('payerLoggedIn') === 'true';
    const data = localStorage.getItem('payerData');
    if (loggedIn && data) {
      setUserData(JSON.parse(data));
    }
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (showSettledPopup && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showSettledPopup && redirectCountdown === 0) {
      navigate('/');
    }
  }, [showSettledPopup, redirectCountdown, navigate]);

  const fetchInvoice = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/invoices/${id}`);
      if (res.data.success) {
        setInvoice(res.data.invoice);
        // Check if invoice is settled (fully paid based on usage count)
        if (res.data.invoice.status === 'settled' || res.data.invoice.usageCount >= res.data.invoice.maxUsage) {
          setShowSettledPopup(true);
        }
      } else {
        setError('Invoice not found');
      }
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (e) => {
    if (e) e.preventDefault();
    
    const finalName = userData ? userData.name : guestName;
    const finalEmail = userData ? userData.email : guestEmail;

    if (!finalName || !finalEmail) {
      alert('Please provide your name and email');
      return;
    }

    setPaymentLoading(true);

    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: finalEmail,
        amount: Math.round(invoice.amount * 100),
        currency: 'USD',
        ref: 'inv_' + Math.floor(Math.random() * 1000000000),
        metadata: {
          custom_fields: [
            {
              display_name: "Invoice ID",
              variable_name: "invoice_id",
              value: invoice._id
            },
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: finalName
            }
          ]
        },
        callback: function(response) {
          handlePaymentCallback(response, finalName, finalEmail);
        },
        onClose: function() {
          setPaymentLoading(false);
        }
      });

      handler.openIframe();
    } catch (err) {
      console.error('Paystack error:', err);
      alert('Error initializing payment');
      setPaymentLoading(false);
    }
  };

  const handlePaymentCallback = async (response, finalName, finalEmail) => {
    try {
      // Verify payment on backend
      const verifyRes = await axios.post(`${baseUrl}/api/payments/verify`, {
        reference: response.reference,
        name: finalName,
        email: finalEmail
      });

      if (verifyRes.data.success) {
        // Mark invoice as paid
        await axios.put(`${baseUrl}/api/invoices/${id}/paid`, {
          reference: response.reference
        });

        navigate('/thankyou', { 
          state: { 
            paymentData: {
              ...verifyRes.data.data,
              customer_name: finalName
            } 
          } 
        });
      }
    } catch (err) {
      console.error('Verification error:', err);
      alert('Payment successful but verification failed. Please contact support.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <div className="preloader-overlay"><div className="preloader"></div></div>;
  if (error) return <div className="error-container"><h1>{error}</h1><button onClick={() => navigate('/')} className="primary-btn">Go Home</button></div>;
  if (!invoice) return null;

  if (invoice.status === 'paid') {
    return (
      <div className="elegant-invoice-page paid">
        <div className="glass-container">
          <div className="success-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 className="title">Transaction Settled</h1>
          <p className="subtitle">Thank you for your prompt payment.</p>
          
          <div className="receipt-box">
            <div className="receipt-line">
              <span className="label">Amount Paid</span>
              <span className="value highlighting">${invoice.amount.toFixed(2)}</span>
            </div>
            <div className="receipt-line">
              <span className="label">Reference</span>
              <span className="value mono">{invoice.reference}</span>
            </div>
            <div className="receipt-line">
              <span className="label">Date</span>
              <span className="value">{new Date(invoice.updatedAt || invoice.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <button onClick={() => navigate('/')} className="elegant-action-btn secondary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cool-invoice-root">
      <div className="aurora-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="cool-invoice-layout">
        <div className="invoice-visual-side">
          <div className="visual-content">

            <div className="hero-invoice-details">
              <div className="tag-premium">
                {invoice.maxUsage > 1 ? `MULTI-USE INVOICE (${invoice.maxUsage}x)` : 'PREMIUM INVOICE'}
              </div>
              <h1 className="hero-description">{invoice.description || 'Service Payment'}</h1>
              <div className="hero-meta">
                <span className="meta-item">REF: INV-{id.slice(-6).toUpperCase()}</span>
                <span className="meta-dot"></span>
                <span className="meta-item">{new Date(invoice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              <div className="hero-amount-card">
                <div className="amount-label">AMOUNT TO SETTLE</div>
                <div className="amount-value-group">
                  <span className="currency-symbol">$</span>
                  <span className="amount-digits">{invoice.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <footer className="visual-footer">
              <div className="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>End-to-End Encrypted Checkout</span>
              </div>
            </footer>
          </div>
        </div>

        <div className="payment-interaction-side">
          <div className="interaction-wrapper">
            <div className="interaction-header">
              <div className="price-tag-large">
                <span className="currency">$</span>
                <span className="amount">{invoice.amount.toFixed(2)}</span>
              </div>
              <p>Complete your payment by providing your details below</p>
            </div>

            <div className="payer-selection-area">
              {userData ? (
                <div className="cool-user-card">
                  <div className="user-orb">{userData.name.charAt(0)}</div>
                  <div className="user-details">
                    <div className="user-name">{userData.name}</div>
                    <div className="user-email">{userData.email}</div>
                  </div>
                  <div className="status-indicator">
                    <div className="pulse-dot"></div>
                    <span>Active</span>
                  </div>
                </div>
              ) : (
                <div className="cool-form-grid">
                  <div className="cool-input-group">
                    <input 
                      type="text" 
                      placeholder=" "
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                    <label>Full Name</label>
                    <div className="input-focus-border"></div>
                  </div>
                  <div className="cool-input-group">
                    <input 
                      type="email" 
                      placeholder=" "
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                    <label>Email Address</label>
                    <div className="input-focus-border"></div>
                  </div>
                </div>
              )}
            </div>

            <button className="cool-payment-btn" onClick={handlePayment} disabled={paymentLoading}>
              {paymentLoading ? (
                <div className="loader-bars">
                  <span></span><span></span><span></span><span></span>
                </div>
              ) : (
                <>
                  <span className="btn-text">PAY ${invoice.amount.toFixed(2)} NOW</span>
                  <div className="btn-glow"></div>
                  <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </>
              )}
            </button>

            <div className="extra-info">
              <p>Powered by <strong>iyonicorp</strong>. Standard transaction terms apply.</p>
            </div>
          </div>
        </div>
      </div>
      
      {showSettledPopup && (
        <div className="settled-popup-overlay">
          <div className="settled-popup-content">
            <div className="settled-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </div>
            <h2>Invoice Fully Settled</h2>
            <p>This invoice has reached its maximum payment limit and is no longer active.</p>
            <div className="settled-stats">
              <div className="stat">
                <span className="label">Total Payments</span>
                <span className="value">{invoice.usageCount} / {invoice.maxUsage}</span>
              </div>
            </div>
            <div className="redirect-hint">
              Redirecting to homepage in <strong>{redirectCountdown}s</strong>...
            </div>
            <button className="cool-payment-btn" onClick={() => navigate('/')}>
              Go Home Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePage;
