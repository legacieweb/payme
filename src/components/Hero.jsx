import React from 'react';
import PaymentForm from './PaymentForm';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-container-grid">
        <div className="hero-content-left">
          <div className="hero-label">
            <div className="hero-label-dot"></div>
            <span className="hero-label-text">World-Class Payment Infrastructure</span>
          </div>
          
          <h1 className="hero-title-main">
            Experience <span className="gradient-text">Paylang</span>. <br />
            The modern way to pay.
          </h1>
          
          <p className="hero-subtext">
            You're currently paying through <strong>Paylang</strong> – the world's most 
            trusted and secure payment infrastructure. Fast, simple, and always secure.
          </p>
        </div>

        <div className="hero-form-right">
          <div className="form-glass-card">
            <div className="form-card-glow"></div>
            <div className="form-inner">
              <div className="form-top-bar">
                <div className="secure-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Secure Checkout</span>
                </div>
              </div>
              <PaymentForm compact />
            </div>
          </div>
        </div>

        <div className="hero-trust-cloud">
          <p className="trust-title">Trusted by industry leaders</p>
          <div className="logo-cloud">
            <div className="cloud-logo">STRIKE</div>
            <div className="cloud-logo">ZAP</div>
            <div className="cloud-logo">BITPAY</div>
            <div className="cloud-logo">COINBASE</div>
            <div className="cloud-logo">KRAKEN</div>
          </div>
        </div>
      </div>
      
      <div className="hero-bg-effects">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="mesh-grid"></div>
      </div>
    </section>
  );
}
