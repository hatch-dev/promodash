import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Icon from "./Icon";

export function Topbar() {
  const { state, setState } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    setState({ session: null });
    navigate("/login");
  };

  return (
    <header className="topbar">
      <button className="nav-btn" style={{ width: "auto" }} onClick={() => navigate("/")}>
        <span className="brand-lockup">
          <span className="brand-mark"><Icon name="logo" /></span>
          <span>PromoDash</span>
        </span>
      </button>
      <div className="user-meta">
        <div className="avatar">{state.session?.role === "admin" ? "A" : "C"}</div>
        <div>
          <strong>{state.session?.name}</strong>
          <div className="muted">{state.session?.email}</div>
        </div>
        <button className="icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}

export function Sidebar() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  const nav = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/projects", label: "Projects", icon: "projects" },
    { path: "/calendar", label: "Calendar", icon: "calendar" },
    ...(state.session?.role === "admin"
      ? [
          { path: "/clients", label: "Clients", icon: "projects" },
          { path: "/types", label: "Promotion Types", icon: "edit" },
        ]
      : []),
  ];

  return (
    <aside className="sidebar">
      {nav.map(({ path, label, icon }) => (
        <button
          key={path}
          className={`nav-btn ${isActive(path) ? "active" : ""}`}
          onClick={() => navigate(path)}
        >
          <Icon name={icon} /> <span>{label}</span>
        </button>
      ))}
    </aside>
  );
}

export function Layout({ children }) {
  return (
    <div className="shell">
      <Topbar />
      <div className="workspace">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
