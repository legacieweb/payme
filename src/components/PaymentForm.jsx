import React, { useState } from 'react';
import axios from 'axios';

const PaymentForm = ({ compact }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Paystack public key
  const PAYSTACK_PUBLIC_KEY = 'pk_test_232531a5c927ef2cc67ed1b85af3f26e3b8ed2f2';

  const handlePayment = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Store form values in local variables for the callback
    const paymentName = name;
    const paymentEmail = email;

    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: paymentEmail,
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: 'USD',
        ref: 'paylang_' + Math.floor(Math.random() * 1000000000),
        metadata: {
          custom_fields: [
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: paymentName
            }
          ]
        },
        callback: function(response) {
          // Use a regular function and call a separate async function
          handlePaymentSuccess(response, paymentName, paymentEmail);
        },
        onClose: function() {
          setLoading(false);
          setMessage('Payment window closed.');
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      setMessage('Error initializing payment. Please try again.');
      setLoading(false);
    }
  };

  // Separate function to handle the async verification
  const handlePaymentSuccess = async (response, paymentName, paymentEmail) => {
    try {
      const verifyResponse = await axios.post('https://payme-pn5g.onrender.com/api/payments/verify', {
        reference: response.reference,
        name: paymentName,
        email: paymentEmail
      });

      if (verifyResponse.data.success) {
        setMessage('Payment successful! A receipt has been sent to your email.');
        // Reset form
        setName('');
        setEmail('');
        setAmount('');
      } else {
        setMessage('Payment verification failed. Please contact support.');
      }
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
      setMessage('Payment completed but verification failed. Please contact support.');
    }
    setLoading(false);
  };

  if (compact) {
    return (
      <div className="payment-card compact">
        <div className="payment-header">
          <h2>Quick Payment</h2>
          <p>Send money instantly</p>
        </div>
        
        <form className="payment-form" onSubmit={handlePayment}>
          <div className="form-group">
            <label htmlFor="compact-name">Full Name</label>
            <input 
              id="compact-name"
              type="text" 
              placeholder="John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="compact-email">Email Address</label>
            <input 
              id="compact-email"
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="amount-group">
            <div className="amount-label">Amount (USD)</div>
            <div className="amount-display">
              <span className="amount-currency">$</span>
              <input 
                type="number" 
                className="amount-input"
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required 
              />
            </div>
          </div>
          
          <button type="submit" className="pay-btn" disabled={loading}>
            {loading ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                  </path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                Pay Now
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
          
          {message && (
            <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </form>
        
        <div className="security-badge">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Secured by Paystack</span>
        </div>
      </div>
    );
  }

  return (
    <section className="payment-section" id="payment">
      <div className="container">
        <div className="payment-container">
          <div className="payment-card">
            <div className="payment-header">
              <h2>Make a Payment</h2>
              <p>Enter your details to complete the transaction</p>
            </div>
            
            <form className="payment-form" onSubmit={handlePayment}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  id="name"
                  type="text" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input 
                  id="email"
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              
              <div className="amount-group">
                <div className="amount-label">Amount (USD)</div>
                <div className="amount-display">
                  <span className="amount-currency">$</span>
                  <input 
                    type="number" 
                    className="amount-input"
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    required 
                  />
                </div>
              </div>
              
              <button type="submit" className="pay-btn" disabled={loading}>
                {loading ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Pay Now
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
              
              {message && (
                <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}
            </form>
            
            <div className="security-badge">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Secured by Paystack</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentForm;
