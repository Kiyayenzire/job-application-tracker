import React from "react";

import { getProfile, updateProfile } from "../api";

const emptyProfile = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  location: "",
  profession_template: "",
};

export function ProfilePage({ username = "" }) {
  const [profile, setProfile] = React.useState(emptyProfile);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const data = await getProfile();
        if (active) setProfile({ ...emptyProfile, ...data });
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        location: profile.location,
        profession_template: profile.profession_template,
      });
      setProfile({ ...emptyProfile, ...saved });
      setNotice("Profile saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <section aria-label="User profile" className="application-results">
      <div className="application-list-toolbar">
        <div>
          <h2>Your profile</h2>
          <p className="muted">Manage your account details and professional background.</p>
        </div>
      </div>
      <form className="editor profile-form" onSubmit={save}>
        <label>
          Username
          <input readOnly value={profile.username || username} />
        </label>
        <label>
          First name
          <input
            autoComplete="given-name"
            onChange={(event) => update("first_name", event.target.value)}
            value={profile.first_name}
          />
        </label>
        <label>
          Last name
          <input
            autoComplete="family-name"
            onChange={(event) => update("last_name", event.target.value)}
            value={profile.last_name}
          />
        </label>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => update("email", event.target.value)}
            type="email"
            value={profile.email}
          />
        </label>
        <label>
          Location
          <input
            autoComplete="address-level2"
            onChange={(event) => update("location", event.target.value)}
            value={profile.location}
          />
        </label>
        <label>
          Profession
          <input
            onChange={(event) => update("profession_template", event.target.value)}
            placeholder="e.g. Lawyer, Software engineer, Marketer"
            value={profile.profession_template}
          />
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <div className="form-actions">
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
