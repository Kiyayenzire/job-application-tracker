import { Pencil } from "lucide-react";

export function CompanyTable({
  companies,
  countryOptions,
  customFields = [],
  emptyMessage = "No companies tracked yet. Add a company to start recording eligibility and hiring research.",
  onEdit,
}) {
  if (!companies.length) {
    return <div className="empty">{emptyMessage}</div>;
  }

  return (
    <section aria-label="Companies table" className="table-frame">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Country</th>
            <th>Outside-EU hiring</th>
            <th>Priority</th>
            <th>Stack match</th>
            <th>Hiring pattern</th>
            <th>German level</th>
            <th>English level</th>
            {customFields.map((field) => <th key={field.key}>{field.name}</th>)}
            <th>Applications</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td>{company.name}</td>
              <td>{countryOptions.find((country) => country.code === company.country)?.name || company.country}</td>
              <td>{company.outside_eu_hiring_label || labels[company.outside_eu_hiring] || company.outside_eu_hiring}</td>
              <td>{company.priority === "avoid" ? "Avoid" : company.priority}</td>
              <td>{company.tech_stack_match == null ? "—" : `${company.tech_stack_match}/100`}</td>
              <td>{company.hiring_pattern_label || labels[company.hiring_pattern] || company.hiring_pattern}</td>
              <td>{company.german_level || "—"}</td>
              <td>{company.english_level || "—"}</td>
              {customFields.map((field) => (
                <td key={field.key}>{formatCustomValue(company.custom_data?.[field.key])}</td>
              ))}
              <td>{company.application_count ?? 0}</td>
              <td>
                <button
                  aria-label={`Edit ${company.name}`}
                  className="icon-button"
                  onClick={() => onEdit(company)}
                  title="Edit company research"
                  type="button"
                >
                  <Pencil size={16} />
                </button>
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

const labels = {
  confirmed: "Confirmed",
  likely: "Likely",
  unverified: "Unverified",
  local_only: "Local-only",
  rejected: "Rejected",
  year_round: "Year-round",
  "Q4-Q1": "Q4-Q1",
  "Q1-Q2": "Q1-Q2",
  "Q2-Q3": "Q2-Q3",
  "Q3-Q4": "Q3-Q4",
  irregular: "Irregular",
  unknown: "Unknown",
};
