import { Pencil, Trash2 } from "lucide-react";

import { statusClass } from "../constants";

const TERMINAL_STATUSES = new Set(["Interviewed", "Rejected", "Got It"]);

export function ApplicationTable({
  applications,
  countryOptions = [],
  customFields = [],
  emptyMessage = "No applications yet.",
  onEdit,
  onDelete,
}) {
  if (!applications.length) {
    return <div className="empty">{emptyMessage}</div>;
  }

  return (
    <section className="table-frame" aria-label="Applications table">
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Country</th>
            <th>Vacancy</th>
            <th>Outside-EU answer</th>
            <th>Hiring pattern</th>
            <th>Approach</th>
            <th>Next step</th>
            <th>Company Name</th>
            <th>Job title / position applied for</th>
            <th>Keywords</th>
            <th>URL</th>
            <th>Applied On</th>
            <th>English</th>
            <th>German</th>
            <th>Job requirements - Other</th>
            <th>Application Type</th>
            <th>Status</th>
            <th>Salary</th>
            {customFields.map((field) => <th key={field.key}>{field.name}</th>)}
            <th>Notes / Remarks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application, index) => (
            <tr key={application.id}>
              <td>{application.no || index + 1}</td>
              <td>{countryOptions.find((country) => country.code === application.country)?.name || application.country}</td>
              <td>{application.vacancy_status === "none" ? "No vacancy" : "Current vacancy"}</td>
              <td>{outsideEUAnswerLabel[application.outside_eu_response] || "—"}</td>
              <td>{application.hiring_pattern || "—"}</td>
              <td>{application.approach || (application.vacancy_status === "none" ? "Speculative" : "Apply now")}</td>
              <td>{application.next_step || "Apply now"}</td>
              <td>{application.company_name}</td>
              <td>{application.job_title}</td>
              <td>{application.keywords.join(", ")}</td>
              <td>
                <a href={application.url} rel="noreferrer" target="_blank">
                  Advert
                </a>
              </td>
              <td>{application.applied_on}</td>
              <td>{formatLanguage(application.english_requirement, application.english_level)}</td>
              <td>{formatLanguage(application.german_requirement, application.german_level)}</td>
              <td>{application.other_requirements.join(", ")}</td>
              <td>{application.application_type}</td>
              <td>
                <span className={`status-pill ${statusClass[application.status]}`}>{application.status}</span>
              </td>
              <td>{application.salary}</td>
              {customFields.map((field) => (
                <td key={field.key}>{formatCustomValue(application.custom_data?.[field.key])}</td>
              ))}
              <td>{application.notes}</td>
              <td>
                <div className="action-cell">
                  <button className="icon-button" onClick={() => onEdit?.(application)} title="Edit application" type="button">
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button danger-button"
                    disabled={TERMINAL_STATUSES.has(application.status)}
                    onClick={() => onDelete?.(application)}
                    title={TERMINAL_STATUSES.has(application.status) ? "This application cannot be deleted in its current status" : "Delete application"}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatCustomValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

const outsideEUAnswerLabel = {
  yes_open: "Yes / open",
  maybe: "Maybe",
  no: "No",
};

function formatLanguage(requirement, level) {
  return requirement === "Yes" ? `Yes - ${level}` : requirement;
}
