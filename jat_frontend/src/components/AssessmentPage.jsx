import React from "react";

import {
  getApplicationAssessment,
  saveApplicationAssessment,
} from "../api";

const ESSENTIAL_PARAMETERS = [
  {
    key: "career_growth",
    label: "Career Growth & Progression",
    description: "Promotion opportunities, clear criteria, and a credible path toward the next level.",
  },
  {
    key: "technical_challenge",
    label: "Technical Challenge & Learning",
    description: "Work complexity, new skills, architectural exposure, and expanding responsibilities.",
  },
  {
    key: "team_management",
    label: "Engineering Team & Management",
    description: "Mentorship, feedback, leadership, code reviews, and technical decision-making.",
  },
  {
    key: "ownership",
    label: "Ownership & Autonomy",
    description: "Opportunity to own features, services, design decisions, deployment, and maintenance.",
  },
  {
    key: "company_growth",
    label: "Company Growth & Opportunity",
    description: "Business growth and whether it creates meaningful opportunities for employees.",
  },
  {
    key: "relocation",
    label: "Employment & Relocation Viability",
    description: "Work authorisation support, relocation help, contract terms, and moving feasibility.",
  },
  {
    key: "role_fit",
    label: "Role Fit & Sustainability",
    description: "Career alignment, workload, on-call expectations, and lasting interest in the work.",
  },
];

const NICE_TO_HAVE_PARAMETERS = [
  { key: "salary_benefits", label: "Salary & Benefits", description: "Compensation, pension, insurance, and additional benefits." },
  { key: "technology_stack", label: "Technology Stack", description: "Alignment with preferred technologies and technical direction." },
  { key: "product_interest", label: "Product & Industry Interest", description: "Interest in the business domain, product, and customer problems." },
  { key: "work_flexibility", label: "Work Flexibility", description: "Remote or hybrid arrangements, office expectations, and flexible hours." },
  { key: "learning_resources", label: "Learning Budget & Resources", description: "Training budget, conferences, courses, and dedicated learning time." },
  { key: "company_reputation", label: "Company Reputation", description: "Industry position, customer base, and external credibility." },
  { key: "employee_retention", label: "Employee Retention & Feedback", description: "Retention patterns and feedback from current or former employees." },
  { key: "international_culture", label: "International Team & Culture", description: "Diversity, communication, inclusion, and international experience." },
  { key: "future_mobility", label: "Future Mobility", description: "Options to move between teams, products, locations, or specialisations." },
  { key: "location_commute", label: "Location & Commute", description: "Housing costs, commute time, and office convenience." },
  { key: "interview_experience", label: "Interview Experience", description: "Interview organisation, communication, professionalism, and respect for your time." },
];

const STATUS_OPTIONS = [
  ["not_started", "Not Started"],
  ["in_progress", "In Progress"],
  ["completed", "Completed"],
];

const GROWTH_OPTIONS = [
  ["unknown", "Unknown"],
  ["strong", "Strong"],
  ["moderate", "Moderate"],
  ["limited", "Limited"],
];

const RELOCATION_OPTIONS = [
  ["unclear", "Unclear"],
  ["confirmed", "Confirmed"],
  ["needs_verification", "Needs Verification"],
  ["not_feasible", "Not Feasible"],
];

const FINAL_ASSESSMENT_OPTIONS = [
  ["further_investigation", "Further Investigation"],
  ["strong_fit", "Strong Fit"],
  ["potential_fit", "Potential Fit"],
  ["poor_fit", "Poor Fit"],
];

function localDateString() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function normalizeScores(scores, parameters) {
  return Object.fromEntries(
    parameters.map(({ key }) => [key, scores?.[key] ?? null]),
  );
}

function scoreAverage(scores, parameters) {
  const assessed = parameters
    .map(({ key }) => scores?.[key])
    .filter((score) => Number.isInteger(score) && score >= 1 && score <= 5);
  if (!assessed.length) return "Not scored";
  return `${(assessed.reduce((total, score) => total + score, 0) / assessed.length).toFixed(2)} / 5`;
}

function ScoreGroup({ legend, parameters, scores, onChange }) {
  return (
    <fieldset className="assessment-score-group">
      <legend>{legend}</legend>
      <div className="assessment-criteria">
        {parameters.map(({ key, label, description }) => (
          <label className="assessment-criterion" key={key}>
            <span className="assessment-criterion-copy">
              <span>{label}</span>
              <span className="hint">{description}</span>
            </span>
            <select
              aria-label={`${label} score`}
              onChange={(event) => onChange(key, event.target.value)}
              value={scores[key] == null ? "" : String(scores[key])}
            >
              <option value="">Not Assessed</option>
              {[1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>{score} / 5</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label>
      {label}
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

export function AssessmentPage({ applications }) {
  const [selectedId, setSelectedId] = React.useState(
    applications[0] ? String(applications[0].id) : "",
  );
  const [assessment, setAssessment] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const selectedApplication = applications.find(
    (application) => String(application.id) === selectedId,
  );

  React.useEffect(() => {
    if (!selectedId && applications.length) {
      setSelectedId(String(applications[0].id));
    }
  }, [applications, selectedId]);

  React.useEffect(() => {
    if (!selectedId) {
      setAssessment(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");
    setNotice("");
    setAssessment(null);
    getApplicationAssessment(selectedId)
      .then((data) => {
        if (!active) return;
        setAssessment({
          ...data,
          essential_scores: normalizeScores(data.essential_scores, ESSENTIAL_PARAMETERS),
          nice_to_have_scores: normalizeScores(data.nice_to_have_scores, NICE_TO_HAVE_PARAMETERS),
          last_assessed_date: data.last_assessed_date || localDateString(),
        });
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
  }, [selectedId]);

  function updateField(field, value) {
    setAssessment((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  function updateScore(group, key, value) {
    setAssessment((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value === "" ? null : Number(value),
      },
    }));
    setNotice("");
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const saved = await saveApplicationAssessment(selectedId, assessment);
      setAssessment({
        ...saved,
        essential_scores: normalizeScores(saved.essential_scores, ESSENTIAL_PARAMETERS),
        nice_to_have_scores: normalizeScores(saved.nice_to_have_scores, NICE_TO_HAVE_PARAMETERS),
      });
      setNotice("Assessment saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Employer assessment" className="application-results">
      <div className="application-list-toolbar">
        <div>
          <h2>Employer assessment</h2>
          <p className="muted">
            Assess career fit and relocation risk for each role. Scores are averages
            of assessed criteria only; unanswered items are excluded.
          </p>
        </div>
      </div>

      {!applications.length ? (
        <div className="empty">
          Add a job application before creating an employer assessment.
        </div>
      ) : (
        <>
          <div className="assessment-application-picker">
            <label>
              Application
              <select
                onChange={(event) => setSelectedId(event.target.value)}
                value={selectedId}
              >
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.company_name} — {application.job_title}
                  </option>
                ))}
              </select>
            </label>
            {selectedApplication && (
              <p className="hint">
                Assessment is specific to this role, even if you have other
                applications with the same company.
              </p>
            )}
          </div>

          {loading && <div className="loading">Loading assessment...</div>}
          {error && <div className="error" role="alert">{error}</div>}

          {assessment && !loading && (
            <form className="editor assessment-form" onSubmit={save}>
              <div className="assessment-summary">
                <div>
                  <span className="hint">Essential average</span>
                  <strong>{scoreAverage(assessment.essential_scores, ESSENTIAL_PARAMETERS)}</strong>
                </div>
                <div>
                  <span className="hint">Nice-to-have average</span>
                  <strong>{scoreAverage(assessment.nice_to_have_scores, NICE_TO_HAVE_PARAMETERS)}</strong>
                </div>
              </div>

              <div className="editor-grid">
                <SelectField
                  label="Assessment Status"
                  onChange={(value) => updateField("status", value)}
                  options={STATUS_OPTIONS}
                  value={assessment.status}
                />
                <SelectField
                  label="Career Growth Outlook"
                  onChange={(value) => updateField("career_growth_outlook", value)}
                  options={GROWTH_OPTIONS}
                  value={assessment.career_growth_outlook}
                />
                <SelectField
                  label="Relocation Feasibility"
                  onChange={(value) => updateField("relocation_feasibility", value)}
                  options={RELOCATION_OPTIONS}
                  value={assessment.relocation_feasibility}
                />
                <SelectField
                  label="Final Employer Assessment"
                  onChange={(value) => updateField("final_assessment", value)}
                  options={FINAL_ASSESSMENT_OPTIONS}
                  value={assessment.final_assessment}
                />
                <label>
                  Last Assessment Date
                  <input
                    onChange={(event) => updateField("last_assessed_date", event.target.value || null)}
                    type="date"
                    value={assessment.last_assessed_date || ""}
                  />
                </label>
              </div>

              <ScoreGroup
                legend="Essential Assessment Parameters"
                onChange={(key, value) => updateScore("essential_scores", key, value)}
                parameters={ESSENTIAL_PARAMETERS}
                scores={assessment.essential_scores}
              />
              <ScoreGroup
                legend="Nice-to-Have Assessment Parameters"
                onChange={(key, value) => updateScore("nice_to_have_scores", key, value)}
                parameters={NICE_TO_HAVE_PARAMETERS}
                scores={assessment.nice_to_have_scores}
              />

              <label>
                Evidence &amp; Notes
                <textarea
                  onChange={(event) => updateField("evidence_notes", event.target.value)}
                  value={assessment.evidence_notes}
                />
              </label>
              <label>
                Outstanding Questions
                <textarea
                  onChange={(event) => updateField("outstanding_questions", event.target.value)}
                  value={assessment.outstanding_questions}
                />
              </label>
              <label>
                Red Flags / Concerns
                <textarea
                  onChange={(event) => updateField("red_flags_concerns", event.target.value)}
                  value={assessment.red_flags_concerns}
                />
              </label>

              {notice && <p className="success-message" role="status">{notice}</p>}
              <div className="actions">
                <button className="primary-button" disabled={saving} type="submit">
                  {saving ? "Saving assessment..." : "Save assessment"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
