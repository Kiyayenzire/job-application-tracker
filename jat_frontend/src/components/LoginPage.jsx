import React from "react";

import { loginUser } from "../api";

export function LoginPage({ onAuthenticated }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser({ username, password });
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
          <p className="eyebrow">Welcome back</p>
          <h1>Login</h1>
          <p className="muted">Use your username and password to access your applications.</p>
        </div>

        <form className="editor auth-form" onSubmit={submit}>
          <label>
            Username
            <input autoComplete="username" onChange={(event) => setUsername(event.target.value)} required value={username} />
          </label>
          <label>
            Password
            <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary-button" disabled={loading} type="submit">{loading ? "Signing in..." : "Login"}</button>
          <a className="text-link" href="/create-account">Create an account</a>
        </form>
      </section>
    </main>
  );
}
