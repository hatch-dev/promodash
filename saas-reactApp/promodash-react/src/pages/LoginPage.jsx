import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Icon from "../components/Icon";

export default function LoginPage() {
  const { login } = useApp();
  const [role,     setRole]     = useState("admin");
  const [email,    setEmail]    = useState("admin@promodash.local");
  const [password, setPassword] = useState("password");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setEmail(newRole === "admin" ? "admin@promodash.local" : "client@cognesense.com");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-visual">
        <div className="brand-lockup">
          <span className="brand-mark"><Icon name="logo" /></span>
          <span>PromoDash</span>
        </div>
        <div className="hero-copy">
          <h1>Promotion Approval Dashboard</h1>
          <p>Plan campaigns, share creatives, collect feedback, manage revisions, and close approvals from one clear workspace.</p>
        </div>
      </section>
      <section className="login-panel">
        <form className="auth-box" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="muted">Use the seeded demo account that matches your workflow.</p>
          <div className="role-switch" aria-label="Select role">
            <button type="button" className={role === "admin"  ? "active" : ""} onClick={() => handleRoleChange("admin")}>Admin</button>
            <button type="button" className={role === "client" ? "active" : ""} onClick={() => handleRoleChange("client")}>Client</button>
          </div>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p style={{ color: "var(--danger)", marginTop: "8px", fontSize: "14px" }}>{error}</p>}
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: "22px" }}>
            <Icon name="check" /> {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
