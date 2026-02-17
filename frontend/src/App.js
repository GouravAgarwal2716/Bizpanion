import React, { useEffect, useMemo, useState } from "react";
import "./BizpanionApp.css";
import "./UXPolish.css";
import { api } from "./api";
import AuthForm from "./AuthForm";
import TasksPage from "./TasksPage";
import LandingPage from "./LandingPage";
import HeroSection from "./components/HeroSection";
import ShopGrid from "./components/ShopGrid";
import MarketingPage from "./MarketingPage";
import SettingsPage from "./SettingsPage";



// ----------------------------- Utilities & Mock Data ----------------------------------
const nowISO = () => new Date().toISOString();
const ago = (mins) => new Date(Date.now() - mins * 60 * 1000).toISOString();
const genId = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_CONNECTIONS = [
  { key: "shopify", name: "Shopify", connected: true, lastSync: ago(35) },
  { key: "amazon", name: "Amazon Seller", connected: true, lastSync: ago(55) },
  { key: "meesho", name: "Meesho", connected: true, lastSync: ago(42) },
  { key: "ga4", name: "Google Analytics 4", connected: false, lastSync: null },
  { key: "instagram", name: "Instagram Ads", connected: false, lastSync: null },
  { key: "razorpay", name: "Razorpay", connected: false, lastSync: null },
  { key: "quickbooks", name: "QuickBooks", connected: false, lastSync: null },
  { key: "pos", name: "Offline POS (Webhook)", connected: false, lastSync: null },
];

const DEFAULT_PRODUCTS = [
  { id: "p1", title: "Festive Silk Saree", price: 3499, stock: 23 },
  { id: "p2", title: "Blue Kurta", price: 1299, stock: 51 },
  { id: "p3", title: "Handcrafted Jute Bag", price: 899, stock: 12 },
];

function about() {
  return `
  <section class="about-section">
    <div class="about-container">
      <h2>Our Story</h2>
      <p>We celebrate Indian craftsmanship with sustainable and ethical fashion.</p>
    </div>
  </section>`;
}

const DEFAULT_BUSINESS = () => ({
  id: genId("biz"),
  name: "Priya's Apparel",
  subdomain: "priyas-apparel",
  deployed: false,
  deployedAt: null,
  kpis: {
    revenueMonth: 182450,
    profitMonth: 45300,
    aov: 2225,
    newCustomers: 82,
    revChangePct: 12.5,
    profitChangePct: -2.1,
  },
  channels: [
    { key: "shopify", label: "Shopify", value: 80 },
    { key: "amazon", label: "Amazon", value: 55 },
    { key: "pos", label: "Offline POS", value: 30 },
    { key: "meesho", label: "Meesho", value: 45 },
  ],
  insights: [
    { type: "opportunity", text: "'Blue Kurta' sells 3× faster on Amazon than Shopify." },
    { type: "warning", text: "Instagram CAC rose 25% last week. Review creatives & targeting." },
    { type: "suggestion", text: "15% of customers are dormant (90+ days). Send a comeback coupon." },
  ],
  connections: DEFAULT_CONNECTIONS,
  products: DEFAULT_PRODUCTS,
  site: {
    prompt: "Build an e-commerce site for traditional Indian apparel.",
    theme: { primary: "indigo", accent: "amber", dark: false },
    pages: [
      { id: genId("pg"), title: "Home", content: `<div id="hero-section-placeholder"></div>` },
      { id: genId("pg"), title: "Shop", content: `<div id="shop-grid-placeholder"></div>` },
      { id: genId("pg"), title: "About", content: about() },
    ],
  },
});

const STORAGE_KEY = "bizpanion_demo_state_v2";
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { }
}

// -------------------------------- Root App -----------------------------------
export default function BizpanionApp() {
  const initial = useMemo(
    () =>
      loadState() ?? {
        businesses: [DEFAULT_BUSINESS()],
        activeBizId: null,
      },
    []
  );

  const [state, setState] = useState(initial);
  const { businesses } = state;
  const activeBizId = state.activeBizId ?? businesses[0]?.id;
  const active = businesses.find((b) => b.id === activeBizId) || businesses[0];
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !user) {
      api.get("/auth/me")
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        });
    }
  }, [user]);

  useEffect(() => saveState({ ...state, activeBizId }), [state, activeBizId]);

  const [showLanding, setShowLanding] = useState(true);
  const [view, setView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });
  const [showStatsPopup, setShowStatsPopup] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [locale, setLocale] = useState(localStorage.getItem('locale') || 'en-IN');
  const [notifications, setNotifications] = useState([]);
  const [persona, setPersona] = useState(localStorage.getItem('persona') || '');
  const [showPersonaModal, setShowPersonaModal] = useState(!localStorage.getItem('persona'));
  const [showSplash, setShowSplash] = useState(true);

  // Simple i18n dictionary for key labels
  const dict = {
    "en-IN": {
      "Dashboard": "Dashboard",
      "Website Builder": "Website Builder",
      "Growth Hub": "Growth Hub",
      "Tasks": "Tasks",
      "AI Tools": "AI Tools",
      "Health": "Health",
      "Financial Advisor": "Financial Advisor",
      "Marketing": "Marketing",
      "Connections": "Connections",
      "Vendor Connect": "Vendor Connect",
      "Brand Designer": "Brand Designer",
      "Agents": "Agents",
      "Memory": "Memory",
      "Documents": "Documents",
      "Settings": "Settings",
      "Pitch Deck": "Pitch Deck",
      "Admin": "Admin",
      "Insights": "Insights",
      "Revenue by Channel (Last 30 Days)": "Revenue by Channel (Last 30 Days)",
      "Performance Insights": "Performance Insights",
      "View Growth Recommendations": "View Growth Recommendations",
      "Download KPI Report (PDF)": "Download KPI Report (PDF)",
      "Today's Performance": "Today's Performance",
      "Today's Revenue": "Today's Revenue",
      "New Orders": "New Orders",
      "New Customers": "New Customers",
      "Conversion Rate": "Conversion Rate",
      "Got it!": "Got it!",
      "Logout": "Logout",
      "Biz Now": "Biz Now",
      "+ New Business": "+ New Business",
      "Hi! Ask me anything about your business. Try: 'Net profit last month?' or 'Compare Shopify vs Amazon this quarter'.": "Hi! Ask me anything about your business. Try: 'Net profit last month?' or 'Compare Shopify vs Amazon this quarter'.",
      "Ask": "Ask",
      "Typing…": "Typing…",
      "Ask about your live data…": "Ask about your live data…",
      "Saved as Insight.": "Saved as Insight.",
      "Failed to save insight.": "Failed to save insight.",
      "+ Add as Task": "+ Add as Task",
      "Task added from chat.": "Task added from chat.",
      "Failed to add task.": "Failed to add task.",
      "Save as Insight": "Save as Insight"
    },
    "hi-IN": {
      "Dashboard": "डैशबोर्ड",
      "Website Builder": "वेबसाइट बिल्डर",
      "Growth Hub": "ग्रोथ हब",
      "Tasks": "टास्क",
      "AI Tools": "एआई उपकरण",
      "Health": "हेल्थ",
      "Financial Advisor": "वित्तीय सलाहकार",
      "Marketing": "मार्केटिंग",
      "Connections": "कनेक्शंस",
      "Vendor Connect": "वेंडर कनेक्ट",
      "Brand Designer": "ब्रांड डिज़ाइनर",
      "Agents": "एजेंट्स",
      "Memory": "मेमोरी",
      "Documents": "दस्तावेज़",
      "Settings": "सेटिंग्स",
      "Pitch Deck": "पिच डेक",
      "Admin": "एडमिन",
      "Insights": "इनसाइट्स",
      "Revenue by Channel (Last 30 Days)": "चैनल अनुसार राजस्व (पिछले 30 दिन)",
      "Performance Insights": "प्रदर्शन इनसाइट्स",
      "View Growth Recommendations": "ग्रोथ सिफारिशें देखें",
      "Download KPI Report (PDF)": "KPI रिपोर्ट डाउनलोड करें (PDF)",
      "Today's Performance": "आज का प्रदर्शन",
      "Today's Revenue": "आज का राजस्व",
      "New Orders": "नए ऑर्डर",
      "New Customers": "नए ग्राहक",
      "Conversion Rate": "कन्वर्ज़न दर",
      "Got it!": "समझ गया!",
      "Logout": "लॉग आउट",
      "Biz Now": "बिज़ नाउ",
      "+ New Business": "+ नया व्यवसाय",
      "Hi! Ask me anything about your business. Try: 'Net profit last month?' or 'Compare Shopify vs Amazon this quarter'.": "नमस्ते! अपने व्यवसाय के बारे में कुछ भी पूछें। प्रयास करें: 'पिछले महीने का शुद्ध लाभ?' या 'इस तिमाही में Shopify बनाम Amazon की तुलना करें।'",
      "Ask": "पूछें",
      "Typing…": "लिख रहा है...",
      "Ask about your live data…": "अपने लाइव डेटा के बारे में पूछें...",
      "Saved as Insight.": "इनसाइट के रूप में सहेजा गया।",
      "Failed to save insight.": "इनसाइट सहेजने में विफल।",
      "+ Add as Task": "+ टास्क के रूप में जोड़ें",
      "Task added from chat.": "चैट से टास्क जोड़ा गया।",
      "Failed to add task.": "टास्क जोड़ने में विफल।",
      "Save as Insight": "इनसाइट के रूप में सहेजें"
    }
  };
  const t = (k) => (dict[locale] && dict[locale][k]) || k;

  useEffect(() => {
    if (user && user.locale && user.locale !== locale) {
      setLocale(user.locale);
      localStorage.setItem('locale', user.locale);
    }
  }, [user, locale]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat(locale || 'en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  // Real-time events via SSE
  useEffect(() => {
    try {
      const base = (api && api.defaults && api.defaults.baseURL) ? api.defaults.baseURL : '';
      const es = new EventSource(`${base}/events/stream`);
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          setNotifications((prev) => [...prev, { id: Date.now(), text: data.message }]);
          setTimeout(() => {
            setNotifications((prev) => prev.slice(1));
          }, 7000);
        } catch { }
      };
      es.onerror = () => {
        es.close();
      };
      return () => es.close();
    } catch { }
  }, []);

  useEffect(() => {
    const lastPopupDate = localStorage.getItem('lastStatsPopup');
    const today = new Date().toDateString();

    if (lastPopupDate !== today) {
      setShowStatsPopup(true);
      localStorage.setItem('lastStatsPopup', today);
    }
  }, []);

  // Global event: open Marketing from anywhere (e.g., Agents page or Chat CTA)
  useEffect(() => {
    const handler = () => setView('marketing');
    window.addEventListener('openMarketing', handler);
    return () => window.removeEventListener('openMarketing', handler);
  }, []);

  useEffect(() => {
    const tm = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(tm);
  }, []);


  function updateActive(updater) {
    setState((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === active.id ? updater(b) : b)),
    }));
  }

  function addBusiness() {
    const name = window.prompt("Business name?");
    if (!name) return;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const next = DEFAULT_BUSINESS();
    next.name = name;
    next.subdomain = slug.slice(0, 24) || genId("site");
    setState((s) => ({
      ...s,
      businesses: [...s.businesses, next],
      activeBizId: next.id,
    }));
    setView("builder");
  }

  const toggleDarkMode = () => setDarkMode((v) => !v);

  // Apply theme attribute and persist choice
  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { }
  }, [darkMode]);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    if (userData.locale) setLocale(userData.locale);
    setShowLanding(false);
  };

  // Render Landing Page if not logged in and showLanding is true
  if (showLanding && !user) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  if (!user) {
    return <AuthForm onAuth={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      {showSplash && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, transition: 'opacity 600ms' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="logo" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              <span className="logo-primary">Biz</span>panion
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>AI for Every SME</div>
          </div>
        </div>
      )}

      {showPersonaModal && (
        <div className="modal-overlay" onClick={() => { }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose your Business Type</h3>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {['Retail/E-commerce', 'Services', 'SaaS', 'Other'].map((opt) => (
                  <label key={opt} className="theme-checkbox" style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="persona"
                      checked={persona === opt}
                      onChange={() => setPersona(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
                The AI summary and recommendations will adapt to your business type.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="generate-btn"
                onClick={() => {
                  if (!persona) return;
                  localStorage.setItem('persona', persona);
                  setShowPersonaModal(false);
                }}
                style={{ maxWidth: 220 }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Theme toggle moved to Settings */}

      {/* Today's Stats Popup */}
      {showStatsPopup && (
        <>
          <div className="stats-popup-overlay" onClick={() => setShowStatsPopup(false)} />
          <div className="stats-popup">
            <div className="stats-popup-header">
              <h2 className="stats-popup-title">{t("Today's Performance")}</h2>
              <button className="close-popup" onClick={() => setShowStatsPopup(false)}>×</button>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{formatCurrency(12450)}</div>
                <div className="stat-label">{t("Today's Revenue")}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">18</div>
                <div className="stat-label">{t("New Orders")}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">12</div>
                <div className="stat-label">{t("New Customers")}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">4.8%</div>
                <div className="stat-label">{t("Conversion Rate")}</div>
              </div>
            </div>
            <button className="growth-hub-btn" onClick={() => setShowStatsPopup(false)}>
              {t("Got it!")}
            </button>
          </div>
        </>
      )}
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-overlay active"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        <div className="mobile-sidebar-header">
          <div className="logo">
            <span className="logo-primary">Biz</span>panion
          </div>
          <button className="close-sidebar" onClick={() => setMobileSidebarOpen(false)}>×</button>
        </div>
        <nav className="sidebar-nav">
          {/* Overview */}
          <NavItem
            icon="🏠"
            label={t("Dashboard")}
            active={view === "dashboard"}
            onClick={() => { setView("dashboard"); setMobileSidebarOpen(false); }}
          />

          {/* Growth & Planning */}
          <div className="nav-section-label" style={{ padding: '0.25rem 0.5rem', color: 'var(--text-tertiary)', fontSize: 12 }}>Growth & Planning</div>
          <NavItem
            icon="🚀"
            label={t("Growth Hub")}
            active={view === "growth"}
            onClick={() => { setView("growth"); setMobileSidebarOpen(false); }}
          />

          {/* Operations */}
          <div className="nav-section-label" style={{ padding: '0.25rem 0.5rem', color: 'var(--text-tertiary)', fontSize: 12 }}>Operations</div>
          <NavItem
            icon="📝"
            label={t("Tasks")}
            active={view === "tasks"}
            onClick={() => { setView("tasks"); setMobileSidebarOpen(false); }}
          />
          <NavItem
            icon="📢"
            label={t("Marketing")}
            active={view === "marketing"}
            onClick={() => { setView("marketing"); setMobileSidebarOpen(false); }}
          />

          {/* Design & Build */}
          <div className="nav-section-label" style={{ padding: '0.25rem 0.5rem', color: 'var(--text-tertiary)', fontSize: 12 }}>Design & Build</div>
          <NavItem
            icon="🧱"
            label={t("Website Builder")}
            active={view === "builder"}
            onClick={() => { setView("builder"); setMobileSidebarOpen(false); }}
          />

          {/* Admin & Settings */}
          <NavItem
            icon="⚙️"
            label={t("Settings")}
            active={view === "settings"}
            onClick={() => { setView("settings"); setMobileSidebarOpen(false); }}
          />
        </nav>
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <button
            className="sidebar-toggle"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Toggle sidebar"
          >
            <span style={{ fontSize: '1.4rem' }}>☰</span>
          </button>

          <div className="logo">
            <span className="logo-primary">Biz</span>panion
          </div>

          {/* Business switcher */}
          <div className="business-switcher">
            <select
              className="business-select"
              value={activeBizId}
              onChange={(e) =>
                setState((s) => ({ ...s, activeBizId: e.target.value }))
              }
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={addBusiness}
              className="new-business-btn"
            >
              {t("+ New Business")}
            </button>
          </div>

          <div className="header-actions">
            <button className="biz-now-btn" onClick={() => setChatOpen(v => !v)}>
              <span>{t("Biz Now")}</span>
              <span>💬</span>
            </button>
            <button
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem("token");
                setUser(null);
                setShowLanding(true); // Back to landing on logout
              }}
            >
              {t("Logout")}
            </button>
            <select
              className="business-select"
              value={locale}
              onChange={async (e) => {
                const val = e.target.value;
                setLocale(val);
                localStorage.setItem('locale', val);
                try {
                  await api.put('/auth/update', { locale: val });
                } catch { }
              }}
              style={{ marginLeft: '0.5rem' }}
            >
              <option value="en-IN">English</option>
              <option value="hi-IN">हिन्दी</option>
            </select>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="app-layout">
        {/* Main */}
        <main className="main-content">
          {view === "dashboard" && (
            <Dashboard business={active} setView={setView} formatCurrency={formatCurrency} t={t} persona={persona} />
          )}
          {view === "builder" && (
            <WebsiteBuilder business={active} onChange={updateActive} formatCurrency={formatCurrency} />
          )}
          {view === "growth" && (
            <GrowthHub business={active} onApply={updateActive} />
          )}
          {view === "tasks" && <TasksPage />}
          {view === "marketing" && <MarketingPage />}
          {view === "settings" && <SettingsPage darkMode={darkMode} setDarkMode={toggleDarkMode} setView={setView} />}
        </main>
      </div>

      {/* Toasts */}
      <div
        className="toast-container"
        style={{
          position: 'fixed',
          right: '1rem',
          bottom: '6rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 2000
        }}
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            className="toast"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              boxShadow: 'var(--shadow-lg)',
              color: 'var(--text-primary)'
            }}
          >
            {n.text}
          </div>
        ))}
      </div>

      {/* Chat Dock */}
      {chatOpen && <ChatDock business={active} t={t} locale={locale} setView={setView} />}

    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"}`}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  );
}

// -------------------------------- Dashboard -----------------------------------
function Dashboard({ business, setView, formatCurrency, t, persona }) {
  const [summary, setSummary] = useState(null);
  const [summaryText, setSummaryText] = useState('');

  useEffect(() => {
    api.get('/analytics/summary')
      .then(res => setSummary(res.data))
      .catch(() => { });
  }, []);

  useEffect(() => {
    const qs = persona ? `?persona=${encodeURIComponent(persona)}&refresh=1` : '?refresh=1';
    api.get(`/analytics/summary-text${qs}`)
      .then(res => setSummaryText(res.data?.summary || ''))
      .catch(() => { });
  }, [persona]);


  const chartData = summary?.channels || business.channels || [];
  const insightsList = summary?.insights || business.insights || [];
  const kpis = summary ? {
    revenueMonth: summary.revenueMonth,
    profitMonth: summary.profitMonth,
    aov: summary.aov,
    newCustomers: summary.newCustomers,
    revChangePct: summary.revChangePct,
    profitChangePct: summary.profitChangePct,
  } : business.kpis;

  return (
    <div className="dashboard-container">
      {summaryText && (
        <div className="settings-card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>AI Summary</div>
          <div style={{ marginTop: '0.25rem' }}>{summaryText}</div>
        </div>
      )}
      <KpiRow kpis={kpis} currencyFn={formatCurrency} />

      <div className="dashboard-grid">
        <div className="chart-container">
          <h3>{t("Revenue by Channel (Last 30 Days)")}</h3>
          <BarCompare series={chartData} currencyFn={formatCurrency} />
        </div>


        <div className="insights-container">
          <h3>{t("Performance Insights")}</h3>
          <ul className="insights-list">
            {(insightsList || []).slice(0, 3).map((i, idx) => {
              const text = typeof i === 'string' ? i : (i.text || '');
              const attentionRaw = (typeof i === 'object' && i.attention) ? i.attention : 'Medium';
              const level = String(attentionRaw).toLowerCase(); // 'high' | 'medium' | 'low'
              const levelLabel = level === 'high' ? 'Strong' : level === 'low' ? 'Weak' : 'Medium';
              // Map level to indicator/tone colors
              const type = level === 'high' ? 'warning' : level === 'low' ? 'suggestion' : 'opportunity';
              return (
                <li key={idx} className="insight-item">
                  <span className={`insight-indicator ${type === "opportunity" ? "indicator-opportunity" :
                    type === "warning" ? "indicator-warning" : "indicator-suggestion"
                    }`} />
                  <p className="insight-text">
                    <span className={`insight-type ${type === "opportunity" ? "type-opportunity" :
                      type === "warning" ? "type-warning" : "type-suggestion"
                      }`}>
                      {levelLabel}:
                    </span>
                    {text}
                  </p>
                </li>
              );
            })}
          </ul>
          <button className="growth-hub-btn" onClick={() => setView("growth")}>
            {t("View Growth Recommendations")}
          </button>
          <button
            className="growth-hub-btn"
            onClick={async () => {
              try {
                const res = await api.get('/analytics/report', { responseType: 'blob' });
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'bizpanion-report.pdf');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                window.alert('Failed to download report.');
              }
            }}
          >
            {t("Download KPI Report (PDF)")}
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiRow({ kpis, currencyFn }) {
  const items = [
    {
      label: "Total Revenue (Month)",
      value: currencyFn(kpis.revenueMonth),
      delta: `${kpis.revChangePct}%`,
      tone: "positive",
    },
    {
      label: "Net Profit (Month)",
      value: currencyFn(kpis.profitMonth),
      delta: `${kpis.profitChangePct}%`,
      tone: kpis.profitChangePct >= 0 ? "positive" : "negative",
    },
    { label: "New Customers", value: kpis.newCustomers, delta: "+30", tone: "positive" },
    { label: "Avg. Order Value", value: currencyFn(kpis.aov), delta: "Stable", tone: "neutral" },
  ];
  return (
    <div className="kpi-grid">
      {/* Using provided currency function for locale-aware formatting */}
      {items.map((it) => (
        <div
          key={it.label}
          className="kpi-card"
        >
          <div className="kpi-label">{it.label}</div>
          <div className="kpi-value">{it.value}</div>
          <div
            className={`kpi-delta delta-${it.tone}`}
          >
            {it.delta}
          </div>
        </div>
      ))}
    </div>
  );
}

function BarCompare({ series, currencyFn }) {
  const chartData = series && series.length > 0
    ? series.map(item => ({
      label: item.label,
      value: item.value,
      color: getChannelColor(item.key)
    }))
    : [
      { label: "Shopify", value: 125000, color: "var(--primary-color)", key: "shopify" },
      { label: "Amazon", value: 85000, color: "var(--secondary-color)", key: "amazon" },
      { label: "POS", value: 45000, color: "var(--accent-color)", key: "pos" },
      { label: "Meesho", value: 35000, color: "var(--info-color)", key: "meesho" }
    ];

  const maxValue = Math.max(...chartData.map(item => item.value), 1000);

  function getChannelColor(key) {
    const colors = {
      shopify: "var(--primary-color)",
      amazon: "var(--secondary-color)",
      pos: "var(--accent-color)",
      meesho: "var(--info-color)",
      instagram: "var(--warning-color)",
      default: "var(--primary-color)"
    };
    return colors[key] || colors.default;
  }

  return (
    <div className="bar-chart">
      {chartData.map((item, index) => (
        <div key={index} className="bar-container">
          <div className="bar">
            <div
              className="bar-fill"
              style={{
                height: `${(item.value / maxValue) * 85}%`,
                background: item.color
              }}
            />
            <span className="bar-value">{currencyFn(item.value)}</span>
          </div>
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ----------------------------- Website Builder ----------------------------------
function WebsiteBuilder({ business, onChange, formatCurrency }) {
  const [activeTab, setActiveTab] = useState("prompt");
  const [device, setDevice] = useState("desktop");

  function regenerateFromPrompt() {
    onChange((b) => {
      const updated = { ...b };
      const pgHome = updated.site.pages.find((p) => p.title === "Home");
      if (pgHome) pgHome.content = `<div id="hero-section-placeholder"></div>`;
      const pgShop = updated.site.pages.find((p) => p.title === "Shop");
      if (pgShop) pgShop.content = `<div id="shop-grid-placeholder"></div>`;
      return updated;
    });
  }

  function addProductViaAI() {
    const idea = window.prompt(
      "Describe the product (e.g., 'Cotton Kurta @ 999, stock 30')"
    );
    if (!idea) return;
    const match = idea.match(/(.+?)@\s*(\d+)/);
    const price = match ? Number(match[2]) : 999;
    const title = match ? match[1].trim() : idea.trim();
    const stockMatch = idea.match(/stock\s*(\d+)/i);
    const stock = stockMatch ? Number(stockMatch[1]) : 20;

    const newProduct = { id: genId("p"), title, price, stock };
    onChange((b) => {
      const nextProducts = [...b.products, newProduct];
      return {
        ...b,
        products: nextProducts,
      };
    });
  }

  function updateTheme(key, value) {
    onChange((b) => ({
      ...b,
      site: { ...b.site, theme: { ...b.site.theme, [key]: value } },
    }));
  }

  function addPage() {
    const title = window.prompt("Page title?");
    if (!title) return;
    onChange((b) => ({
      ...b,
      site: {
        ...b.site,
        pages: [
          ...b.site.pages,
          {
            id: genId("pg"),
            title,
            content: `<section class='page-section'><h2 class='page-title'>${title}</h2></section>`,
          },
        ],
      },
    }));
  }

  async function deploySite() {
    try {
      const res = await api.post("/site/deploy", { site: business.site });
      onChange((b) => ({ ...b, deployed: true, deployedAt: nowISO() }));
      window.alert(res.data.message);
    } catch (err) {
      window.alert("Failed to deploy site.");
    }
  }

  return (
    <div className="builder-container">
      {/* Tabs */}
      <div className="builder-tabs">
        {[
          { k: "prompt", t: "Prompt" },
          { k: "pages", t: "Pages" },
          { k: "products", t: "Products" },
          { k: "theme", t: "Theme" },
          { k: "deploy", t: "Deploy" },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setActiveTab(tab.k)}
            className={`tab-btn ${activeTab === tab.k ? "tab-active" : "tab-inactive"}`}
          >
            {tab.t}
          </button>
        ))}

        <div className="tab-actions">
          <DeviceToggle device={device} setDevice={setDevice} />
          <div
            className={`deploy-status ${business.deployed ? "status-deployed" : "status-not-deployed"}`}
          >
            {business.deployed
              ? `Deployed • ${new Date(business.deployedAt).toLocaleString()}`
              : "Not deployed"}
          </div>
        </div>
      </div>

      <div className="builder-content">
        {/* Left: Controls */}
        <div className="builder-controls">
          {activeTab === "prompt" && (
            <div className="control-panel">
              <h3>Describe your store</h3>
              <textarea
                className="prompt-textarea"
                value={business.site.prompt}
                onChange={(e) =>
                  onChange((b) => ({
                    ...b,
                    site: { ...b.site, prompt: e.target.value },
                  }))
                }
              />
              <button
                onClick={regenerateFromPrompt}
                className="generate-btn"
              >
                Generate / Update from Prompt
              </button>
            </div>
          )}

          {activeTab === "pages" && (
            <div className="control-panel">
              <h3>Pages</h3>
              <ul className="pages-list">
                {business.site.pages.map((p) => (
                  <li
                    key={p.id}
                    className="page-item"
                  >
                    <span className="page-title">{p.title}</span>
                    <div className="page-actions">
                      <button
                        className="edit-btn"
                        onClick={() => {
                          const html = window.prompt(
                            "Edit raw HTML for page:",
                            p.content
                          );
                          if (html != null) {
                            onChange((b) => ({
                              ...b,
                              site: {
                                ...b.site,
                                pages: b.site.pages.map((x) =>
                                  x.id === p.id ? { ...x, content: html } : x
                                ),
                              },
                            }));
                          }
                        }}
                      >
                        Edit HTML
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() =>
                          onChange((b) => ({
                            ...b,
                            site: {
                              ...b.site,
                              pages: b.site.pages.filter((x) => x.id !== p.id),
                            },
                          }))
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                onClick={addPage}
                className="add-page-btn"
              >
                + Add Page
              </button>
            </div>
          )}

          {activeTab === "products" && (
            <div className="control-panel">
              <h3>Products</h3>
              <ul className="products-list">
                {business.products.map((p) => (
                  <li
                    key={p.id}
                    className="product-item"
                  >
                    <div>
                      <div className="product-name">{p.title}</div>
                      <div className="product-details">
                        {formatCurrency(p.price)} • Stock {p.stock}
                      </div>
                    </div>
                    <div className="product-actions">
                      <button
                        className="edit-btn"
                        onClick={() => {
                          const title = window.prompt("Title", p.title) ?? p.title;
                          const price = Number(
                            window.prompt("Price", String(p.price)) ?? p.price
                          );
                          const stock = Number(
                            window.prompt("Stock", String(p.stock)) ?? p.stock
                          );
                          onChange((b) => {
                            const nextProducts = b.products.map((x) =>
                              x.id === p.id ? { ...x, title, price, stock } : x
                            );
                            return {
                              ...b,
                              products: nextProducts,
                            };
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() =>
                          onChange((b) => {
                            const nextProducts = b.products.filter(
                              (x) => x.id !== p.id
                            );
                            return {
                              ...b,
                              products: nextProducts,
                            };
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="product-add-actions">
                <button
                  onClick={addProductViaAI}
                  className="add-product-ai-btn"
                >
                  + Add Product via AI
                </button>
                <button
                  onClick={() => {
                    const title = window.prompt("Title?");
                    if (!title) return;
                    const price = Number(window.prompt("Price?", "999") || 999);
                    const stock = Number(window.prompt("Stock?", "20") || 20);
                    const newProduct = { id: genId("p"), title, price, stock };
                    onChange((b) => {
                      const nextProducts = [...b.products, newProduct];
                      return {
                        ...b,
                        products: nextProducts,
                      };
                    });
                  }}
                  className="add-product-manual-btn"
                >
                  + Add Manually
                </button>
              </div>
            </div>
          )}

          {activeTab === "theme" && (
            <div className="control-panel">
              <h3>Theme</h3>
              <label>Brand Color</label>
              <select
                className="theme-select"
                value={business.site.theme.primary}
                onChange={(e) => updateTheme("primary", e.target.value)}
              >
                {["indigo", "emerald", "rose", "violet", "amber"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label>Accent</label>
              <select
                className="theme-select"
                value={business.site.theme.accent}
                onChange={(e) => updateTheme("accent", e.target.value)}
              >
                {["amber", "cyan", "pink", "lime", "sky"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="theme-checkbox">
                <input
                  type="checkbox"
                  checked={business.site.theme.dark}
                  onChange={(e) => updateTheme("dark", e.target.checked)}
                />
                Dark Mode
              </label>
            </div>
          )}

          {activeTab === "deploy" && (
            <div className="control-panel">
              <h3>Deploy</h3>
              <div className="deploy-content">
                <div>Subdomain</div>
                <div className="subdomain-input">
                  <input
                    className="subdomain-field"
                    value={business.subdomain}
                    onChange={(e) =>
                      onChange((b) => ({
                        ...b,
                        subdomain: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      }))
                    }
                  />
                  <span className="subdomain-suffix">
                    .bizpanion.ai
                  </span>
                </div>
                <div className="deploy-note">
                  Custom domain mapping available post-deploy.
                </div>
              </div>
              <button
                onClick={deploySite}
                className="deploy-btn"
              >
                {business.deployed ? "Redeploy" : "Deploy Website"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="builder-preview">
          <div className="preview-header">
            <div className="preview-title">
              Preview • {device === "mobile" ? "Mobile" : "Desktop"}
            </div>
            <div className="preview-business">{business.name}</div>
          </div>
          <div className={`preview-content ${device === "mobile" ? "preview-mobile" : "preview-desktop"}`}>
            <div className={`preview-device ${device === "mobile" ? "mobile-frame" : "desktop-frame"}`}>
              <SitePreview pages={business.site.pages} theme={business.site.theme} businessName={business.name} products={business.products} formatCurrency={formatCurrency} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceToggle({ device, setDevice }) {
  return (
    <div className="device-toggle">
      {[
        { k: "desktop", label: "Desktop" },
        { k: "mobile", label: "Mobile" },
      ].map((d) => (
        <button
          key={d.k}
          onClick={() => setDevice(d.k)}
          className={`device-btn ${device === d.k ? "device-active" : "device-inactive"}`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

function SitePreview({ pages, theme, businessName, products, formatCurrency }) {
  const themeClass = theme.dark
    ? "preview-dark"
    : "preview-light";

  const primaryMap = {
    indigo: "#4f46e5",
    emerald: "#10b981",
    rose: "#e11d48",
    violet: "#8b5cf6",
    amber: "#f59e0b"
  };
  const accentMap = {
    amber: "#f59e0b",
    cyan: "#06b6d4",
    pink: "#ec4899",
    lime: "#84cc16",
    sky: "#0ea5e9"
  };
  const styleVars = {
    "--primary-color": primaryMap[theme?.primary] || "var(--primary-color)",
    "--accent-color": accentMap[theme?.accent] || "var(--accent-color)"
  };

  return (
    <div className={`site-preview ${themeClass}`} style={styleVars}>
      <div className="preview-nav">
        <div className="preview-nav-title">Storefront</div>
        <div className="preview-nav-subtitle">Powered by Bizpanion</div>
      </div>
      {pages.map((p) => {
        if (p.title === "Home") {
          return <HeroSection key={p.id} brand={businessName} />;
        } else if (p.title === "Shop") {
          return <ShopGrid key={p.id} products={products} formatCurrency={formatCurrency} />;
        }
        return <div key={p.id} dangerouslySetInnerHTML={{ __html: p.content }} />;
      })}
      <footer className="preview-footer">
        © {new Date().getFullYear()} • All rights reserved.
      </footer>
    </div>
  );
}

// ----------------------------- Growth Hub ----------------------------------
function GrowthHub({ business, onApply }) {
  const [plan, setPlan] = useState([]);

  useEffect(() => {
    api.post("/growth/generate", { business })
      .then(res => setPlan(res.data.map(step => ({ ...step, id: genId("gh"), done: false }))))
      .catch(() => { });
  }, [business]);

  function toggle(id) {
    setPlan((p) => p.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  }

  function applyAction(step) {
    if (step.title.toLowerCase().includes("image")) {
      onApply((b) => ({
        ...b,
        site: { ...b.site, prompt: b.site.prompt + "\n(Compressed hero images)" },
      }));
      window.alert("Applied image optimization hint to site prompt.");
    } else if (step.title.toLowerCase().includes("abandoned")) {
      window.alert("Cart recovery flow will be configured on backend (placeholder).");
    } else if (step.title.toLowerCase().includes("instagram")) {
      window.alert("Open Connections → Instagram to finish OAuth (placeholder).");
    }
  }

  const progress = Math.round(
    (plan.filter((s) => s.done).length / plan.length) * 100
  );

  return (
    <div className="growth-container">
      <div className="growth-header">
        <div>
          <h3>This Week's Growth Plan</h3>
          <p>Personalized from your live data & connections.</p>
        </div>
        <div className="progress-indicator">
          Progress: {progress}%
        </div>
      </div>

      <div className="growth-steps">
        {plan.map((s) => (
          <div
            key={s.id}
            className="growth-step"
          >
            <div className="step-header">Step</div>
            <h4>{s.title}</h4>
            <p className="step-why">
              <span className="step-label">Why: </span>
              {s.why}
            </p>
            <p className="step-action">
              <span className="step-label">Action: </span>
              {s.action}
            </p>
            <div className="step-footer">
              <span className="impact-badge">
                {s.estImpact}
              </span>
              <div className="step-actions">
                <button
                  onClick={() => applyAction(s)}
                  className="apply-btn"
                >
                  Apply
                </button>
                <button
                  onClick={() => toggle(s.id)}
                  className={`done-btn ${s.done ? "done-active" : "done-inactive"}`}
                >
                  {s.done ? "Done" : "Mark Done"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



// ----------------------------- Chat Dock ----------------------------------
function ChatDock({ business, t, locale, setView }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text:
        t("Hi! Ask me anything about your business. Try: 'Net profit last month?' or 'Compare Shopify vs Amazon this quarter'."),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceTone, setVoiceTone] = useState('Neutral professional');

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const recognition = useMemo(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = locale;
    return recog;
  }, [locale]);

  useEffect(() => {
    if (!recognition) return;
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
  }, [recognition]);

  async function ask() {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setIsTyping(true);
    try {
      const res = await api.post("/chat", { message: input.trim(), tone: voiceTone });
      const aiMsg = {
        role: "ai", ...res.data
      };
      aiMsg.text = res.data.response; // Ensure text property is set
      setMessages((m) => [...m, aiMsg]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Sorry, I couldn't get a response from the server." }
      ]);
    } finally {
      setIsTyping(false);
    }
    setInput("");
  }

  function toggleListening() {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsListening(!isListening);
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    // Clean up bot prefixes for speech
    const cleanText = text.replace(/\[(Marketing|Finance|Ops)Bot\]\s*/, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = locale;
    // Adjust voice style subtly based on selected personality
    const vt = (voiceTone || '').toLowerCase();
    if (vt.includes('mentor')) { utterance.rate = 0.95; utterance.pitch = 1.0; }
    else if (vt.includes('startup')) { utterance.rate = 1.12; utterance.pitch = 1.05; }
    else if (vt.includes('friendly')) { utterance.rate = 1.02; utterance.pitch = 1.15; }
    else if (vt.includes('formal')) { utterance.rate = 0.92; utterance.pitch = 0.95; }
    else { utterance.rate = 1.0; utterance.pitch = 1.0; }
    window.speechSynthesis.cancel(); // Stop any previous speech
    window.speechSynthesis.speak(utterance);
  }

  async function executeAction(action) {
    if (!action || !action.type) return;

    try {
      let endpoint = '';
      if (action.type === 'send_email') {
        endpoint = '/actions/send-email';
      } else if (action.type === 'post_social') {
        endpoint = '/actions/post-social';
      } else {
        throw new Error(`Unknown action type: ${action.type}`);
      }

      const res = await api.post(endpoint, action.parameters);
      window.alert(res.data.message || 'Action executed (mock).');

      // Optional: Add a system message to chat confirming execution
      setMessages(m => [...m, { role: 'ai', text: `Action executed: ${res.data.message}` }]);

    } catch (err) {
      window.alert(`Action failed: ${err.response?.data?.error || err.message}`);
    }
  }

  async function addTaskFromMessage(index) {
    try {
      const m = messages[index];
      const title = (m?.text || "AI suggestion").slice(0, 80);
      await api.post("/tasks", {
        title,
        description: m?.text || "",
        source: "chat"
      });
      window.alert(t("Task added from chat."));
    } catch (e) {
      console.error("Add task failed", e);
      window.alert(t("Failed to add task."));
    }
  }

  function getBotIcon(text) {
    if (text.startsWith('[MarketingBot]')) return '📢';
    if (text.startsWith('[FinanceBot]')) return '💰';
    if (text.startsWith('[OpsBot]')) return '⚙️';
    return '🤖';
  }

  return (
    <div className="chat-dock">
      <div className="chat-header">
        <div className="chat-title">Bizpanion AI</div>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => {
          const botIcon = m.role === 'ai' ? getBotIcon(m.text) : null;
          return (
            <div
              key={i}
              className={`chat-message ${m.role === "ai" ? "message-ai" : "message-user"}`}
            >
              <div className="chat-message-content">
                {botIcon && <span className="bot-icon">{botIcon}</span>}
                <div>{m.text}</div>
              </div>
              {m.role === "ai" && m.citations && Array.isArray(m.citations) && m.citations.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Sources: {m.citations.map((c, idx) => `Doc ${c.doc_id}, chunk ${c.chunk_index}`).join('; ')}
                </div>
              )}
              {m.role === "ai" && m.text && (
                <div className="chat-actions-bar">
                  <button className="edit-btn" onClick={() => addTaskFromMessage(i)}>{t("+ Add as Task")}</button>
                  <button
                    className="edit-btn"
                    onClick={async () => {
                      try {
                        await api.post('/analytics/insights', { text: m?.text || '' });
                        window.alert(t('Saved as Insight.'));
                      } catch (e) {
                        window.alert(t('Failed to save insight.'));
                      }
                    }}
                  >
                    {t("Save as Insight")}
                  </button>
                  {m.action && (
                    <button className="apply-btn" onClick={() => executeAction(m.action)}>
                      {m.action.type === 'send_email' ? '✉️ Send Email' : '🚀 Post to Social'}
                    </button>
                  )}
                  {/campaign/i.test(m.text || '') && (
                    <button
                      className="apply-btn"
                      onClick={() => {
                        try {
                          const prefill = {
                            businessType: 'Retail/E-commerce',
                            targetAudience: 'Existing customers',
                            tone: 'Friendly',
                            contentType: 'Ad Copy'
                          };
                          localStorage.setItem('marketing_prefill', JSON.stringify(prefill));
                        } catch { }
                        setView && setView('marketing');
                      }}
                    >
                      → Create Marketing Campaign
                    </button>
                  )}
                  <button className="speak-btn" onClick={() => speak(m.text)}>🔊</button>
                </div>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div className="chat-message message-ai">
            <div className="typing-dots" aria-label={t("Typing…")}>
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>
      <div className="chat-input-container">
        <button onClick={toggleListening} className={`mic-btn ${isListening ? 'listening' : ''}`}>
          {isListening ? '...' : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          )}
        </button>
        <select
          className="business-select"
          value={voiceTone}
          onChange={(e) => setVoiceTone(e.target.value)}
          style={{ maxWidth: '220px', margin: '0 0.5rem' }}
          aria-label="Voice personality"
        >
          <option>Neutral professional</option>
          <option>Business Mentor</option>
          <option>Startup Co-founder</option>
          <option>Friendly Consultant</option>
          <option>Formal Executive</option>
        </select>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder={t("Ask about your live data…")}
          className="chat-input"
        />
        <button onClick={ask} className="chat-send-btn">
          {t("Ask")}
        </button>
      </div>
    </div>
  );
}
