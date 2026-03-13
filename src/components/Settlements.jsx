import React from 'react';

const Settlements = () => {
  return (
    <div className="page-container">
      <div className="container">
        <h1 className="page-title">Settlements</h1>
        
        <div className="content-section">
          <h2>How Settlements Work</h2>
          <p>Paylang offers fast and reliable settlement processes to ensure your funds reach your account quickly and securely.</p>
        </div>

        <div className="content-section">
          <h2>Settlement Schedule</h2>
          <p>We process settlements on a daily basis. Funds are typically available within 1-2 business days after the transaction is captured.</p>
        </div>

        <div className="content-section">
          <h2>Settlement Methods</h2>
          <p>We support various settlement methods including:
            <ul>
              <li>Bank transfers</li>
              <li>PayPal</li>
              <li>Direct deposit</li>
              <li>Other payment methods based on region</li>
            </ul>
          </p>
        </div>

        <div className="content-section">
          <h2>Currency Support</h2>
          <p>We support settlements in multiple currencies including USD, EUR, GBP, and many others. Conversion rates are competitive and transparent.</p>
        </div>

        <div className="content-section">
          <h2>Reporting</h2>
          <p>Access detailed settlement reports and analytics through your Paylang dashboard. Monitor your cash flow and reconcile transactions easily.</p>
        </div>

        <div className="content-section">
          <h2>Support</h2>
          <p>Our dedicated support team is available to assist with any settlement-related issues or questions you may have.</p>
        </div>
      </div>
    </div>
  );
};

export default Settlements;
