import React, { useState } from 'react';
import { api } from './api';

export default function SettingsPage({ darkMode, setDarkMode, setView }) {
  // Demo data controls
  const [days, setDays] = useState(45);
  const [density, setDensity] = useState('medium'); // low | medium | high
  const [reset, setReset] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');

  // Alerts digest preview
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestPreview, setDigestPreview] = useState('');
  const [digestError, setDigestError] = useState('');
  // Automation & Reports
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [schedulerMsg, setSchedulerMsg] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  async function seedDemo() {
    setSeeding(true);
    setMessage('');
    try {
      const res = await api.post('/demo/seed', {
        reset,
        days: Number(days) || 45,
        density
      });
      setMessage(res.data?.message || 'Demo data seeded.');
      // Optional: jump to Dashboard to visualize immediately
      setView && setView('dashboard');
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to seed demo data.');
    } finally {
      setSeeding(false);
    }
  }

  async function clearDemo() {
    setClearing(true);
    setMessage('');
    try {
      const res = await api.post('/demo/clear');
      setMessage(res.data?.message || 'Demo data cleared.');
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to clear demo data.');
    } finally {
      setClearing(false);
    }
  }

  async function previewDigest() {
    setDigestLoading(true);
    setDigestError('');
    setDigestPreview('');
    try {
      const persona = localStorage.getItem('persona') || '';
      const res = await api.post('/alerts/digest', {
        channel: 'email',
        to: '',
        persona
      });
      const text = res.data?.preview?.text || '';
      setDigestPreview(text);
    } catch (e) {
      setDigestError(e?.response?.data?.error || 'Failed to build digest.');
    } finally {
      setDigestLoading(false);
    }
  }

  async function runSchedulerNow() {
    setSchedulerLoading(true);
    setSchedulerMsg('');
    try {
      const res = await api.post('/scheduler/run');
      const checked = res.data?.checked ?? 0;
      const results = Array.isArray(res.data?.results) ? res.data.results : [];
      const created = results.reduce((sum, r) => sum + (r.created || 0), 0);
      setSchedulerMsg(`Scheduler ran across ${checked} user(s); created ${created} new insight(s).`);
    } catch (e) {
      setSchedulerMsg(e?.response?.data?.error || 'Failed to run scheduler.');
    } finally {
      setSchedulerLoading(false);
    }
  }

  async function downloadAudit() {
    setAuditLoading(true);
    try {
      const persona = localStorage.getItem('persona') || '';
      const qs = persona ? `?persona=${encodeURIComponent(persona)}` : '';
      const res = await api.get(`/audit/report${qs}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', 'bizpanion-audit.pdf');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download audit report.');
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-card">
        <h3>Settings</h3>
        <p>
          Manage your application settings, demo data, and theme.
        </p>
      </div>

      {/* Automation & Reports */}
      <div className="settings-card">
        <h4>Automation & Reports</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
          Run the KPI auto-insights scheduler on demand, or download a unified SME Audit PDF (KPIs + AI Summary + Insights + Brand).
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="edit-btn" onClick={runSchedulerNow} disabled={schedulerLoading} style={{ maxWidth: 220 }}>
            {schedulerLoading ? 'Running…' : 'Run Scheduler Now'}
          </button>
          <button className="generate-btn" onClick={downloadAudit} disabled={auditLoading} style={{ maxWidth: 240 }}>
            {auditLoading ? 'Preparing…' : 'Download Audit Report'}
          </button>
        </div>
        {schedulerMsg && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            {schedulerMsg}
          </div>
        )}
      </div>

      <div className="settings-card">
        <h4>Theme</h4>
        <p style={{ marginBottom: '0.5rem' }}>
          Choose your preferred interface theme.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode && setDarkMode()}
          />
          Dark Mode
        </label>
      </div>

      <div className="settings-card">
        <h4>Demo Data (for Live Feature Showcase)</h4>
        <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Seed realistic sample data into your database to demonstrate analytics, business health, tasks, and AI insights. You can clear it anytime.
        </p>
        <div
          className="form-grid"
          style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
            <label>Days of history</label>
            <input
              className="subdomain-field"
              type="number"
              min={7}
              max={120}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
            <label>Order volume</label>
            <select
              className="theme-select"
              value={density}
              onChange={(e) => setDensity(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
            <label>Reset before seeding</label>
            <label className="theme-checkbox">
              <input
                type="checkbox"
                checked={!!reset}
                onChange={(e) => setReset(e.target.checked)}
              />
              Clear previous demo data (orders, connections, tasks, insights)
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button className="generate-btn" onClick={seedDemo} disabled={seeding} style={{ maxWidth: 220 }}>
            {seeding ? 'Seeding…' : 'Seed Demo Data'}
          </button>
          <button className="delete-btn" onClick={clearDemo} disabled={clearing} style={{ maxWidth: 220 }}>
            {clearing ? 'Clearing…' : 'Clear Demo Data'}
          </button>
          <button className="edit-btn" onClick={() => setView && setView('dashboard')} style={{ maxWidth: 220 }}>
            View Dashboard
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Pro tip: After seeding, check
          {' '}<strong>Dashboard</strong> (KPIs + channel chart),
          {' '}<strong>Health</strong> (score & reasons),
          {' '}<strong>Tasks</strong> (priorities & progress),
          and <strong>Insights</strong>. Ask the AI about revenue, profit, AOV, or compare channels.
        </div>
      </div>

      {/* Daily Digest (Smart Alerts) */}
      <div className="settings-card">
        <h4>Daily Digest (Preview)</h4>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
          Build a daily summary using your AI KPI paragraph and latest insights. Configure providers later; this preview shows exactly what would be sent.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="generate-btn" onClick={previewDigest} disabled={digestLoading} style={{ maxWidth: 240 }}>
            {digestLoading ? 'Building…' : 'Preview Daily Digest'}
          </button>
          {digestPreview && (
            <button
              className="edit-btn"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(digestPreview);
                  alert('Digest copied to clipboard.');
                } catch {}
              }}
            >
              Copy
            </button>
          )}
        </div>
        {digestError && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              background: 'var(--error-50)',
              color: 'var(--error-600)',
            }}
          >
            {digestError}
          </div>
        )}
        {digestPreview && (
          <pre
            style={{
              marginTop: '0.75rem',
              whiteSpace: 'pre-wrap',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              padding: '0.75rem'
            }}
          >
            {digestPreview}
          </pre>
        )}
      </div>
    </div>
  );
}
