import React from 'react';

function HeroSection({ brand }) {
  return (
    <section className="hero-section" style={{ padding: '2rem 1rem' }}>
      <div
        className="hero-container"
        style={{
          maxWidth: 960,
          margin: '0 auto',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2.25rem', lineHeight: 1.2, marginBottom: '0.5rem' }}>
          {brand}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Handpicked Indian apparel crafted with love.
        </p>
        <a
          className="shop-now-btn"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.25rem',
            borderRadius: '9999px',
            background: 'var(--accent-color)',
            color: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: 'var(--shadow-md)',
          }}
          href="#shop"
        >
          Shop Now
        </a>
      </div>
    </section>
  );
}

export default HeroSection;
