import React from "react";

import { getCV, getProfile, updateCV } from "../api";
import { exportCVAsPDF, exportCVAsWord } from "../utils/cvExports";

const emptyCV = {
  professional_summary: "",
  experience: [],
  education: [],
  skills: [],
};

function formatLines(lines = []) {
  return lines.join("\n");
}

function parseLines(value) {
  if (Array.isArray(value)) return value.map((line) => line.trim()).filter(Boolean);
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function CVPage({ applications = [] }) {
  const [cv, setCV] = React.useState(emptyCV);
  const [profile, setProfile] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    let active = true;
    Promise.all([getCV(), getProfile()])
      .then(([loadedCV, loadedProfile]) => {
        if (!active) return;
        setCV({ ...emptyCV, ...loadedCV });
        setProfile(loadedProfile);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function update(field, value) {
    setCV((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  function importApplications() {
    const experiences = applications
      .map((application) => {
        const role = application.job_title?.trim();
        const company = application.company_name?.trim();
        return role && company ? `${role} at ${company}` : role || company;
      })
      .filter(Boolean);
    const skills = [...new Set(applications.flatMap((application) => application.keywords || []))];

    setCV((current) => ({
      ...current,
      experience: formatLines(experiences),
      skills: formatLines(skills),
    }));
    setNotice("Application details imported. Review and edit them before saving or downloading.");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      professional_summary: cv.professional_summary,
      experience: parseLines(cv.experience),
      education: parseLines(cv.education),
      skills: parseLines(cv.skills),
    };
    try {
      const saved = await updateCV(payload);
      setCV({
        ...saved,
        experience: formatLines(saved.experience),
        education: formatLines(saved.education),
        skills: formatLines(saved.skills),
      });
      setNotice("CV saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function downloadWord() {
    setError("");
    try {
      await exportCVAsWord({
        professional_summary: cv.professional_summary,
        experience: parseLines(cv.experience),
        education: parseLines(cv.education),
        skills: parseLines(cv.skills),
      }, profile);
    } catch (exportError) {
      setError(`Unable to create Word document: ${exportError.message}`);
    }
  }

  function downloadPDF() {
    setError("");
    try {
      exportCVAsPDF({
        professional_summary: cv.professional_summary,
        experience: parseLines(cv.experience),
        education: parseLines(cv.education),
        skills: parseLines(cv.skills),
      }, profile);
    } catch (exportError) {
      setError(`Unable to create PDF: ${exportError.message}`);
    }
  }

  if (loading) return <div className="loading">Loading CV...</div>;

  return (
    <section aria-label="CV editor" className="application-results">
      <div className="application-list-toolbar">
        <div>
          <h2>Your CV</h2>
          <p className="muted">Edit your CV, import job details as a starting point, and download it.</p>
        </div>
        <div className="actions">
          <button className="ghost-button" onClick={downloadWord} type="button">Download Word</button>
          <button className="ghost-button" onClick={downloadPDF} type="button">Download PDF</button>
        </div>
      </div>
      <form className="editor cv-form" onSubmit={save}>
        <button
          className="ghost-button"
          disabled={applications.length === 0}
          onClick={importApplications}
          type="button"
        >
          Import from applications
        </button>
        <label>
          Professional summary
          <textarea
            onChange={(event) => update("professional_summary", event.target.value)}
            rows={5}
            value={cv.professional_summary}
          />
        </label>
        <label>
          Experience
          <textarea
            onChange={(event) => update("experience", event.target.value)}
            placeholder="One role or accomplishment per line"
            rows={5}
            value={typeof cv.experience === "string" ? cv.experience : formatLines(cv.experience)}
          />
        </label>
        <label>
          Education
          <textarea
            onChange={(event) => update("education", event.target.value)}
            placeholder="One qualification per line"
            rows={4}
            value={typeof cv.education === "string" ? cv.education : formatLines(cv.education)}
          />
        </label>
        <label>
          Skills
          <textarea
            onChange={(event) => update("skills", event.target.value)}
            placeholder="One skill per line"
            rows={4}
            value={typeof cv.skills === "string" ? cv.skills : formatLines(cv.skills)}
          />
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <div className="form-actions">
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save CV"}
          </button>
        </div>
      </form>
    </section>
  );
}
