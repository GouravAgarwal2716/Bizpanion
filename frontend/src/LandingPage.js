import React from 'react';
import './BizpanionApp.css';

export default function LandingPage({ onGetStarted }) {
    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="logo">
                    <span className="logo-primary">Biz</span>panion
                </div>
                <div className="landing-nav-links">
                    <a href="#features">Features</a>
                    <a href="#about">About</a>
                    <button className="landing-auth-btn" onClick={onGetStarted}>Login</button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="landing-hero">
                <div className="hero-content">
                    <h1>Your AI Co-Founder for <span className="highlight">Hyper-Growth</span></h1>
                    <p className="hero-subtitle">
                        Bizpanion isn't just a dashboard. It's an intelligent partner that analyzes your data,
                        plans your strategy, and helps you execute proficiently.
                    </p>
                    <button className="cta-btn pulse" onClick={onGetStarted}>
                        Get Started Free 🚀
                    </button>
                </div>
                <div className="hero-visual">
                    <div className="glass-card float-anim">
                        <h3>💡 Smart Insights</h3>
                        <p>"Your profit margin increased by 15% this week!"</p>
                    </div>
                    <div className="glass-card float-anim delay-1">
                        <h3>🔧 Auto-Tasks</h3>
                        <p>"Marketing campaign scheduled for Tuesday."</p>
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <section id="features" className="features-section">
                <h2>Everything you need to scale</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Real-time Analytics</h3>
                        <p>Track revenue, profit, and customer growth instantly.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🤖</div>
                        <h3>AI Growth Agents</h3>
                        <p>Autonomous agents to handle marketing, finance, and strategy.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🌐</div>
                        <h3>Website Builder</h3>
                        <p>Launch professional landing pages in seconds.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💬</div>
                        <h3>Multilingual Chat</h3>
                        <p>Talk to your business data in your native language.</p>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="about-section">
                <div className="about-content">
                    <h2>About Bizpanion</h2>
                    <p>
                        Born from the need to make enterprise-grade business intelligence accessible to everyone.
                        We believe every entrepreneur deserves a companion that cares about their success as much as they do.
                    </p>
                </div>
            </section>

            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} Bizpanion. All rights reserved.</p>
            </footer>

            {/* Inline Styles for Landing Page specific elements */}
            <style>{`
        .landing-container {
          background: linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #1f2937;
        }
        .landing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .landing-nav-links a {
          margin-right: 2rem;
          text-decoration: none;
          color: #4b5563;
          font-weight: 500;
          transition: color 0.3s;
        }
        .landing-nav-links a:hover {
          color: #4f46e5;
        }
        .landing-auth-btn {
          padding: 0.5rem 1.5rem;
          background: transparent;
          border: 1px solid #4f46e5;
          color: #4f46e5;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }
        .landing-auth-btn:hover {
          background: #4f46e5;
          color: white;
        }
        
        /* Hero */
        .landing-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 4rem auto;
          padding: 0 3rem;
          gap: 2rem;
        }
        .hero-content {
          max-width: 600px;
        }
        .hero-content h1 {
          font-size: 3.5rem;
          line-height: 1.2;
          margin-bottom: 1.5rem;
          font-weight: 800;
        }
        .highlight {
          background: linear-gradient(120deg, #818cf8, #4f46e5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
          font-size: 1.25rem;
          color: #6b7280;
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }
        .cta-btn {
          padding: 1rem 2.5rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
          transition: transform 0.2s;
        }
        .cta-btn:hover {
          transform: translateY(-3px);
        }
        
        .hero-visual {
          position: relative;
          width: 400px;
          height: 300px;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          position: absolute;
          width: 250px;
        }
        .float-anim { animation: float 6s ease-in-out infinite; }
        .delay-1 { animation-delay: 3s; top: 120px; left: 100px; }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }

        /* Features */
        .features-section {
          padding: 5rem 3rem;
          background: white;
          text-align: center;
        }
        .features-section h2 {
          font-size: 2.5rem;
          margin-bottom: 3rem;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .feature-card {
          padding: 2rem;
          border-radius: 16px;
          background: #f9fafb;
          transition: transform 0.3s;
        }
        .feature-card:hover {
          transform: translateY(-10px);
        }
        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        
        /* About */
        .about-section {
          padding: 5rem 3rem;
          text-align: center;
          background: #3730a3;
          color: white;
        }
        .about-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .landing-footer {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
          background: #f3f4f6;
        }

        @media (max-width: 768px) {
          .landing-hero { flex-direction: column; text-align: center; margin-top: 2rem; }
          .hero-visual { display: none; }
          .landing-nav { padding: 1rem; }
        }
      `}</style>
        </div>
    );
}
