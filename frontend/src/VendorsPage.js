import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";

export default function VendorsPage() {
  const [category, setCategory] = useState("all"); // all | marketing | logistics | webdev
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null); // vendor details modal
  const [bookForm, setBookForm] = useState({ name: "", email: "", phone: "", preferredTime: "", notes: "" });
  const [emailForm, setEmailForm] = useState({ toName: "", fromName: "", purpose: "Follow-up on booking", details: "", tone: "Professional" });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailDraft, setEmailDraft] = useState(null);

  const categories = useMemo(() => ([
    { key: "all", label: "All" },
    { key: "marketing", label: "Marketing" },
    { key: "logistics", label: "Logistics" },
    { key: "webdev", label: "Web Dev" },
  ]), []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const q = category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
      const res = await api.get(`/vendors/catalog${q}`);
      setVendors(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      console.error("Load vendors failed", e);
      setErr(e?.response?.data?.error || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function ratingStars(r) {
    const full = Math.floor(r || 0);
    const half = (r || 0) - full >= 0.5;
    const arr = [];
    for (let i = 0; i < full; i++) arr.push("★");
    if (half) arr.push("☆");
    while (arr.length < 5) arr.push("☆");
    return arr.join(" ");
  }

  async function submitBooking() {
    if (!selected) return;
    try {
      const payload = {
        name: bookForm.name.trim(),
        email: bookForm.email.trim(),
        phone: bookForm.phone.trim() || undefined,
        preferredTime: bookForm.preferredTime || undefined,
        notes: bookForm.notes || undefined
      };
      if (!payload.name || !payload.email) {
        alert("Please provide name and email.");
        return;
      }
      const res = await api.post(`/vendors/${selected.id}/book`, payload);
      alert(res.data?.message || "Booking request sent.");
      // Close modal
      setSelected(null);
      setBookForm({ name: "", email: "", phone: "", preferredTime: "", notes: "" });
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to submit booking request.");
    }
  }

  async function generateEmailDraft() {
    if (!selected) { alert("Open a vendor first."); return; }
    setEmailLoading(true);
    setEmailError("");
    setEmailDraft(null);
    try {
      const res = await api.post('/ai/email-draft', {
        toName: emailForm.toName || selected.name,
        fromName: emailForm.fromName || 'Biz Owner',
        vendorName: selected.name,
        purpose: emailForm.purpose || 'Vendor booking follow-up',
        details: emailForm.details || (bookForm.notes ? `Notes: ${bookForm.notes}` : ''),
        tone: emailForm.tone || 'Professional'
      });
      setEmailDraft(res.data?.email || null);
    } catch (e) {
      setEmailError(e?.response?.data?.error || 'Failed to generate email draft.');
    } finally {
      setEmailLoading(false);
    }
  }


  return (
    <div className="settings-container">
      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>Vendor Connect</h3>
        <p style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}>
          Browse verified vendors and request quotes or book calls. Try marketing, logistics, or web development partners.
        </p>
      </div>

      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {categories.map((c) => (
            <button
              key={c.key}
              className={`tab-btn ${category === c.key ? "tab-active" : "tab-inactive"}`}
              onClick={() => setCategory(c.key)}
              style={{ maxWidth: 180 }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="settings-card">
          <div className="loading-state">Loading vendors…</div>
        </div>
      ) : err ? (
        <div
          className="settings-card"
          style={{
            borderColor: "var(--error-600)",
            background: "var(--error-50)",
            color: "var(--error-600)"
          }}
        >
          {err}
        </div>
      ) : (
        <div className="settings-card">
          {vendors.length === 0 ? (
            <div className="loading-state" style={{ margin: 0 }}>
              <div className="empty-icon" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤝</div>
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No vendors found</div>
              <div>Try another category.</div>
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
              {vendors.map((v) => (
                <li key={v.id} className="page-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span>{v.name}</span>
                      <span className="impact-badge">{v.category.toUpperCase()}</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {v.description}
                    </div>
                    <div style={{ marginTop: "0.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
                      <span>⭐ {ratingStars(v.rating)} ({v.rating.toFixed(1)})</span>
                      <span>Min Project: ₹ {Number(v.minProject).toLocaleString("en-IN")}</span>
                      <span>Location: {v.location}</span>
                    </div>
                    <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {(v.tags || []).map((t, i) => (
                        <span key={i} className="impact-badge" style={{ background: "var(--info-50)", color: "var(--info-600)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="page-actions" style={{ gap: "0.4rem" }}>
                    <button className="edit-btn" onClick={() => setSelected(v)}>View Details</button>
                    <button className="edit-btn" onClick={() => setSelected(v)}>Book Call</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Vendor Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected.name}</h3>
              <button className="close-btn" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ color: "var(--text-secondary)" }}>{selected.description}</div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", color: "var(--text-tertiary)" }}>
                <span>Category: {selected.category}</span>
                <span>Rating: {selected.rating?.toFixed(1)} ({ratingStars(selected.rating)})</span>
                <span>Min Project: ₹ {Number(selected.minProject).toLocaleString("en-IN")}</span>
                <span>Location: {selected.location}</span>
              </div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {(selected.tags || []).map((t, i) => (
                  <span key={i} className="impact-badge" style={{ background: "var(--info-50)", color: "var(--info-600)" }}>{t}</span>
                ))}
              </div>

              <div className="settings-card" style={{ padding: "1rem" }}>
                <h4 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Book a call</h4>
                <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <input
                    className="subdomain-field"
                    placeholder="Your name"
                    value={bookForm.name}
                    onChange={(e) => setBookForm({ ...bookForm, name: e.target.value })}
                  />
                  <input
                    className="subdomain-field"
                    placeholder="Email"
                    value={bookForm.email}
                    onChange={(e) => setBookForm({ ...bookForm, email: e.target.value })}
                  />
                  <input
                    className="subdomain-field"
                    placeholder="Phone (optional)"
                    value={bookForm.phone}
                    onChange={(e) => setBookForm({ ...bookForm, phone: e.target.value })}
                  />
                  <input
                    className="subdomain-field"
                    placeholder="Preferred time (optional)"
                    value={bookForm.preferredTime}
                    onChange={(e) => setBookForm({ ...bookForm, preferredTime: e.target.value })}
                  />
                </div>
                <textarea
                  className="prompt-textarea"
                  placeholder="Project notes (optional)"
                  rows={3}
                  value={bookForm.notes}
                  onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="generate-btn" style={{ maxWidth: 220 }} onClick={submitBooking}>
                    Send Request
                  </button>
                  <button className="delete-btn" onClick={() => setSelected(null)}>Close</button>
                </div>
              </div>

              <div className="settings-card" style={{ padding: "1rem" }}>
                <h4 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Email Draft Generator</h4>
                <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <input
                    className="subdomain-field"
                    placeholder="To (name)"
                    value={emailForm.toName}
                    onChange={(e) => setEmailForm({ ...emailForm, toName: e.target.value })}
                  />
                  <input
                    className="subdomain-field"
                    placeholder="From (name)"
                    value={emailForm.fromName}
                    onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })}
                  />
                  <input
                    className="subdomain-field"
                    placeholder="Purpose"
                    value={emailForm.purpose}
                    onChange={(e) => setEmailForm({ ...emailForm, purpose: e.target.value })}
                  />
                  <select
                    className="theme-select"
                    value={emailForm.tone}
                    onChange={(e) => setEmailForm({ ...emailForm, tone: e.target.value })}
                  >
                    <option>Professional</option>
                    <option>Friendly</option>
                    <option>Formal</option>
                    <option>Concise</option>
                  </select>
                </div>
                <textarea
                  className="prompt-textarea"
                  placeholder="Additional details (optional)"
                  rows={3}
                  value={emailForm.details}
                  onChange={(e) => setEmailForm({ ...emailForm, details: e.target.value })}
                />
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button className="generate-btn" onClick={generateEmailDraft} disabled={emailLoading} style={{ maxWidth: 220 }}>
                    {emailLoading ? "Generating…" : "Generate Email Draft"}
                  </button>
                  {emailDraft && (
                    <>
                      <button className="edit-btn" onClick={() => {
                        try {
                          navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`);
                          alert("Draft copied.");
                        } catch {}
                      }}>Copy</button>
                    </>
                  )}
                </div>
                {emailError && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 8,
                      background: 'var(--error-50)',
                      color: 'var(--error-600)'
                    }}
                  >
                    {emailError}
                  </div>
                )}
                {emailDraft && (
                  <div className="settings-card" style={{ marginTop: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{emailDraft.subject}</div>
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{emailDraft.body}</div>
                  </div>
                )}
              </div>

              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Contact: {selected?.contact?.email} • {selected?.contact?.phone}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
