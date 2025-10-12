import React, { useState } from 'react';
import { api } from './api';

export default function MarketingPage() {
  const [businessType, setBusinessType] = useState('Retail/E-commerce');
  const [targetAudience, setTargetAudience] = useState('Young professionals in metro cities');
  const [tone, setTone] = useState('Friendly');
  const [contentType, setContentType] = useState('Ad Copy');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // Prefill from localStorage (e.g., from Chat or Agents pipeline)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('marketing_prefill');
      if (raw) {
        const pf = JSON.parse(raw);
        setBusinessType(pf.businessType || 'Retail/E-commerce');
        setTargetAudience(pf.targetAudience || 'Existing customers');
        setTone(pf.tone || 'Friendly');
        setContentType(pf.contentType || 'Ad Copy');

        // If agent provided a ready suggestion, surface it instantly
        const draft = [
          pf.tagline ? `Tagline: ${pf.tagline}` : null,
          pf.copy ? `Copy: ${pf.copy}` : null,
          pf.cta ? `CTA: ${pf.cta}` : null
        ].filter(Boolean).join('\n');

        if (draft) setResult(draft);
        localStorage.removeItem('marketing_prefill');
      }
    } catch {}
  }, []);
  
  async function handleGenerate(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await api.post('/ai/generate-marketing', {
        businessType,
        targetAudience,
        tone,
        contentType
      });
      const content = res.data?.content || '';
      setResult(content);
    } catch (err) {
      console.error('Generate marketing content failed', err);
      setError(err?.response?.data?.error || 'Failed to generate marketing content');
    } finally {
      setLoading(false);
    }
  }

  function copyResult() {
    try {
      navigator.clipboard.writeText(result || '');
    } catch {}
  }

  function downloadResult() {
    try {
      const blob = new Blob([result || ''], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = `marketing_${contentType.toLowerCase().replace(/\s+/g, '-')}.txt`;
      a.setAttribute('download', fname);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
  }

  return (
    <div className="marketing-page" style={{ padding: '1rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>AI Marketing Content Generator</h1>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
        Generate brand posts, ad copies, email campaigns, and social captions in your company’s voice.
      </p>

      <form
        onSubmit={handleGenerate}
        className="marketing-form"
        style={{ display: 'grid', gap: '0.75rem', maxWidth: 900, marginTop: '1rem' }}
      >
        <div
          className="form-grid"
          style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
        >
          <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
            <label>Business Type</label>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g., Retail/E-commerce, Services, SaaS"
              className="subdomain-field"
            />
          </div>
          <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
            <label>Target Audience</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Young professionals in metro cities"
              className="subdomain-field"
            />
          </div>
          <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
            <label>Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="theme-select"
            >
              <option>Friendly</option>
              <option>Professional</option>
              <option>Witty</option>
              <option>Luxury</option>
              <option>Minimal</option>
            </select>
          </div>
          <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
            <label>Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="theme-select"
            >
              <option>Ad Copy</option>
              <option>Instagram Caption</option>
              <option>Email Campaign</option>
              <option>LinkedIn Post</option>
              <option>Landing Page Headline</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="generate-btn" type="submit" disabled={loading} style={{ maxWidth: 240 }}>
            {loading ? 'Generating…' : 'Generate Content'}
          </button>
          {result && (
            <>
              <button type="button" className="edit-btn" onClick={copyResult}>
                Copy
              </button>
              <button type="button" className="edit-btn" onClick={downloadResult}>
                Download .txt
              </button>
            </>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              color: 'var(--danger-text)',
              background: 'var(--danger-bg)',
              maxWidth: 900
            }}
          >
            {error}
          </div>
        )}
      </form>

      {result && (
        <div
          className="marketing-result"
          style={{
            marginTop: '1rem',
            padding: '1rem',
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            background: 'var(--bg-primary)',
            maxWidth: 900
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Generated {contentType}</h3>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result}</div>
        </div>
      )}
    </div>
  );
}
