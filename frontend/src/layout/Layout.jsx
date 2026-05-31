// src/layout/Layout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

/**
 * Small helper component for top navigation buttons.
 * (No hooks here, so it can be outside Layout safely.)
 */
function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-3 py-1 text-sm ${
          isActive
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  // -----------------------------
  // Notifications state
  // -----------------------------
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // -----------------------------
  // User state (NEW)
  // -----------------------------
  const [user, setUser] = useState(null);

  /**
   * Loads in-app notifications from the backend.
   * Backend endpoint: GET /api/notifications
   */
  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
    } catch {
      // ignore for now
    }
  }

  /**
   * Loads current logged-in user info.
   * Backend endpoint: GET /api/auth/me
   * NOTE: credentials:"include" is required for cookie auth.
   */
  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  /**
   * Marks a notification as "seen" (acknowledged).
   * Backend endpoint: POST /api/notifications/:id/ack
   */
  async function ackNotification(taskId) {
    try {
      const res = await fetch(`/api/notifications/${taskId}/ack`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;

      // remove from UI immediately
      setNotifications((prev) => prev.filter((n) => n._id !== taskId));

      // tell Tasks page to reload
      window.dispatchEvent(new Event("tasks-changed"));
    } catch {
      // ignore for now
    }
  }

  /**
   * Logout:
   * Backend endpoint: POST /api/auth/logout
   */
  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      // Redirect to auth page (simple and reliable)
      window.location.href = "/auth";
    }
  }

  // On startup: load notifications + user, and poll notifications.
  useEffect(() => {
    loadNotifications();
    loadUser();

    const id = setInterval(loadNotifications, 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header bar */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          {/* Brand */}
          <div>
            <div className="text-2xl font-bold tracking-tight">ToDo</div>
            <div className="text-sm text-slate-500">Your tasks &amp; notes</div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <NavItem to="/">Tasks</NavItem>
            <NavItem to="/notes">Notes</NavItem>
            {user?.role === "admin" && <NavItem to="/users">Users</NavItem>}

          </div>

          {/* Right-side buttons */}
          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <button
              onClick={() => {
                if (!showNotifications) loadNotifications();
                setShowNotifications((s) => !s);
              }}
              className="relative rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
              title="Notifications"
            >
              🔔
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Logged in user + logout */}
            {user ? (
              <>
                <span className="hidden sm:block text-sm text-slate-600">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
                  title="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
                title="Not logged in"
                onClick={() => (window.location.href = "/auth")}
              >
                👤
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications panel */}
      {showNotifications && (
        <div className="border-b bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notifications</h2>

              <button
                onClick={() => setShowNotifications(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="text-slate-600">No reminders right now.</div>
            ) : (
              <div className="grid gap-2">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className="flex items-start justify-between gap-4 rounded-xl border p-3"
                  >
                    <div>
                      <div className="font-semibold">{n.title}</div>

                      {n.description && (
                        <div className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                          {n.description}
                        </div>
                      )}

                      <div className="mt-1 text-xs text-slate-500">
                        remindAt:{" "}
                        {n.remindAt
                          ? new Date(n.remindAt).toLocaleString("en-GB", {
                              hour12: false,
                            })
                          : "—"}
                      </div>
                    </div>

                    <button
                      onClick={() => ackNotification(n._id)}
                      className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Mark seen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Routed pages */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
