import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Icon from "../components/Icon";

export default function LoginPage() {
  const { state, setState } = useApp();
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("admin@promodash.local");
  const navigate = useNavigate();

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setEmail(newRole === "admin" ? "admin@promodash.local" : "client@cognesense.com");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const firstClientProject = state.projects.find((p) => p.clientUsers.includes(email));
    const client = state.clients.find((c) => c.email.toLowerCase() === email.toLowerCase());
    setState({
      session: {
        role,
        email,
        name: role === "admin" ? "Admin Team" : client?.name || "Client",
      },
      selectedProjectId:
        role === "admin"
          ? state.selectedProjectId
          : firstClientProject?.id || state.selectedProjectId,
    });
    navigate("/");
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
            <button type="button" className={role === "admin" ? "active" : ""} onClick={() => handleRoleChange("admin")}>Admin</button>
            <button type="button" className={role === "client" ? "active" : ""} onClick={() => handleRoleChange("client")}>Client</button>
          </div>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" defaultValue="password" autoComplete="current-password" required />
          </label>
          <button className="btn" type="submit" style={{ width: "100%", marginTop: "22px" }}>
            <Icon name="check" /> Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
