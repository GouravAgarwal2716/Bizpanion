import React, { useEffect, useState } from 'react';
import { api } from './api';

export default function HealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr('');
      try {
        const res = await api.get('/analytics/health');
        setHealth(res.data || null);
      } catch (e) {
        console.error('Health load failed', e);
        setErr(e?.response?.data?.error || 'Failed to load business health');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="settings-container">
      <div className="settings-card" style={{ marginBottom: '1rem' }}>
        <h3>Business Health</h3>
        <p>Overall performance snapshot based on revenue, profit, channel diversification, integrations, and new customer growth.</p>
      </div>

      {loading ? (
        <div className="settings-card">
          <div className="loading-state">Calculating health…</div>
        </div>
      ) : err ? (
        <div
          className="settings-card"
          style={{
            borderColor: 'var(--error-600)',
            background: 'var(--error-50)',
            color: 'var(--error-600)'
          }}
        >
          {err}
        </div>
      ) : (
        <div className="settings-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                border: '2px solid var(--border-primary)',
                boxShadow: 'var(--shadow-md)',
                fontWeight: 800,
                fontSize: 22,
                color: 'var(--primary-600)'
              }}
              aria-label="Health Score"
            >
              {Math.round(health?.score ?? 0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                Overall Health Score
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                0–100 scale, higher is better
              </div>
            </div>
          </div>

          {Array.isArray(health?.reasons) && health.reasons.length > 0 && (
            <>
              <h4 style={{ marginTop: '0.75rem' }}>Key Factors</h4>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
                {health.reasons.map((r, i) => (
                  <li key={i} style={{ marginBottom: '0.4rem' }}>
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button
              className="generate-btn"
              onClick={async () => {
                try {
                  setLoading(true);
                  const res = await api.get('/analytics/health');
                  setHealth(res.data || null);
                } catch (e) {
                  setErr(e?.response?.data?.error || 'Failed to refresh health');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ maxWidth: 220 }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
