import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const normaliseUrl = (value = "") => value.replace(/([^:]\/)\+/g, "$1");

const resolveBaseUrl = () => {
  const configuredBase =
    process.env.REACT_APP_AUTH_BASE_URL || process.env.REACT_APP_DJANGO_BASE_URL || "";
  const fallback = configuredBase || "http://localhost:9000";
  return trimTrailingSlash(fallback);
};

const buildValidateEndpoint = (baseUrl) => `${baseUrl}/api/auth/session/validate/`;

const buildLoginUrl = (baseUrl) => {
  const fromEnv = process.env.REACT_APP_DJANGO_LOGIN_URL;
  if (fromEnv) {
    return normaliseUrl(fromEnv);
  }
  return `${baseUrl}/login/`;
};

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const baseUrl = useMemo(() => resolveBaseUrl(), []);
  const sessionValidationUrl = useMemo(
    () => normaliseUrl(buildValidateEndpoint(baseUrl)),
    [baseUrl]
  );
  const portalLoginUrl = useMemo(() => normaliseUrl(buildLoginUrl(baseUrl)), [baseUrl]);

  const portalEnabled = process.env.REACT_APP_ENABLE_DJANGO_PORTAL !== "false";
  const allowLocalLoginFallback = process.env.REACT_APP_ENABLE_LOCAL_LOGIN === "true";
  const showLocalLogin = !portalEnabled && allowLocalLoginFallback;

  const sessionToken = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("sessionToken");
  }, [location.search]);

  const redirectToPortal = useCallback(() => {
    if (portalLoginUrl) {
      window.location.href = portalLoginUrl;
    }
  }, [portalLoginUrl]);

  useEffect(() => {
    if (showLocalLogin) {
      if (location.state?.sessionExpired) {
        setInfoMessage("Your session has expired. Please log in again.");
        navigate(location.pathname, { replace: true, state: {} });
      }
      return;
    }

    if (!portalEnabled) {
      return;
    }

    if (sessionToken) {
      setInfoMessage("Validating your session…");
      return;
    }

    if (location.state?.sessionExpired) {
      setInfoMessage("Your session has expired. Redirecting to the login portal…");
      const timeoutId = window.setTimeout(() => redirectToPortal(), 1500);
      return () => window.clearTimeout(timeoutId);
    }

    redirectToPortal();
  }, [
    sessionToken,
    location.state,
    location.pathname,
    navigate,
    portalEnabled,
    redirectToPortal,
    showLocalLogin,
  ]);

  const completeLoginFlow = useCallback(
    (user) => {
      if (user.role === "admin") {
        localStorage.removeItem("planCycle");
        navigate("/plan-cycles", { replace: true });
        return;
      }

      let storedPlanCycleId = null;
      try {
        const storedPlanCycle = localStorage.getItem("planCycle");
        if (storedPlanCycle) {
          const parsed = JSON.parse(storedPlanCycle);
          storedPlanCycleId = parsed?.id || null;
        }
      } catch (storageError) {
        console.warn("Failed to parse stored plan cycle", storageError);
      }

      if (storedPlanCycleId) {
        navigate(`/plan-cycles/${storedPlanCycleId}/projects`, { replace: true });
      } else {
        navigate("/plan-cycles", { replace: true });
      }
    },
    [navigate]
  );

  const validatePortalToken = useCallback(
    async (token) => {
      setError("");
      setLoading(true);
      try {
        const response = await axios.get(sessionValidationUrl, {
          params: { token },
        });
        const { access_token, user } = response.data;
        localStorage.setItem("token", access_token);
        localStorage.setItem("user", JSON.stringify(user));
        completeLoginFlow(user);
      } catch (err) {
        const detail = err.response?.data?.detail;
        setError(detail || "Unable to validate your session. Please try again.");
        window.setTimeout(() => redirectToPortal(), 2500);
      } finally {
        setLoading(false);
        setInfoMessage("");
      }
    },
    [completeLoginFlow, redirectToPortal, sessionValidationUrl]
  );

  useEffect(() => {
    if (portalEnabled && sessionToken) {
      validatePortalToken(sessionToken);
    }
  }, [portalEnabled, sessionToken, validatePortalToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setInfoMessage("");

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      completeLoginFlow(user);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showLocalLogin) {
    return (
      <div
        className="page-container"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
      >
        <div className="card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", color: "#1a202c" }}>
            Project Plan
          </h1>
          <p style={{ color: "#718096", fontSize: "0.95rem", marginBottom: "1.5rem" }}>TSIP QA PV</p>

          {infoMessage && (
            <div className="info-message" data-testid="session-expired-message" style={{ marginBottom: "1rem" }}>
              {infoMessage}
            </div>
          )}

          {error && (
            <div className="error-message" data-testid="login-error" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <p style={{ color: "#4a5568", fontSize: "0.95rem", marginBottom: "1rem" }}>
            Redirecting you to the secure authentication portal…
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={redirectToPortal}
            disabled={loading}
            style={{ justifyContent: "center" }}
          >
            {loading ? "Validating…" : "Open Login Portal"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-container"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
    >
      <div className="card" style={{ maxWidth: "480px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", color: "#1a202c" }}>
            Project Plan
          </h1>
          <p style={{ color: "#718096", fontSize: "0.95rem" }}>TSIP QA PV</p>
        </div>

        {infoMessage && (
          <div className="info-message" data-testid="session-expired-message">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="error-message" data-testid="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="email-input"
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="password-input"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
            disabled={loading}
            data-testid="login-button"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", padding: "1.5rem", background: "#f7fafc", borderRadius: "12px" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "1rem", color: "#2d3748" }}>
            Try Demo Credentials:
          </h3>
          <div style={{ fontSize: "0.85rem", color: "#4a5568", lineHeight: "1.8" }}>
            <div>
              <strong>Editor:</strong> editor@plankit.com / editor123
            </div>
            <div>
              <strong>Viewer:</strong> viewer@plankit.com / viewer123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;