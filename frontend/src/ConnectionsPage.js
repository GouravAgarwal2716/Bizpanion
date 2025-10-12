import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./ConnectionsPage.css";

// Default connections data with icons and colors
const DEFAULT_CONNECTIONS = [
  { 
    key: "shopify", 
    name: "Shopify", 
    icon: "🛒", 
    color: "#96BF48",
    description: "E-commerce platform",
    connected: false, 
    lastSync: null 
  },
  { 
    key: "amazon", 
    name: "Amazon Seller", 
    icon: "📦", 
    color: "#FF9900",
    description: "Marketplace integration",
    connected: false, 
    lastSync: null 
  },
  { 
    key: "meesho", 
    name: "Meesho", 
    icon: "🎯", 
    color: "#F43397",
    description: "Social commerce",
    connected: false, 
    lastSync: null 
  },
  { 
    key: "ga4", 
    name: "Google Analytics 4", 
    icon: "📊", 
    color: "#EA4335",
    description: "Analytics & insights",
    connected: false, 
    lastSync: null 
  },
  { 
    key: "instagram", 
    name: "Instagram Ads", 
    icon: "📸", 
    color: "#E4405F",
    description: "Social media advertising",
    connected: false, 
    lastSync: null 
  },
  { 
    key: "razorpay", 
    name: "Razorpay", 
    icon: "💳", 
    color: "#3395FF",
    description: "Payment gateway",
    connected: false, 
    lastSync: null 
  },
  { 
    key: "quickbooks", 
    name: "QuickBooks", 
    icon: "📋", 
    color: "#0077C5",
    description: "Accounting software",
    connected: false, 
    lastSync: null 
  },
  { 
    key: "pos", 
    name: "Offline POS", 
    icon: "🏪", 
    color: "#6B7280",
    description: "Point of sale system",
    connected: false, 
    lastSync: null 
  },
];

export default function ConnectionsPage() {
  const [conns, setConns] = useState(DEFAULT_CONNECTIONS);
  const [loading, setLoading] = useState(false);

  async function fetchConns() {
    try {
      const res = await api.get("/connections");
      // Merge backend data with default connections
      const backendConns = res.data;
      const mergedConns = DEFAULT_CONNECTIONS.map(defaultConn => {
        const backendConn = backendConns.find(bc => bc.key === defaultConn.key);
        return backendConn ? backendConn : defaultConn;
      });
      setConns(mergedConns);
    } catch (error) {
      console.error("Error fetching connections:", error);
      // Keep default connections if API fails
      setConns(DEFAULT_CONNECTIONS);
    }
  }

  useEffect(() => { fetchConns(); }, []);

  const toggleConnect = async (key, connected) => {
    setLoading(true);
    try {
      if (connected) {
        await api.post(`/connections/${key}/disconnect`);
      } else {
        await api.post(`/connections/${key}/connect`);
      }
      await fetchConns();
    } catch (error) {
      console.error("Error toggling connection:", error);
    }
    setLoading(false);
  };

  const handleSync = async (key) => {
    setLoading(true);
    try {
      await api.post(`/connections/${key}/sync`);
      await fetchConns();
    } catch (error) {
      console.error("Error syncing:", error);
    }
    setLoading(false);
  };

  // Mock OAuth flow: start -> callback with state
  const handleOAuth = async (key) => {
    setLoading(true);
    try {
      const start = await api.post(`/connections/${key}/oauth/start`);
      const state = start?.data?.state;
      if (!state) throw new Error("No OAuth state received");
      await api.post(`/connections/${key}/oauth/callback`, { state });
      await fetchConns();
      window.alert(`${key} authorized (mock)`);
    } catch (error) {
      console.error("Error in mock OAuth:", error);
      window.alert("OAuth (mock) failed.");
    }
    setLoading(false);
  };

  return (
    <div className="connections-container">
      <div className="connections-header">
        <h3>Connections</h3>
        <p>
          Connect your platforms. Data sync runs continuously via webhooks & APIs.
        </p>
      </div>

      <div className="connections-grid">
        {conns.map((c) => (
          <div
            key={c.key}
            className="connection-card"
            style={{ '--brand-color': c.color }}
          >
            <div className="connection-header">
              <div className="connection-icon" style={{ backgroundColor: c.color }}>
                {c.icon}
              </div>
              <div className="connection-info">
                <div className="connection-name">{c.name}</div>
                <div className="connection-description">{c.description}</div>
                <div className="connection-status">
                  {c.connected
                    ? `Last sync: ${
                        c.lastSync ? new Date(c.lastSync).toLocaleString() : "just now"
                      }`
                    : "Not connected"}
                </div>
              </div>
            </div>
            <div className="connection-actions">
              <div className="status-indicator">
                <span
                  className={`status-dot ${c.connected ? "status-connected" : "status-disconnected"}`}
                ></span>
                <span className="status-text">
                  {c.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="action-buttons">
                <button
                  disabled={loading}
                  onClick={() => toggleConnect(c.key, c.connected)}
                  className={`connection-btn ${c.connected ? "btn-disconnect" : "btn-connect"}`}
                >
                  {loading ? "..." : (c.connected ? "Disconnect" : "Connect")}
                </button>
                {!c.connected && (
                  <button
                    disabled={loading}
                    onClick={() => handleOAuth(c.key)}
                    className="sync-btn"
                    title="Mock OAuth authorize"
                  >
                    {loading ? "..." : "OAuth (Mock)"}
                  </button>
                )}
                {c.connected && (
                  <button
                    disabled={loading}
                    onClick={() => handleSync(c.key)}
                    className="sync-btn"
                  >
                    {loading ? "..." : "Sync Now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pos-options">
        <h4>POS (Offline) Options</h4>
        <div className="pos-grid">
          <div className="pos-option">
            Webhook URL:{" "}
            <span className="pos-value">
              https://api.bizpanion.ai/pos/your-business-id
            </span>
          </div>
          <div className="pos-option">
            CSV Drop: <span className="pos-note">Drag & drop (coming soon)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
