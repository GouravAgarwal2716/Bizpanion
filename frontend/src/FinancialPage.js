import React, { useMemo, useState } from 'react';
import { api } from './api';

export default function FinancialPage() {
  const [businessType, setBusinessType] = useState('Retail/E-commerce');
  const [initialInvestment, setInitialInvestment] = useState(150000);
  const [monthlyRevenue, setMonthlyRevenue] = useState(200000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(120000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [showExpected, setShowExpected] = useState(true);
  const [showBest, setShowBest] = useState(true);
  const [showWorst, setShowWorst] = useState(true);

  const monthlyProfit = useMemo(
    () => Math.max(0, Number(monthlyRevenue || 0) - Number(monthlyExpenses || 0)),
    [monthlyRevenue, monthlyExpenses]
  );
  const monthsToBreakeven = useMemo(() => {
    const p = monthlyProfit;
    if (p <= 0) return Infinity;
    return Math.ceil(Number(initialInvestment || 0) / p);
  }, [monthlyProfit, initialInvestment]);

  function setPreset(preset) {
    if (preset === 'retail') {
      setBusinessType('Retail/E-commerce');
      setInitialInvestment(150000);
      setMonthlyRevenue(200000);
      setMonthlyExpenses(120000);
    } else if (preset === 'services') {
      setBusinessType('Services');
      setInitialInvestment(50000);
      setMonthlyRevenue(120000);
      setMonthlyExpenses(60000);
    } else if (preset === 'saas') {
      setBusinessType('SaaS');
      setInitialInvestment(300000);
      setMonthlyRevenue(350000);
      setMonthlyExpenses(220000);
    }
  }

  async function handleForecast(e) {
    e?.preventDefault?.();
    setLoading(true);
    setError('');
    setResult('');
    setParsed(null);
    try {
      const res = await api.post('/ai/financial-projections', {
        businessType,
        initialInvestment: Number(initialInvestment),
        monthlyRevenue: Number(monthlyRevenue),
        monthlyExpenses: Number(monthlyExpenses),
      });
      const payload = res.data?.projections || res.data || '';
      setResult(payload);
      try {
        const obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (obj && obj.monthly && Array.isArray(obj.monthly)) {
          setParsed(obj);
        }
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Forecast failed', err);
      setError(err?.response?.data?.error || 'Failed to generate projections');
    } finally {
      setLoading(false);
    }
  }

  function copyText(s) {
    try {
      navigator.clipboard.writeText(s);
    } catch {}
  }

  function downloadText(s) {
    try {
      const blob = new Blob([s || ''], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = `financial_projections_${businessType.toLowerCase().replace(/\s+/g, '-')}.txt`;
      a.setAttribute('download', fname);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
  }

  function renderResult(content) {
    if (!content) return null;

    // Attempt JSON rendering first
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (typeof parsed === 'object') {
        return (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      }
    } catch {
      // fall through to text layout
    }

    // Text rendering with smart highlighting of key sections
    const lines = String(content).split(/\n+/).map(l => l.trim()).filter(Boolean);
    const blocks = [];
    let current = { title: '', body: [] };

    const isHeader = (s) => /^(executive summary|cash flow|break-even|profit|growth|risk|timeline)/i.test(s);

    lines.forEach((line) => {
      if (isHeader(line)) {
        if (current.title || current.body.length) blocks.push(current);
        current = { title: line, body: [] };
      } else {
        current.body.push(line);
      }
    });
    if (current.title || current.body.length) blocks.push(current);

    if (blocks.length === 0) {
      return <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(content)}</div>;
    }

    return (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {blocks.map((b, idx) => (
          <div key={idx} className="settings-card" style={{ padding: '1rem' }}>
            {b.title && <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{b.title}</h4>}
            <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {b.body.join('\n')}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Simple chart components (SVG-based)
  function MultiLineChart({ data, show }) {
    if (!data || !Array.isArray(data.monthly) || data.monthly.length === 0) return null;
    const width = 760, height = 220, pad = 28;
    const months = data.monthly;
    const xs = months.map((m, i) => i);
    const maxRevenue = Math.max(
      1,
      ...months.map(m => Math.max(m.revenue_expected || 0, m.revenue_best || 0, m.revenue_worst || 0))
    );
    const maxProfit = Math.max(
      1,
      ...months.map(m => Math.max(m.profit_expected || 0, m.profit_best || 0, m.profit_worst || 0))
    );
    const stepX = (width - pad * 2) / Math.max(1, months.length - 1);
    const toX = (i) => pad + i * stepX;
    const toY = (v, maxY) => height - pad - (v / (maxY || 1)) * (height - pad * 2);

    const mkPath = (arr, maxY) =>
      arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v, maxY)}`).join(' ');

    const colors = {
      expected: 'var(--primary-color)',
      best: 'var(--success-600)',
      worst: 'var(--danger-600)'
    };

    const revExpected = months.map(m => Number(m.revenue_expected || 0));
    const revBest = months.map(m => Number(m.revenue_best || 0));
    const revWorst = months.map(m => Number(m.revenue_worst || 0));

    const profExpected = months.map(m => Number(m.profit_expected || 0));
    const profBest = months.map(m => Number(m.profit_best || 0));
    const profWorst = months.map(m => Number(m.profit_worst || 0));

    const breakevenIdx = typeof data.breakeven_month_index === 'number' ? data.breakeven_month_index : -1;

    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {/* Revenue */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div style={{ fontWeight: 700 }}>Revenue (6 months)</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label className="theme-checkbox"><input type="checkbox" checked={show.expected} onChange={e => show.setShowExpected(e.target.checked)} /> Expected</label>
              <label className="theme-checkbox"><input type="checkbox" checked={show.best} onChange={e => show.setShowBest(e.target.checked)} /> Best</label>
              <label className="theme-checkbox"><input type="checkbox" checked={show.worst} onChange={e => show.setShowWorst(e.target.checked)} /> Worst</label>
            </div>
          </div>
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
              const y = height - pad - r * (height - pad * 2);
              return <line key={idx} x1={pad} x2={width - pad} y1={y} y2={y} stroke="var(--border-primary)" strokeDasharray="4 4" strokeWidth="1" />;
            })}
            {show.expected && <path d={mkPath(revExpected, maxRevenue)} fill="none" stroke={colors.expected} strokeWidth="2" />}
            {show.best && <path d={mkPath(revBest, maxRevenue)} fill="none" stroke={colors.best} strokeWidth="2" />}
            {show.worst && <path d={mkPath(revWorst, maxRevenue)} fill="none" stroke={colors.worst} strokeWidth="2" />}
            {/* X labels */}
            {months.map((m, i) => (
              <text key={i} x={toX(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{m.month}</text>
            ))}
          </svg>
        </div>

        {/* Profit */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Profit (6 months)</div>
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
              const y = height - pad - r * (height - pad * 2);
              return <line key={idx} x1={pad} x2={width - pad} y1={y} y2={y} stroke="var(--border-primary)" strokeDasharray="4 4" strokeWidth="1" />;
            })}
            {show.expected && <path d={mkPath(profExpected, maxProfit)} fill="none" stroke={colors.expected} strokeWidth="2" />}
            {show.best && <path d={mkPath(profBest, maxProfit)} fill="none" stroke={colors.best} strokeWidth="2" />}
            {show.worst && <path d={mkPath(profWorst, maxProfit)} fill="none" stroke={colors.worst} strokeWidth="2" />}
            {/* Break-even marker on expected cumulative */}
            {breakevenIdx >= 0 && breakevenIdx < months.length && (
              <g>
                <line x1={toX(breakevenIdx)} x2={toX(breakevenIdx)} y1={pad} y2={height - pad} stroke="var(--warning-600)" strokeDasharray="6 4" />
                <text x={toX(breakevenIdx)} y={pad + 12} textAnchor="middle" fontSize="10" fill="var(--warning-700)">Break-even</text>
              </g>
            )}
            {months.map((m, i) => (
              <text key={i} x={toX(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{m.month}</text>
            ))}
          </svg>
        </div>

        {/* Assumptions & Risks */}
        <div className="settings-card" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'grid', gap: '0.35rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Assumptions</div>
              <ul style={{ margin: 0, paddingInlineStart: '1.2rem' }}>
                {(data.assumptions || []).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Risks</div>
              <ul style={{ margin: 0, paddingInlineStart: '1.2rem' }}>
                {(data.risks || []).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
          {data.notes && (
            <div style={{ marginTop: '0.5rem', fontSize: 12, color: 'var(--text-tertiary)' }}>
              {data.notes}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>AI Financial Forecaster</h3>
        <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
          Modern, easy forecasting for cash flow, break-even, margins, and growth plans.
        </p>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid" style={{ marginTop: '0.25rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Monthly Profit</div>
          <div className="kpi-value">₹ {monthlyProfit.toLocaleString('en-IN')}</div>
          <div className={`kpi-delta ${monthlyProfit > 0 ? 'delta-positive' : 'delta-negative'}`}>
            {monthlyProfit > 0 ? 'Positive' : 'Non-profitable'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Break-even ETA</div>
          <div className="kpi-value">
            {monthsToBreakeven === Infinity ? 'N/A' : `${monthsToBreakeven} mo`}
          </div>
          <div className="kpi-delta delta-neutral">Est. to recoup investment</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Initial Investment</div>
          <div className="kpi-value">₹ {Number(initialInvestment || 0).toLocaleString('en-IN')}</div>
          <div className="kpi-delta delta-neutral">Upfront</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Run-rate</div>
          <div className="kpi-value">₹ {Number(monthlyRevenue || 0).toLocaleString('en-IN')}</div>
          <div className="kpi-delta delta-neutral">Monthly Revenue</div>
        </div>
      </div>

      {/* Inputs + Presets */}
      <div className="settings-card">
        <h4 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Scenario</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button className="edit-btn" onClick={() => setPreset('retail')}>Retail/E‑com</button>
          <button className="edit-btn" onClick={() => setPreset('services')}>Services</button>
          <button className="edit-btn" onClick={() => setPreset('saas')}>SaaS</button>
        </div>

        <form onSubmit={handleForecast} className="financial-form" style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="form-grid" style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
              <label>Business Type</label>
              <input
                className="subdomain-field"
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g., Retail/E-commerce, Services, SaaS"
              />
            </div>
            <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
              <label>Initial Investment (₹)</label>
              <input
                className="subdomain-field"
                type="number"
                min={0}
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(e.target.value)}
                placeholder="e.g., 150000"
              />
            </div>
            <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
              <label>Expected Monthly Revenue (₹)</label>
              <input
                className="subdomain-field"
                type="number"
                min={0}
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
                placeholder="e.g., 200000"
              />
            </div>
            <div className="form-row" style={{ display: 'grid', gap: '0.25rem' }}>
              <label>Monthly Expenses (₹)</label>
              <input
                className="subdomain-field"
                type="number"
                min={0}
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                placeholder="e.g., 120000"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
            <button type="submit" className="generate-btn" disabled={loading} style={{ maxWidth: 260 }}>
              {loading ? 'Generating…' : 'Generate Projections'}
            </button>
            {result && (
              <>
                <button type="button" className="edit-btn" onClick={() => copyText(typeof result === 'string' ? result : JSON.stringify(result, null, 2))}>
                  Copy
                </button>
                <button type="button" className="edit-btn" onClick={() => downloadText(typeof result === 'string' ? result : JSON.stringify(result, null, 2))}>
                  Download .txt
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div
          className="settings-card"
          style={{
            borderColor: 'var(--error-600)',
            background: 'var(--error-50)',
            color: 'var(--error-600)'
          }}
        >
          {error}
        </div>
      )}

      {/* Charts */}
      {parsed && (
        <div className="settings-card">
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Projection Charts</h4>
          <MultiLineChart
            data={parsed}
            show={{
              expected: showExpected,
              best: showBest,
              worst: showWorst,
              setShowExpected,
              setShowBest,
              setShowWorst
            }}
          />
        </div>
      )}

      {/* Raw Result */}
      {result && (
        <div className="settings-card">
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Projection Result</h4>
          {renderResult(result)}
        </div>
      )}
    </div>
  );
}
