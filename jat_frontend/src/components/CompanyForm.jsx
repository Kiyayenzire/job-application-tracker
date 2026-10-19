import React from "react";
import { Save, X } from "lucide-react";

import { CountryPicker } from "./CountryPicker";

const outsideEUHiringOptions = [
  ["confirmed", "Confirmed"],
  ["likely", "Likely"],
  ["unverified", "Unverified"],
  ["local_only", "Local-only"],
  ["rejected", "Rejected"],
];
const relocationSupportOptions = [
  ["yes", "Yes"],
  ["possible", "Possible"],
  ["no", "No"],
  ["unknown", "Unknown"],
];
const locationRequirementOptions = [
  ["outside_eu_accepted", "Outside-EU accepted"],
  ["eu_only", "EU only"],
  ["germany_only", "Germany only"],
  ["local_only", "Local only"],
  ["unknown", "Unknown"],
];
const contactStatusOptions = [
  ["not_contacted", "Not contacted"],
  ["preparing", "Preparing"],
  ["sent", "Sent"],
  ["reply_received", "Reply received"],
  ["considering", "Considering"],
  ["interested", "Interested in future"],
  ["not_interested", "Not interested"],
  ["local_only", "Explicitly EU/local only"],
  ["follow_up", "Follow-up needed"],
];
const hiringPatternOptions = [
  ["year_round", "Year-round"],
  ["Q4-Q1", "Q4-Q1"],
  ["Q1-Q2", "Q1-Q2"],
  ["Q2-Q3", "Q2-Q3"],
  ["Q3-Q4", "Q3-Q4"],
  ["irregular", "Irregular"],
  ["unknown", "Unknown"],
];
const workArrangementOptions = [
  ["remote", "Remote"],
  ["hybrid", "Hybrid"],
  ["office", "Office"],
  ["flexible", "Flexible / varies"],
  ["unknown", "Unknown"],
];
const initialCompany = {
  name: "",
  country: "de",
  outside_eu_hiring: "unverified",
  outside_eu_evidence: "",
  relocation_support: "unknown",
  location_requirement: "unknown",
  speculative_application: false,
  speculative_contact_status: "not_contacted",
  priority: "B",
  tech_stack_match: "",
  primary_stack_match: "",
  hiring_pattern: "unknown",
  next_hiring_window: "",
  company_notes: "",
  language_requirement: "",
  work_arrangement: "unknown",
  relocation_required: false,
};

export function CompanyForm({ company, countryOptions, onCancel, onSave }) {
  const [form, setForm] = React.useState(() => createFormState(company));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => setForm(createFormState(company)), [company]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const companyPayload = Object.fromEntries(
        Object.keys(initialCompany).map((field) => [field, form[field]]),
      );
      await onSave({
        ...companyPayload,
        name: form.name.trim(),
        tech_stack_match: form.tech_stack_match === "" ? null : Number(form.tech_stack_match),
        primary_stack_match: form.primary_stack_match
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form aria-label="Company research" className="editor company-form" onSubmit={submit}>
      <h2>{company ? "Edit company research" : "Add company research"}</h2>
      <fieldset className="company-field-group">
        <legend>Company &amp; location eligibility</legend>
        <div className="editor-grid">
          <label>
            Company name
            <input
              maxLength={255}
              onChange={(event) => update("name", event.target.value)}
              required
              value={form.name}
            />
          </label>
          <CountryPicker
            countries={countryOptions}
            label="Country"
            onChange={(value) => update("country", value)}
            value={form.country}
          />
          <SelectField
            label="Outside-EU hiring"
            onChange={(value) => update("outside_eu_hiring", value)}
            options={outsideEUHiringOptions}
            value={form.outside_eu_hiring}
          />
          <SelectField
            label="Current location requirement"
            onChange={(value) => update("location_requirement", value)}
            options={locationRequirementOptions}
            value={form.location_requirement}
          />
          <SelectField
            label="Immigration / relocation support"
            onChange={(value) => update("relocation_support", value)}
            options={relocationSupportOptions}
            value={form.relocation_support}
          />
          <label className="checkbox">
            <input
              checked={form.relocation_required}
              onChange={(event) => update("relocation_required", event.target.checked)}
              type="checkbox"
            />
            Relocation required
          </label>
          <label>
            Outside-EU evidence
            <textarea
              onChange={(event) => update("outside_eu_evidence", event.target.value)}
              value={form.outside_eu_evidence}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="company-field-group">
        <legend>Speculative outreach</legend>
        <div className="editor-grid">
          <label className="checkbox">
            <input
              checked={form.speculative_application}
              onChange={(event) => update("speculative_application", event.target.checked)}
              type="checkbox"
            />
            Speculative application
          </label>
          <SelectField
            label="Speculative contact status"
            onChange={(value) => update("speculative_contact_status", value)}
            options={contactStatusOptions}
            value={form.speculative_contact_status}
          />
          <SelectField
            label="Company priority"
            onChange={(value) => update("priority", value)}
            options={[["A", "A — High priority"], ["B", "B — Strong target"], ["C", "C — Speculative"], ["avoid", "Avoid"]]}
            value={form.priority}
          />
        </div>
      </fieldset>

      <fieldset className="company-field-group">
        <legend>Technical fit &amp; hiring cycle</legend>
        <div className="editor-grid">
          <label>
            Tech stack match
            <input
              max="100"
              min="0"
              onChange={(event) => update("tech_stack_match", event.target.value)}
              type="number"
              value={form.tech_stack_match}
            />
          </label>
          <label>
            Primary stack match
            <input
              onChange={(event) => update("primary_stack_match", event.target.value)}
              placeholder="Python, Django, DRF, React, PostgreSQL, AWS, Docker"
              value={form.primary_stack_match}
            />
          </label>
          <SelectField
            label="Hiring pattern"
            onChange={(value) => update("hiring_pattern", value)}
            options={hiringPatternOptions}
            value={form.hiring_pattern}
          />
          <label>
            Next hiring window
            <input
              onChange={(event) => update("next_hiring_window", event.target.value)}
              placeholder="Nov 2026-Feb 2027"
              value={form.next_hiring_window}
            />
          </label>
          <label>
            Language requirement
            <input
              onChange={(event) => update("language_requirement", event.target.value)}
              value={form.language_requirement}
            />
          </label>
          <SelectField
            label="Work arrangement"
            onChange={(value) => update("work_arrangement", value)}
            options={workArrangementOptions}
            value={form.work_arrangement}
          />
          <label>
            Company-level notes
            <textarea
              onChange={(event) => update("company_notes", event.target.value)}
              value={form.company_notes}
            />
          </label>
        </div>
      </fieldset>

      {error && <div className="error" role="alert">{error}</div>}
      <div className="form-actions">
        <button className="ghost-button" onClick={onCancel} type="button">
          <X size={18} />
          Cancel
        </button>
        <button className="primary-button" disabled={saving} type="submit">
          <Save size={18} />
          {saving ? "Saving" : "Save company"}
        </button>
      </div>
    </form>
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

function createFormState(company) {
  const current = { ...initialCompany, ...company };
  return {
    ...current,
    tech_stack_match: current.tech_stack_match ?? "",
    primary_stack_match: Array.isArray(current.primary_stack_match)
      ? current.primary_stack_match.join(", ")
      : current.primary_stack_match || "",
  };
}
