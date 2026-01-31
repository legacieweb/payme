import React from 'react';
import Hero from './Hero';
import ReceiptLookup from './ReceiptLookup';

const HomePage = () => {
  return (
    <main className="homepage">
      <Hero />
      <ReceiptLookup />
    </main>
  );
};

export default HomePage;
