// frontend/src/components/AdminRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

/**
 * AdminRoute:
 * - Calls /api/auth/me
 * - If not logged in => redirect to /auth
 * - If logged in but not admin => redirect to /
 * - If admin => render children
 */
export default function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading"); // loading | admin | user | guest

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setStatus("guest");
          return;
        }

        const data = await res.json();
        const role = data?.user?.role;

        if (!cancelled) setStatus(role === "admin" ? "admin" : "user");
      } catch {
        if (!cancelled) setStatus("guest");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") return <div className="text-slate-600">Checking role…</div>;
  if (status === "guest") return <Navigate to="/auth" replace />;
  if (status === "user") return <Navigate to="/" replace />;

  return children; // admin
}
