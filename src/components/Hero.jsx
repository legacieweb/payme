import React from 'react';
import PaymentForm from './PaymentForm';

const Hero = () => {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-wrapper">
          <div className="hero-content">
            <div className="hero-label">
              <div className="hero-label-dot"></div>
              <span className="hero-label-text">Secure Payment Gateway</span>
            </div>
            
            <h1>
              Fast, secure <span className="highlight">payments</span> for your business
            </h1>
            
            <p className="hero-description">
              Accept payments from anywhere in the world. Built for modern businesses 
              with enterprise-grade security and instant settlements.
            </p>

            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">$2M+</span>
                <span className="stat-label">Processed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">50+</span>
                <span className="stat-label">Countries</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
            </div>
          </div>
          
          <div className="hero-form">
            <PaymentForm compact />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
