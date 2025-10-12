import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./InsightsPage.css";

export default function InsightsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchInsights() {
    setLoading(true);
    try {
      const res = await api.get("/analytics/insights");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to load insights", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(insightId) {
    if (!window.confirm("Are you sure you want to delete this insight?")) {
      return;
    }

    try {
      await api.delete(`/analytics/insights/${insightId}`);
      setItems((prevItems) => prevItems.filter((item) => item.id !== insightId));
    } catch (e) {
      console.error("Failed to delete insight", e);
      alert("Could not delete the insight. Please try again.");
    }
  }

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="insights-page-container">
      <div className="insights-header">
        <h2>Saved Insights</h2>
        <p>A collection of all insights you've saved from the AI assistant.</p>
        <button className="edit-btn" onClick={fetchInsights} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="insights-content">
        {loading ? (
          <div className="loading-state">Loading insights...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No saved insights yet.</h3>
            <p>Use the "Save as Insight" button in the chat to collect important points here.</p>
          </div>
        ) : (
          <ul className="insights-list-display">
            {items.map((it) => (
              <li key={it.id} className="insight-card">
                <div className="insight-card-content">
                  <p>{it.content}</p>
                </div>
                <div className="insight-card-footer">
                  <span>Saved on: {new Date(it.createdAt).toLocaleString()}</span>
                  <button className="delete-insight-btn" onClick={() => handleDelete(it.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
