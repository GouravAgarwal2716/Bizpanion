import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";

export default function MemoryPage() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(`/memory/timeline?days=${Math.max(7, Math.min(180, Number(days) || 30))}`);
      setTimeline(res.data || null);
    } catch (e) {
      console.error("Load memory timeline failed", e);
      setErr(e?.response?.data?.error || "Failed to load memory timeline");
    } finally {
      setLoading(false);
    }
  }

  function copyText(s) {
    try {
      navigator.clipboard.writeText(s);
    } catch {}
  }

  // Chart utils (SVG) ---------------------------------------------------------
  const chartData = useMemo(() => {
    const src = timeline?.kpis || [];
    const rev = src.map(d => ({ x: d.day, y: Number(d.revenue || 0) }));
    const prof = src.map(d => ({ x: d.day, y: Number(d.profit || 0) }));
    const maxY = Math.max(1, ...rev.map(p => p.y), ...prof.map(p => p.y));
    return { rev, prof, maxY };
  }, [timeline]);

  function LineChart({ series, maxY, color = "var(--primary-color)", height = 180, strokeWidth = 2 }) {
    const width = 720;
    const padding = 24;
    const pts = series.length;
    if (!pts) return <div style={{ color: "var(--text-secondary)" }}>No data</div>;

    const stepX = (width - padding * 2) / Math.max(1, pts - 1);
    const toX = (i) => padding + i * stepX;
    const toY = (v) => {
      const ratio = v / (maxY || 1);
      return height - padding - ratio * (height - padding * 2);
    };

    const path = series
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.y)}`)
      .join(" ");

    const gridY = [0, 0.25, 0.5, 0.75, 1].map(r => ({
      y: height - padding - r * (height - padding * 2)
    }));

    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {/* Grid */}
        {gridY.map((g, idx) => (
          <line key={idx} x1={padding} x2={width - padding} y1={g.y} y2={g.y} stroke="var(--border-primary)" strokeDasharray="4 4" strokeWidth="1" />
        ))}
        {/* Path */}
        <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} />
        {/* Points */}
        {series.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.y)} r="2.5" fill={color} />
        ))}
      </svg>
    );
  }

  function DeltaBars({ series, type = "revDelta" }) {
    const width = 720;
    const height = 60;
    const padding = 24;
    const pts = series.length;
    const stepX = (width - padding * 2) / Math.max(1, pts - 1);
    const toX = (i) => padding + i * stepX;

    const maxAbs = Math.max(1, ...series.map(s => Math.abs(Number(s[type] || 0))));
    const scale = (v) => (Math.abs(v) / maxAbs) * 22 + 1;

    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {series.map((d, i) => {
          const val = Number(d[type] || 0);
          const up = val >= 0;
          const h = scale(val);
          const y = up ? (height / 2 - h) : (height / 2);
          const color = up ? "var(--success-600)" : "var(--danger-600)";
          return <rect key={i} x={toX(i) - 2} y={y} width="4" height={h} fill={color} rx="1" ry="1" />;
        })}
        <line x1={padding} x2={width - padding} y1={height / 2} y2={height / 2} stroke="var(--border-primary)" strokeWidth="1" />
      </svg>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>AI Memory Timeline</h3>
        <p style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}>
          Visualize how Bizpanion learns over time: KPIs, insights, summaries, and agent contexts in one place.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <label>Days</label>
          <input
            className="subdomain-field"
            type="number"
            min={7}
            max={180}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            style={{ maxWidth: 120 }}
          />
          <button className="edit-btn" onClick={load} disabled={loading} style={{ maxWidth: 160 }}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {err && (
        <div
          className="settings-card"
          style={{ borderColor: "var(--error-600)", background: "var(--error-50)", color: "var(--error-600)" }}
        >
          {err}
        </div>
      )}

      {!timeline ? (
        <div className="settings-card">
          <div className="loading-state">No timeline data yet.</div>
        </div>
      ) : (
        <>
          <div className="settings-card" style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <div style={{ fontWeight: 700 }}>Revenue Trend</div>
              <LineChart series={chartData.rev} maxY={chartData.maxY} color="var(--primary-color)" />
              <DeltaBars series={timeline.kpis} type="revDelta" />
            </div>
            <div style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
              <div style={{ fontWeight: 700 }}>Profit Trend</div>
              <LineChart series={chartData.prof} maxY={chartData.maxY} color="var(--info-600)" />
              <DeltaBars series={timeline.kpis} type="profitDelta" />
            </div>
          </div>

          <div className="settings-card">
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <span className="impact-badge">Insights: {timeline.counts?.insights ?? 0}</span>
              <span className="impact-badge">Summaries: {timeline.counts?.summaries ?? 0}</span>
              <span className="impact-badge">Agent Contexts: {timeline.counts?.agentContexts ?? 0}</span>
              <span className="impact-badge">Tasks: {timeline.counts?.tasks ?? 0}</span>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
              {(timeline.events || []).map((ev, idx) => (
                <li key={idx} className="page-item" style={{ display: "grid", gap: "0.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      className="impact-badge"
                      style={{
                        background: ev.kind === "memory" ? "var(--info-50)" : "var(--warning-50)",
                        color: ev.kind === "memory" ? "var(--info-700)" : "var(--warning-700)"
                      }}
                    >
                      {ev.kind === "memory" ? ev.type : ev.type}
                    </span>
                    <div className="page-title" style={{ margin: 0 }}>{ev.title}</div>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      {new Date(ev.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {ev.content && (
                    <div style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {String(ev.content).slice(0, 600)}
                    </div>
                  )}
                  <div className="page-actions">
                    {ev.content && (
                      <button className="edit-btn" onClick={() => copyText(String(ev.content))}>
                        Copy
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
