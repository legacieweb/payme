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
    ? 'http://localhost:5000'
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
    <div className="immersive-invoice-root">
      <div className="aurora-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="immersive-layout">
        <section className="invoice-info-side">
          <div className="info-content">
            <header className="info-header">
              <div className="ref-badge">INV-{id.slice(-6).toUpperCase()}</div>
              <div className="date-badge">{new Date(invoice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </header>
            
            <div className="amount-display">
              <div className="currency">$</div>
              <div className="value">{invoice.amount.toFixed(2)}</div>
            </div>
            
            <h1 className="description">{invoice.description || 'Service Payment'}</h1>
            
            <div className="scroll-hint">
              <span>Ready to Pay</span>
              <div className="hint-line"></div>
            </div>
          </div>
        </section>

        <section className="payment-side">
          <div className="payment-content">
            <div className="form-container-clean">
              <h2 className="form-title">Settle Your Invoice</h2>
              <p className="form-subtitle">Secure payment processing</p>

              <div className="integrated-form">
                {userData ? (
                  <div className="active-user-ribbon">
                    <div className="user-orb">{userData.name.charAt(0)}</div>
                    <div className="user-text">
                      <div className="name">{userData.name}</div>
                      <div className="email">{userData.email}</div>
                    </div>
                    <div className="status">
                      <div className="dot"></div>
                      <span>Logged In</span>
                    </div>
                  </div>
                ) : (
                  <div className="clean-form-inputs">
                    <div className="input-field">
                      <input 
                        type="text" 
                        placeholder="Full Name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-field">
                      <input 
                        type="email" 
                        placeholder="Email Address"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <button className="immersive-pay-btn" onClick={handlePayment} disabled={paymentLoading}>
                  {paymentLoading ? (
                    <div className="button-loader"></div>
                  ) : (
                    <>
                      <span>PAY ${invoice.amount.toFixed(2)} NOW</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </>
                  )}
                </button>
              </div>

              <footer className="form-footer">
                <div className="trust-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>Bank-Grade Security</span>
                </div>
                <div className="copyright">
                  Powered by <strong>iyonicorp</strong>
                </div>
              </footer>
            </div>
          </div>
        </section>
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
