import React, { useState } from "react";
import "./AuthForm.css"; // We'll create this for styling
import { api } from "./api";

export default function AuthForm({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [locale, setLocale] = useState("en-IN");
  const [role, setRole] = useState("entrepreneur");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await api.post("/auth/login", { email, password });
      } else {
        res = await api.post("/auth/register", { name, email, password, businessName, industry, locale, role });
      }
      localStorage.setItem("token", res.data.token);
      onAuth && onAuth(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    }
    setLoading(false);
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{isLogin ? "Login to Bizpanion" : "Sign Up for Bizpanion"}</h2>
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Industry (e.g., Apparel, Services)"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
            />
            <input
              type="text"
              placeholder="Locale (e.g., en-IN)"
              value={locale}
              onChange={e => setLocale(e.target.value)}
            />
            <div className="form-row" style={{ display: "grid", gap: "0.25rem" }}>
              <label className="field-label" style={{ color: "var(--text-secondary)" }}>I am a</label>
              <select
                className="theme-select business-select"
                value={role}
                onChange={e => setRole(e.target.value)}
                required
              >
                <option value="entrepreneur">Entrepreneur</option>
                <option value="consultant">Consultant</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
        </button>
        <div className="auth-toggle">
          <span>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button
            type="button"
            className="link-btn"
            onClick={() => setIsLogin(l => !l)}
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </div>
        {error && <div className="auth-error">{error}</div>}
      </form>
    </div>
  );
}
