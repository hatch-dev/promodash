import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { Layout } from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import PromotionDetailPage from "./pages/PromotionDetailPage";
import CalendarPage from "./pages/CalendarPage";
import ClientsPage from "./pages/ClientsPage";
import TypesPage from "./pages/TypesPage";

function RequireAuth({ children }) {
  const { state } = useApp();
  const location = useLocation();
  if (!state.session) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { state } = useApp();
  if (state.session?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!state.session && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [state.session]);

  return (
    <Routes>
      <Route path="/login" element={state.session ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <DashboardPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/projects"
        element={
          <RequireAuth>
            <Layout>
              <ProjectsPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/projects/:projectId"
        element={
          <RequireAuth>
            <Layout>
              <ProjectDetailPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/promotions/:promotionId"
        element={
          <RequireAuth>
            <Layout>
              <PromotionDetailPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/calendar"
        element={
          <RequireAuth>
            <Layout>
              <CalendarPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/clients"
        element={
          <RequireAuth>
            <RequireAdmin>
              <Layout>
                <ClientsPage />
              </Layout>
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/types"
        element={
          <RequireAuth>
            <RequireAdmin>
              <Layout>
                <TypesPage />
              </Layout>
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
