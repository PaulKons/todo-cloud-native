// frontend/src/pages/AuthPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * AuthPage:
 * - Register + Login in one page (toggle mode)
 * - Uses cookie-based JWT (httpOnly cookie)
 *
 * IMPORTANT:
 * fetch must include: credentials: "include"
 * otherwise the browser won't store/send cookies.
 */
export default function AuthPage() {
  const navigate = useNavigate();

  // mode = "login" or "register"
  const [mode, setMode] = useState("login");

  // form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        // ✅ this is REQUIRED for cookie auth
        credentials: "include",

        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `${mode} failed (${res.status})`);
      }

      // Success: backend sets cookie automatically.
      // Redirect user into the app.
      navigate("/");
    } catch (err) {
      setError(err.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-sm text-slate-500 mt-1">
          Please {mode === "login" ? "log in" : "create an account"} to continue.
        </p>

        {/* Mode toggle */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              mode === "login"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              mode === "register"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="••••••••"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <div className="mt-1 text-xs text-slate-500">
              Minimum 6 characters.
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
