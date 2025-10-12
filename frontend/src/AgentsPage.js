import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";

export default function AgentsPage() {
  const [persona, setPersona] = useState(localStorage.getItem("persona") || "Retail/E-commerce");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [insightAgent, setInsightAgent] = useState(null);
  const [marketingAgent, setMarketingAgent] = useState(null);
  const [designAgent, setDesignAgent] = useState(null);
  const [combined, setCombined] = useState("");

  // Growth Advisor
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorErr, setAdvisorErr] = useState("");
  const [advisor, setAdvisor] = useState(null);

  function applyMarketingPrefill() {
    if (!marketingAgent) return;
    try {
      const prefill = {
        businessType: persona || "Retail/E-commerce",
        targetAudience: "Existing customers",
        tone: "Friendly",
        contentType: "Ad Copy",
        tagline: marketingAgent.tagline || "",
        copy: marketingAgent.copy || "",
        cta: marketingAgent.cta || ""
      };
      localStorage.setItem("marketing_prefill", JSON.stringify(prefill));
      alert("Marketing campaign prefilled. Opening Marketing...");
      window.dispatchEvent(new Event("openMarketing")); // optional signal for future
    } catch {}
  }

  async function runPipeline() {
    setRunning(true);
    setError("");
    setInsightAgent(null);
    setMarketingAgent(null);
    setDesignAgent(null);
    setCombined("");
    try {
      const res = await api.post("/agents/run", { persona });
      setInsightAgent(res.data?.insightAgent || null);
      setMarketingAgent(res.data?.marketingAgent || null);
      setDesignAgent(res.data?.designAgent || null);
      setCombined(res.data?.combinedReport || "");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to run agents pipeline.");
    } finally {
      setRunning(false);
    }
  }

  async function runAdvisor() {
    setAdvisorLoading(true);
    setAdvisorErr("");
    setAdvisor(null);
    try {
      const res = await api.post("/agents/growth-advisor", { persona });
      setAdvisor(res.data || null);
    } catch (e) {
      setAdvisorErr(e?.response?.data?.error || "Failed to run growth advisor.");
    } finally {
      setAdvisorLoading(false);
    }
  }

  async function addAdvisorTask(item) {
    try {
      const title = (item?.title || "AI Growth Action").slice(0, 80);
      await api.post("/tasks", {
        title,
        description: `${item?.title || ""}\nWhy: ${item?.why || ""}\nImpact: ${item?.impact || ""}`,
        priority: (String(item?.impact || "medium").toLowerCase() === "high" ? "high" : "medium"),
        source: "growth"
      });
      alert("Task created from Growth Advisor.");
    } catch (e) {
      alert("Failed to create task from action.");
    }
  }

  useEffect(() => {
    if (persona) {
      localStorage.setItem("persona", persona);
    }
  }, [persona]);

  const palette = useMemo(() => {
    return {
      primary: designAgent?.palette?.primary || "#4F46E5",
      secondary: designAgent?.palette?.secondary || "#0EA5E9",
      accent: designAgent?.palette?.accent || "#F59E0B"
    };
  }, [designAgent]);

  return (
    <div className="settings-container">
      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>AI Agents Orchestration</h3>
        <p style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}>
          Three agents collaborate: Insight (analytics), Marketing (campaign), Design (brand palette/logo idea). Great for judges to see an agentic workflow.
        </p>
        {/* Simple flow visualization: Insight → Marketing → Design → Combined */}
        <div style={{ marginTop: '0.5rem', border: '1px dashed var(--border-primary)', borderRadius: 8, padding: '0.5rem', background: 'var(--bg-primary)' }}>
          <svg width="100%" viewBox="0 0 700 120" style={{ display: 'block' }}>
            {/* Nodes */}
            <g transform="translate(40,20)">
              <rect width="150" height="60" rx="10" ry="10" fill="var(--info-50)" stroke="var(--info-600)" />
              <text x="75" y="35" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: 12, fontWeight: 600 }}>Insight Agent</text>
            </g>
            <g transform="translate(260,20)">
              <rect width="150" height="60" rx="10" ry="10" fill="var(--success-50)" stroke="var(--success-600)" />
              <text x="75" y="35" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: 12, fontWeight: 600 }}>Marketing Agent</text>
            </g>
            <g transform="translate(480,20)">
              <rect width="150" height="60" rx="10" ry="10" fill="var(--warning-50)" stroke="var(--warning-600)" />
              <text x="75" y="35" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: 12, fontWeight: 600 }}>Design Agent</text>
            </g>
            {/* Combined */}
            <g transform="translate(260,90)">
              <rect width="150" height="22" rx="8" ry="8" fill="var(--primary-50)" stroke="var(--primary-color)" />
              <text x="75" y="15" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: 11, fontWeight: 600 }}>Combined Report</text>
            </g>
            {/* Arrows */}
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L6,3 z" fill="var(--text-tertiary)" />
              </marker>
              <style>
                {`
                  @keyframes flowPulse { 
                    0% { stroke-dashoffset: 60; } 
                    100% { stroke-dashoffset: 0; } 
                  }
                `}
              </style>
            </defs>
            <line x1="190" y1="50" x2="260" y2="50" stroke="var(--text-tertiary)" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="8 6" style={{ animation: 'flowPulse 1.2s linear infinite' }} />
            <line x1="410" y1="50" x2="480" y2="50" stroke="var(--text-tertiary)" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="8 6" style={{ animation: 'flowPulse 1.2s linear infinite', animationDelay: '0.2s' }} />
            <line x1="335" y1="80" x2="335" y2="90" stroke="var(--text-tertiary)" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="8 6" style={{ animation: 'flowPulse 1.2s linear infinite', animationDelay: '0.4s' }} />
          </svg>
        </div>
      </div>

      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
            <label>Business Persona</label>
            <select className="theme-select" value={persona} onChange={(e) => setPersona(e.target.value)}>
              <option>Retail/E-commerce</option>
              <option>Services</option>
              <option>SaaS</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button className="generate-btn" onClick={runPipeline} disabled={running} style={{ maxWidth: 240 }}>
            {running ? "Running Agents…" : "Run Multi-Agent Pipeline"}
          </button>
          {marketingAgent && (
            <button className="edit-btn" onClick={applyMarketingPrefill} style={{ maxWidth: 260 }}>
              Prefill Marketing Campaign
            </button>
          )}
        </div>
        {error && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem 1rem",
              border: "1px solid var(--border-primary)",
              borderRadius: 8,
              background: "var(--error-50)",
              color: "var(--error-600)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Growth Advisor</h3>
          <button className="generate-btn" onClick={runAdvisor} disabled={advisorLoading} style={{ maxWidth: 240 }}>
            {advisorLoading ? "Analyzing…" : "Suggest Top 3 Actions"}
          </button>
        </div>
        <p style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}>
          The Growth Advisor reads your KPIs, channel mix, and open tasks to propose immediate, high-impact actions.
        </p>
        {advisorErr && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem 1rem",
              border: "1px solid var(--border-primary)",
              borderRadius: 8,
              background: "var(--error-50)",
              color: "var(--error-600)",
            }}
          >
            {advisorErr}
          </div>
        )}
        {advisor?.actions && Array.isArray(advisor.actions) && advisor.actions.length > 0 && (
          <div className="kpi-grid" style={{ marginTop: "0.75rem" }}>
            {advisor.actions.slice(0, 3).map((a, i) => (
              <div key={i} className="kpi-card" style={{ alignItems: "stretch" }}>
                <div className="kpi-label">AI Action #{i + 1}</div>
                <div className="kpi-value" style={{ fontSize: 16, lineHeight: 1.2 }}>{a.title}</div>
                <div className="kpi-delta" style={{ color: 'var(--text-secondary)' }}>
                  Impact: {a.impact || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {a.why}
                </div>
                <div className="page-actions" style={{ marginTop: 8 }}>
                  <button className="edit-btn" onClick={() => addAdvisorTask(a)} style={{ maxWidth: 180 }}>
                    + Add as Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settings-card" style={{ display: "grid", gap: "0.75rem" }}>
        <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {/* Insight Agent */}
          <div className="settings-card" style={{ padding: "1rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Insight Agent</div>
            {insightAgent?.text ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{insightAgent.text}</div>
            ) : (
              <div style={{ color: "var(--text-secondary)" }}>No insights yet. Click "Run Multi-Agent Pipeline".</div>
            )}
          </div>

          {/* Marketing Agent */}
          <div className="settings-card" style={{ padding: "1rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Marketing Agent</div>
            {marketingAgent ? (
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <div><strong>Tagline:</strong> {marketingAgent.tagline}</div>
                <div><strong>Copy:</strong> {marketingAgent.copy}</div>
                <div><strong>CTA:</strong> {marketingAgent.cta}</div>
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)" }}>No campaign yet.</div>
            )}
          </div>

          {/* Design Agent */}
          <div className="settings-card" style={{ padding: "1rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Design Agent</div>
            {designAgent ? (
              <>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", alignItems: "center" }}>
                  {["primary", "secondary", "accent"].map((k) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: palette[k], border: "1px solid var(--border-primary)"
                      }} />
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{k}: {palette[k]}</div>
                    </div>
                  ))}
                </div>
                <div><strong>Logo Idea:</strong> {designAgent.logoIdea}</div>
              </>
            ) : (
              <div style={{ color: "var(--text-secondary)" }}>No design suggestion yet.</div>
            )}
          </div>
        </div>

        {/* Combined */}
        <div className="settings-card" style={{ padding: "1rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Combined Report</div>
          {combined ? (
            <pre style={{
              whiteSpace: "pre-wrap",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-primary)",
              borderRadius: 8,
              padding: "0.75rem"
            }}>
              {combined}
            </pre>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>Run the pipeline to see a combined report.</div>
          )}
        </div>
      </div>
    </div>
  );
}
