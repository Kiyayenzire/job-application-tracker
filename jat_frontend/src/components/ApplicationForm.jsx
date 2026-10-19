import React from "react";
import { Save, X } from "lucide-react";

import { applicationTypes, countries, languageLevels, requirementOptions, statuses } from "../constants";
import { CountryPicker } from "./CountryPicker";
import {
  buildApplicationPayload,
  canSubmitApplication,
  getNextStep,
  isVacancyDetailsComplete,
  parseKeywords,
} from "../utils/applicationForm";

const today = new Date().toISOString().slice(0, 10);
const noCustomFields = Object.freeze([]);

const initialForm = {
  country: "de",
  company: "",
  vacancy_status: "current",
  outside_eu_response: "",
  hiring_pattern: "",
  company_name: "",
  job_title: "",
  keywords: "",
  url: "",
  applied_on: today,
  english_requirement: "Undefined",
  english_level: "",
  german_requirement: "Undefined",
  german_level: "",
  other_requirements: requirementOptions.slice(0, 7),
  custom_requirement: "",
  application_type: "Company Portal",
  status: "to send",
  salary: "",
  salary_min: "",
  salary_max: "",
  notes: "",
  custom_data: {},
};

export function ApplicationForm({
  countryOptions = countries,
  companies = [],
  customFields = noCustomFields,
  initialValues,
  onCancel,
  onSave,
}) {
  const [form, setForm] = React.useState(() => buildFormState(initialValues, customFields));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setForm(buildFormState(initialValues, customFields));
  }, [customFields, initialValues]);

  const keywords = parseKeywords(form.keywords);
  const canSubmit = canSubmitApplication({
    keywords,
    otherRequirements: form.other_requirements,
  }) && Boolean(form.company) && isVacancyDetailsComplete({
    vacancyStatus: form.vacancy_status,
    outsideEUResponse: form.outside_eu_response,
    hiringPattern: form.hiring_pattern,
  });

  function updateField(field, value) {
    setForm((current) => {
      if (field === "vacancy_status") {
        return {
          ...current,
          vacancy_status: value,
          outside_eu_response: "",
          hiring_pattern: "",
        };
      }
      if (field === "outside_eu_response") {
        return { ...current, outside_eu_response: value, hiring_pattern: "" };
      }
      return { ...current, [field]: value };
    });
  }

  function toggleRequirement(value) {
    setForm((current) => {
      const selected = current.other_requirements.includes(value);
      return {
        ...current,
        other_requirements: selected
          ? current.other_requirements.filter((item) => item !== value)
          : [...current.other_requirements, value],
      };
    });
  }

  function addCustomRequirement() {
    const value = form.custom_requirement.trim();
    if (!value || form.other_requirements.includes(value)) return;
    setForm((current) => ({
      ...current,
      other_requirements: [...current.other_requirements, value],
      custom_requirement: "",
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildApplicationPayload(form, customFields);
      if (form.company) {
        payload.company = Number(form.company);
        payload.company_name = companies.find(
          (company) => company.id === Number(form.company),
        )?.name || "";
      }
      await onSave(payload);
    } catch (err) {
      setError(formatError(err.details) || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form aria-label="Application details" className="editor" onSubmit={submit}>
      <div className="editor-grid">
        <label>
          Company
          <select
            onChange={(event) => {
              const selectedCompany = companies.find(
                (company) => company.id === Number(event.target.value),
              );
              setForm((current) => ({
                ...current,
                company: event.target.value,
                ...(selectedCompany ? { country: selectedCompany.country } : {}),
              }));
            }}
            required
            value={form.company}
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </label>
        <CountryPicker
          countries={countryOptions}
          label="Country"
          onChange={(value) => updateField("country", value)}
          value={form.country}
        />
        <label>
          Vacancy status
          <select
            value={form.vacancy_status}
            onChange={(event) => updateField("vacancy_status", event.target.value)}
          >
            <option value="current">Current vacancy</option>
            <option value="none">No vacancy</option>
          </select>
        </label>
        {form.company && (
          <p className="muted linked-company-note">
            Company-level research is stored once on the selected company record.
          </p>
        )}
        <label>
          Job title / position applied for
          <input required value={form.job_title} onChange={(event) => updateField("job_title", event.target.value)} />
        </label>
        <label>
          URL
          <input required type="url" value={form.url} onChange={(event) => updateField("url", event.target.value)} />
        </label>
        <label>
          Applied On
          <input required type="date" value={form.applied_on} onChange={(event) => updateField("applied_on", event.target.value)} />
        </label>
        <label>
          Application Type
          <select value={form.application_type} onChange={(event) => updateField("application_type", event.target.value)}>
            {applicationTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Salary
          <input value={form.salary} onChange={(event) => updateField("salary", event.target.value)} />
        </label>
        <label>
          Salary min
          <input
            min="0"
            step="0.01"
            type="number"
            value={form.salary_min}
            onChange={(event) => updateField("salary_min", event.target.value)}
          />
        </label>
        <label>
          Salary max
          <input
            min="0"
            step="0.01"
            type="number"
            value={form.salary_max}
            onChange={(event) => updateField("salary_max", event.target.value)}
          />
        </label>
      </div>

      {form.vacancy_status === "current" ? (
        <p className="next-step" role="status">Next step: Apply now</p>
      ) : (
        <fieldset className="vacancy-details">
          <legend>Speculative application</legend>
          <label>
            Outside-EU answer
            <select
              required
              value={form.outside_eu_response}
              onChange={(event) => updateField("outside_eu_response", event.target.value)}
            >
              <option value="">Select answer</option>
              <option value="yes_open">Yes / open</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </label>
          {form.outside_eu_response === "yes_open" && (
            <label>
              Hiring pattern
              <select
                required
                value={form.hiring_pattern}
                onChange={(event) => updateField("hiring_pattern", event.target.value)}
              >
                <option value="">Select hiring pattern</option>
                <option value="Q4">Q4</option>
                <option value="Q1">Q1</option>
                <option value="Mid-year">Mid-year</option>
              </select>
            </label>
          )}
          {form.outside_eu_response && (
            <p className="next-step" role="status">
              Next step: {getNextStep(form.vacancy_status, form.outside_eu_response)}
            </p>
          )}
        </fieldset>
      )}

      <label>
        Keywords
        <input
          aria-describedby="keyword-help"
          placeholder="python, django, react, mysql, docker"
          value={form.keywords}
          onChange={(event) => updateField("keywords", event.target.value)}
        />
      </label>
      <p id="keyword-help" className={keywords.length >= 5 && keywords.length <= 17 ? "hint" : "hint warning"}>
        {keywords.length}/17 keywords. Enter 5 to 17, separated by commas.
      </p>

      <div className="language-row">
        <LanguageRequirement label="English" level={form.english_level} requirement={form.english_requirement} onChange={updateField} prefix="english" />
        <LanguageRequirement label="German" level={form.german_level} requirement={form.german_requirement} onChange={updateField} prefix="german" />
      </div>

      <fieldset>
        <legend>Requirements - Other</legend>
        <div className="checkbox-grid">
          {[...new Set([...requirementOptions, ...form.other_requirements])].map((option) => (
            <label className="checkbox" key={option}>
              <input
                checked={form.other_requirements.includes(option)}
                onChange={() => toggleRequirement(option)}
                type="checkbox"
              />
              {option}
            </label>
          ))}
        </div>
        <div className="custom-row">
          <input
            aria-label="Add custom requirement"
            placeholder="Add requirement"
            value={form.custom_requirement}
            onChange={(event) => updateField("custom_requirement", event.target.value)}
          />
          <button type="button" onClick={addCustomRequirement}>Add Option</button>
        </div>
        <p className={form.other_requirements.length >= 7 ? "hint" : "hint warning"}>
          {form.other_requirements.length} selected. At least 7 required.
        </p>
      </fieldset>

      {customFields.length > 0 && (
        <fieldset>
          <legend>Custom data / profession-specific details</legend>
          <div className="editor-grid">
            {customFields.map((field) => (
              <CustomFieldInput
                field={field}
                key={field.id || field.key}
                onChange={(value) => updateCustomField(field.key, value)}
                value={form.custom_data[field.key]}
              />
            ))}
          </div>
        </fieldset>
      )}
      {customFields.length === 0 && (
        <p className="muted">
          No custom data fields configured yet. Add them in Custom data &amp; profile settings.
        </p>
      )}

      <label>
        Notes / Remarks
        <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
      </label>

      {error && <div className="error">{error}</div>}
      <div className="form-actions">
        <button className="ghost-button" onClick={onCancel} type="button">
          <X size={18} />
          Cancel
        </button>
        <button className="primary-button" disabled={!canSubmit || saving} type="submit">
          <Save size={18} />
          {saving ? "Saving" : "Save"}
        </button>
      </div>
    </form>
  );

  function updateCustomField(key, value) {
    setForm((current) => ({
      ...current,
      custom_data: { ...current.custom_data, [key]: value },
    }));
  }
}

function buildFormState(initialValues, customFields) {
  const customDataDefaults = Object.fromEntries(
    customFields.map((field) => [
      field.key,
      field.field_type === "boolean" ? false : "",
    ]),
  );

  if (!initialValues) {
    return {
      ...initialForm,
      other_requirements: requirementOptions.slice(0, 7),
      custom_data: customDataDefaults,
    };
  }

  return {
    ...initialForm,
    ...initialValues,
    company: initialValues.company == null ? "" : String(initialValues.company),
    salary_min: initialValues.salary_min ?? "",
    salary_max: initialValues.salary_max ?? "",
    outside_eu_response: initialValues.outside_eu_response || "",
    hiring_pattern: initialValues.hiring_pattern || "",
    keywords: Array.isArray(initialValues.keywords) ? initialValues.keywords.join(", ") : "",
    other_requirements: Array.isArray(initialValues.other_requirements) ? [...initialValues.other_requirements] : requirementOptions.slice(0, 7),
    custom_data: {
      ...(initialValues.custom_data || {}),
      ...Object.fromEntries(
        customFields.map((field) => {
          const value = initialValues.custom_data?.[field.key];
          return [
            field.key,
            field.field_type === "tags" && Array.isArray(value)
              ? value.join(", ")
              : value ?? customDataDefaults[field.key],
          ];
        }),
      ),
    },
  };
}

function CustomFieldInput({ field, onChange, value }) {
  if (field.field_type === "boolean") {
    return (
      <label className="checkbox">
        <input
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        {field.name}
      </label>
    );
  }

  if (field.field_type === "select") {
    return (
      <label>
        {field.name}
        <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select {field.name.toLowerCase()}</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return (
    <label>
      {field.name}
      <input
        type={field.field_type === "number" ? "number" : "text"}
        value={Array.isArray(value) ? value.join(", ") : value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.field_type === "tags" ? "Comma-separated values" : ""}
      />
    </label>
  );
}

function LanguageRequirement({ label, level, requirement, onChange, prefix }) {
  return (
    <fieldset className="language-field">
      <legend>{label}</legend>
      <select value={requirement} onChange={(event) => onChange(`${prefix}_requirement`, event.target.value)}>
        <option>Undefined</option>
        <option>Yes</option>
        <option>No</option>
      </select>
      {requirement === "Yes" && (
        <select required value={level} onChange={(event) => onChange(`${prefix}_level`, event.target.value)}>
          <option value="">Select level</option>
          {languageLevels.map((item) => <option key={item}>{item}</option>)}
        </select>
      )}
    </fieldset>
  );
}

function formatError(details) {
  if (!details) return "";
  return Object.entries(details)
    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
    .join(" ");
}
