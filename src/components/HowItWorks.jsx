import React from 'react';

const steps = [
  {
    number: '01',
    title: 'Enter Amount',
    description: 'Enter the amount you wish to pay in your preferred currency.'
  },
  {
    number: '02',
    title: 'Choose Method',
    description: 'Select your preferred payment method from our wide range of options.'
  },
  {
    number: '03',
    title: 'Complete Payment',
    description: 'Verify and complete your transaction securely in seconds.'
  },
  {
    number: '04',
    title: 'Get Receipt',
    description: 'Receive an instant digital receipt and transaction confirmation.'
  }
];

const HowItWorks = () => {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Process</span>
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Paying with Paylang is simple, fast, and secure. 
            Follow these four easy steps to complete your transaction.
          </p>
        </div>
        
        <div className="steps-grid">
          {steps.map((step, index) => (
            <div className="step-card" key={index}>
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
