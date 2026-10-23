import React from "react";

import { loginWithGoogle, registerUser } from "../api";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function CreateAccountPage({
  onAuthenticated,
  googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID,
}) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const passwordRules = [
    { label: "At least 7 characters", ok: password.length >= 7 },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One number", ok: /\d/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  async function continueWithGoogle(credential) {
    setError("");
    setLoading(true);
    try {
      const response = await loginWithGoogle(credential);
      localStorage.setItem("authToken", response.token);
      onAuthenticated(response.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function validatePassword(value) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}$/.test(value);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!validatePassword(password)) {
      setError("Password must be at least 7 characters and include uppercase, lowercase, a number, and a special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await registerUser({ username, password });
      localStorage.setItem("authToken", response.token);
      onAuthenticated(response.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
        <div>
          <p className="eyebrow">New here</p>
          <h1>Create account</h1>
          <p className="muted">Create your account with a username and password or continue with Google.</p>
        </div>

        <form className="editor auth-form" onSubmit={submit}>
          <label>
            Username
            <input autoComplete="username" onChange={(event) => setUsername(event.target.value)} required value={username} />
          </label>
          <label>
            Password
            <input autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          <ul className="rule-list">
            {passwordRules.map((rule) => (
              <li className={rule.ok ? "rule-ok" : "rule-warn"} key={rule.label}>{rule.label}</li>
            ))}
          </ul>
          <label>
            Confirm password
            <input autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary-button" disabled={loading} type="submit">{loading ? "Creating account..." : "Create account"}</button>
          <a className="text-link" href="/login">Back to login</a>
        </form>

        <div className="auth-divider"><span>or continue with Google</span></div>
        <GoogleSignInButton
          clientId={googleClientId}
          onCredential={continueWithGoogle}
        />
    </section>
  );
}
