// frontend/src/components/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute:
 * - Checks if the user is logged in by calling GET /api/auth/me
 * - If logged in => render children
 * - If not => redirect to /auth
 *
 * NOTE: credentials:"include" is REQUIRED for cookie auth.
 */
export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading"); // "loading" | "authed" | "guest"

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!cancelled) {
          setStatus(res.ok ? "authed" : "guest");
        }
      } catch {
        if (!cancelled) setStatus("guest");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  // While checking, show a minimal loading state
  if (status === "loading") {
    return <div className="text-slate-600">Checking session...</div>;
  }

  // Not logged in => go to /auth
  if (status === "guest") {
    return <Navigate to="/auth" replace />;
  }

  // Logged in => show the protected page
  return children;
}
