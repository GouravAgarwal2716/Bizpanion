import React, { useState } from 'react';
import { api } from './api';

export default function PitchDeckPage({ business }) {
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [fileName, setFileName] = useState('bizpanion-pitch.pdf');

  async function generatePitch() {
    setLoading(true);
    setErr('');
    try {
      const res = await api.post('/pitch/generate', {
        business: business || {}
      });
      const p = res.data?.pitch || null;
      setPitch(p);
    } catch (e) {
      console.error('Generate pitch failed', e);
      setErr(e?.response?.data?.error || 'Failed to generate pitch');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    if (!pitch) return;
    try {
      const res = await api.post('/pitch/pdf', { pitch, fileName }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', (fileName || 'pitch.pdf').replace(/[^\w.-]+/g, '_'));
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download PDF failed', e);
      alert('Failed to download PDF.');
    }
  }

  function updateTitle(v) {
    setPitch(prev => ({ ...(prev || {}), title: v }));
  }
  function updateSubtitle(v) {
    setPitch(prev => ({ ...(prev || {}), subtitle: v }));
  }
  function updateSectionHeading(i, v) {
    setPitch(prev => {
      const sections = [...(prev?.sections || [])];
      if (!sections[i]) sections[i] = { heading: '', bullets: [] };
      sections[i] = { ...sections[i], heading: v };
      return { ...(prev || {}), sections };
    });
  }
  function updateBullet(i, j, v) {
    setPitch(prev => {
      const sections = [...(prev?.sections || [])];
      if (!sections[i]) sections[i] = { heading: '', bullets: [] };
      const bullets = [...(sections[i].bullets || [])];
      bullets[j] = v;
      sections[i] = { ...sections[i], bullets };
      return { ...(prev || {}), sections };
    });
  }

  return (
    <div className="settings-container">
      <div className="settings-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>AI Pitch Deck Generator</h3>
        <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
          Generate a concise, investor-ready pitch outline. Edit and download as PDF.
        </p>
      </div>

      <div className="settings-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="generate-btn" onClick={generatePitch} disabled={loading} style={{ maxWidth: 260 }}>
            {loading ? 'Generating…' : 'Generate from Business'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            File name:
            <input
              className="subdomain-field"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="bizpanion-pitch.pdf"
              style={{ maxWidth: 320 }}
            />
          </label>
          <label className="theme-checkbox" style={{ marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={editMode}
              onChange={(e) => setEditMode(e.target.checked)}
            />
            Edit mode
          </label>
          <button className="edit-btn" onClick={downloadPDF} disabled={!pitch}>
            Download PDF
          </button>
        </div>
        {err && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              background: 'var(--error-50)',
              color: 'var(--error-600)'
            }}
          >
            {err}
          </div>
        )}
      </div>

      {!pitch ? (
        <div className="settings-card">
          <div style={{ color: 'var(--text-secondary)' }}>No pitch generated yet. Click “Generate from Business”.</div>
        </div>
      ) : (
        <div className="settings-card" style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ fontWeight: 600 }}>Title</label>
            {editMode ? (
              <input
                className="subdomain-field"
                value={pitch.title || ''}
                onChange={(e) => updateTitle(e.target.value)}
              />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 700 }}>{pitch.title || 'Untitled'}</div>
            )}
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Subtitle</label>
            {editMode ? (
              <input
                className="subdomain-field"
                value={pitch.subtitle || ''}
                onChange={(e) => updateSubtitle(e.target.value)}
              />
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>{pitch.subtitle || '—'}</div>
            )}
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {(pitch.sections || []).map((sec, i) => (
              <div key={i} className="settings-card" style={{ padding: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 600 }}>Section</label>
                  {editMode ? (
                    <input
                      className="subdomain-field"
                      value={sec.heading || ''}
                      onChange={(e) => updateSectionHeading(i, e.target.value)}
                    />
                  ) : (
                    <h4 style={{ margin: 0 }}>{sec.heading || `Section ${i + 1}`}</h4>
                  )}
                </div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'grid', gap: '0.35rem' }}>
                  {(sec.bullets || []).map((b, j) => (
                    <li key={j}>
                      {editMode ? (
                        <input
                          className="subdomain-field"
                          value={b || ''}
                          onChange={(e) => updateBullet(i, j, e.target.value)}
                        />
                      ) : (
                        <span>{b}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
