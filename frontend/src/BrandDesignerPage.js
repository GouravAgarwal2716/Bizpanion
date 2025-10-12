import React, { useMemo, useState } from "react";
import { api } from "./api";

export default function BrandDesignerPage() {
  const [name, setName] = useState("Priya's Apparel");
  const [industry, setIndustry] = useState("Retail / Apparel");
  const [tone, setTone] = useState("modern");
  const [keywords, setKeywords] = useState("sustainable, handcrafted, indian, festive");

  const [loading, setLoading] = useState(false);
  const [kit, setKit] = useState(null);
  const [error, setError] = useState("");

  // Logo generation
  const [logoStyle, setLogoStyle] = useState("modern");
  const [logoSize, setLogoSize] = useState("512x512");
  const [logoConcept, setLogoConcept] = useState("Peacock feather abstract mark");
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoB64, setLogoB64] = useState("");

  const parsedKeywords = useMemo(
    () =>
      (keywords || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    [keywords]
  );

  async function generateKit(e) {
    e?.preventDefault?.();
    setLoading(true);
    setError("");
    setKit(null);
    try {
      const res = await api.post("/brand/generate", {
        name: name.trim(),
        industry: industry.trim(),
        tone: tone.trim(),
        keywords: parsedKeywords,
      });
      setKit(res.data?.brand || null);
    } catch (e1) {
      console.error("Brand kit generate failed", e1);
      setError(e1?.response?.data?.error || "Failed to generate brand kit");
    } finally {
      setLoading(false);
    }
  }

  async function generateLogo() {
    setLogoLoading(true);
    setLogoB64("");
    try {
      const res = await api.post("/brand/logo", {
        name: name.trim(),
        concept: logoConcept.trim(),
        style: logoStyle,
        size: logoSize,
      });
      setLogoB64(res.data?.image_b64 || "");
    } catch (e1) {
      console.error("Logo generation failed", e1);
      alert(e1?.response?.data?.error || "Failed to generate logo");
    } finally {
      setLogoLoading(false);
    }
  }

  function copyText(s) {
    try {
      navigator.clipboard.writeText(s);
    } catch {}
  }

  function downloadJSON(obj, fname = "brand_kit.json") {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", fname);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {}
  }

  function Swatch({ label, hex }) {
    return (
      <div className="settings-card" style={{ padding: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: hex || "#eee",
              border: "1px solid var(--border-primary)",
              boxShadow: "var(--shadow-sm)",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{label}</div>
            <div style={{ color: "var(--text-secondary)" }}>{hex}</div>
          </div>
          <button className="edit-btn" onClick={() => copyText(hex || "")}>
            Copy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>AI Brand Designer</h3>
        <p style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}>
          Generate color palettes and font suggestions tailored to your brand. Create a logo concept preview.
        </p>
      </div>

      <div className="settings-card" style={{ marginBottom: "1rem" }}>
        <form onSubmit={generateKit} style={{ display: "grid", gap: "0.75rem" }}>
          <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
              <label>Brand Name</label>
              <input className="subdomain-field" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
              <label>Industry</label>
              <input className="subdomain-field" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
              <label>Tone</label>
              <select className="theme-select" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="modern">Modern</option>
                <option value="friendly">Friendly</option>
                <option value="luxury">Luxury</option>
                <option value="minimal">Minimal</option>
                <option value="playful">Playful</option>
                <option value="professional">Professional</option>
              </select>
            </div>
          </div>
          <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
            <label>Keywords (comma separated)</label>
            <input className="subdomain-field" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. sustainable, handcrafted, festive" />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button className="generate-btn" type="submit" disabled={loading} style={{ maxWidth: 220 }}>
              {loading ? "Generating…" : "Generate Brand Kit"}
            </button>
            {kit && (
              <button className="edit-btn" type="button" onClick={() => downloadJSON(kit, "brand_kit.json")}>
                Download JSON
              </button>
            )}
          </div>

          {error && (
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
              {error}
            </div>
          )}
        </form>
      </div>

      {kit && (
        <div className="settings-card" style={{ display: "grid", gap: "0.75rem" }}>
          <h4 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Palette</h4>
          <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <Swatch label="Primary" hex={kit?.palette?.primary?.hex} />
            <Swatch label="Secondary" hex={kit?.palette?.secondary?.hex} />
            <Swatch label="Accent" hex={kit?.palette?.accent?.hex} />
            <Swatch label="Neutral" hex={kit?.palette?.neutral?.hex} />
            <Swatch label="Text" hex={kit?.palette?.text?.hex} />
          </div>

          <h4 style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>Fonts</h4>
          <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div className="settings-card" style={{ padding: "0.75rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Heading</div>
              <div style={{ color: "var(--text-secondary)" }}>
                {kit?.fonts?.heading?.name} ({kit?.fonts?.heading?.fallback})
              </div>
              <div style={{ marginTop: "0.5rem", fontWeight: 700 }}>The quick brown fox jumps over the lazy dog</div>
            </div>
            <div className="settings-card" style={{ padding: "0.75rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Body</div>
              <div style={{ color: "var(--text-secondary)" }}>
                {kit?.fonts?.body?.name} ({kit?.fonts?.body?.fallback})
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                The quick brown fox jumps over the lazy dog. 0123456789 !@#$%^&*()
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="settings-card" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Logo Concept</h3>
        <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
            <label>Style</label>
            <select className="theme-select" value={logoStyle} onChange={(e) => setLogoStyle(e.target.value)}>
              <option value="modern">Modern</option>
              <option value="minimal">Minimal</option>
              <option value="luxury">Luxury</option>
              <option value="playful">Playful</option>
              <option value="professional">Professional</option>
            </select>
          </div>
          <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
            <label>Size</label>
            <select className="theme-select" value={logoSize} onChange={(e) => setLogoSize(e.target.value)}>
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
            </select>
          </div>
          <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
            <label>Concept</label>
            <input className="subdomain-field" value={logoConcept} onChange={(e) => setLogoConcept(e.target.value)} placeholder="e.g., abstract peacock feather mark" />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
          <button className="generate-btn" onClick={generateLogo} disabled={logoLoading || !name.trim()} style={{ maxWidth: 220 }}>
            {logoLoading ? "Generating…" : "Generate Logo"}
          </button>
          {logoB64 && (
            <button
              className="edit-btn"
              onClick={() => {
                try {
                  const a = document.createElement("a");
                  a.href = `data:image/png;base64,${logoB64}`;
                  a.setAttribute("download", "logo.png");
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                } catch {}
              }}
            >
              Download PNG
            </button>
          )}
        </div>

        {logoB64 ? (
          <div className="settings-card" style={{ marginTop: "0.75rem", padding: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Preview</div>
            <img
              src={`data:image/png;base64,${logoB64}`}
              alt="Generated logo"
              style={{
                width: 256,
                height: 256,
                objectFit: "contain",
                background: "#fff",
                border: "1px solid var(--border-primary)",
                borderRadius: 12,
                boxShadow: "var(--shadow-sm)",
              }}
            />
          </div>
        ) : (
          <div style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            No logo yet. Click Generate Logo to preview.
          </div>
        )}
      </div>
    </div>
  );
}
