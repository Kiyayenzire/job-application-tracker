import React from "react";

import { loginUser, registerUser } from "../api";

export function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = React.useState("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = mode === "login" ? await loginUser({ username, password }) : await registerUser({ username, password });
      localStorage.setItem("authToken", response.token);
      onAuthenticated(response.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <section className="auth-card">
        <div>
          <p className="eyebrow">Welcome</p>
          <h1>Job Application Tracker</h1>
          <p className="muted">Sign in or create a free account to manage your applications.</p>
        </div>

        <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
          <button className={mode === "login" ? "primary-button" : "ghost-button"} onClick={() => setMode("login")} type="button">Login</button>
          <button className={mode === "register" ? "primary-button" : "ghost-button"} onClick={() => setMode("register")} type="button">Create account</button>
        </div>

        <form className="editor auth-form" onSubmit={submit}>
          <label>
            Username
            <input autoComplete="username" onChange={(event) => setUsername(event.target.value)} required value={username} />
          </label>
          <label>
            Password
            <input autoComplete={mode === "login" ? "current-password" : "new-password"} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary-button" disabled={loading} type="submit">{loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</button>
        </form>
      </section>
    </main>
  );
}
