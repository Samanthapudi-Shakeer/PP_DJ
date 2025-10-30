import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProjectsList from "./pages/ProjectsList";
import ProjectDetail from "./pages/ProjectDetail";
import GlobalSearchBar from "./components/GlobalSearchBar";
import SessionManager from "./components/SessionManager";
import { SearchProvider } from "./context/GlobalSearchContext";
import { PlanCycleProvider } from "./context/PlanCycleContext";
import PlanCyclesList from "./pages/PlanCycles";
import { broadcastSessionLogout, isTokenExpired } from "./utils/session";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const requiresPlanCycle = (url) => {
  if (!url || !url.startsWith(API)) {
    return false;
  }
  if (url.includes("/plan-cycles/")) {
    return false;
  }
  const relative = url.slice(API.length);
  return (
    relative.startsWith("/projects") ||
    (relative.startsWith("/users/") && relative.includes("/project-access"))
  );
};

const injectPlanCycleIntoUrl = (url, planCycleId) => {
  if (!url || !url.startsWith(API) || url.includes("/plan-cycles/") || !planCycleId) {
    return url;
  }
  const [base, query] = url.split("?");
  const relative = base.slice(API.length);
  let rewritten = base;

  if (relative.startsWith("/projects")) {
    rewritten = `${API}/plan-cycles/${planCycleId}${relative}`;
  } else if (relative.startsWith("/users/") && relative.includes("/project-access")) {
    rewritten = `${API}${relative.replace(
      "/project-access",
      `/plan-cycles/${planCycleId}/project-access`
    )}`;
  }

  return query ? `${rewritten}?${query}` : rewritten;
};

// Axios interceptor to add auth token and inject plan cycle routing
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (requiresPlanCycle(config.url)) {
      let planCycleId = null;
      try {
        const stored = localStorage.getItem("planCycle");
        if (stored) {
          planCycleId = JSON.parse(stored)?.id || null;
        }
      } catch (error) {
        console.warn("Failed to parse stored plan cycle", error);
      }

      if (!planCycleId) {
        return Promise.reject(new Error("Plan cycle must be selected"));
      }

      config.url = injectPlanCycleIntoUrl(config.url, planCycleId);

      if (
        config.method?.toLowerCase() === "post" &&
        config.url?.endsWith("/projects") &&
        config.data &&
        typeof config.data === "object" &&
        !Array.isArray(config.data) &&
        config.data.plan_cycle_id == null
      ) {
        config.data = { ...config.data, plan_cycle_id: planCycleId };
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isTokenExpired(token)) {
    broadcastSessionLogout();
    return <Navigate to="/login" replace state={{ sessionExpired: true }} />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/projects" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <PlanCycleProvider>
          <SearchProvider>
            <SessionManager />
            <GlobalSearchBar />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plan-cycles"
                element={
                  <ProtectedRoute>
                    <PlanCyclesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plan-cycles/:planCycleId/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plan-cycles/:planCycleId/projects/:projectId"
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={<Navigate to="/plan-cycles" replace />}
              />
              <Route
                path="/projects/:projectId"
                element={<Navigate to="/plan-cycles" replace />}
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </SearchProvider>
        </PlanCycleProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;