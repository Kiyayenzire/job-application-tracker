import React from "react";

import { applicationTypes, statuses } from "../constants";
import { CountryPicker } from "./CountryPicker";

export function FilterSidebar({
  activeFilterCount,
  countryOptions,
  customFields,
  filters,
  onApply,
  onChange,
  onClear,
  onOpenCustomFields,
}) {
  const [open, setOpen] = React.useState(false);
  const filterableFields = customFields.filter((field) => field.is_filterable);

  return (
    <>
      <button
        aria-expanded={open}
        className="filter-menu-toggle ghost-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "Hide filter options" : "Filter applications"}
        {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
      </button>
      <aside
        aria-label="Application filters"
        className={`filter-sidebar${open ? " is-open" : ""}`}
      >
        <div className="filter-sidebar-heading">
          <div>
            <h2>Filter applications</h2>
            <span className="muted">{activeFilterCount} active</span>
          </div>
          <button className="ghost-button" onClick={onClear} type="button">
            Clear filters
          </button>
        </div>

        <form className="filter-form" onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}>
        <fieldset className="filter-group">
          <legend>Company &amp; role</legend>
          <label>
            Company
            <input
              onChange={(event) => onChange("companyName", event.target.value)}
              value={filters.companyName || ""}
            />
          </label>
          <label>
            Job title
            <input
              onChange={(event) => onChange("jobTitle", event.target.value)}
              value={filters.jobTitle || ""}
            />
          </label>
          <label>
            Keyword
            <input
              onChange={(event) => onChange("keyword", event.target.value)}
              value={filters.keyword || ""}
            />
          </label>
          <label>
            Job requirements
            <input
              onChange={(event) => onChange("requirement", event.target.value)}
              value={filters.requirement || ""}
            />
          </label>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Application details</legend>
          <CountryPicker
            allowAll
            countries={countryOptions}
            label="Country filter"
            onChange={(value) => onChange("country", value)}
            value={filters.country || ""}
          />
          <label>
            Applied from
            <input
              onChange={(event) => onChange("dateFrom", event.target.value)}
              type="date"
              value={filters.dateFrom || ""}
            />
          </label>
          <label>
            Applied to
            <input
              onChange={(event) => onChange("dateTo", event.target.value)}
              type="date"
              value={filters.dateTo || ""}
            />
          </label>
          <label>
            Status
            <select onChange={(event) => onChange("status", event.target.value)} value={filters.status || ""}>
              <option value="">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            Vacancy
            <select onChange={(event) => onChange("vacancyStatus", event.target.value)} value={filters.vacancyStatus || ""}>
              <option value="">All</option>
              <option value="current">Current vacancy</option>
              <option value="none">No vacancy</option>
            </select>
          </label>
          <label>
            Application type
            <select onChange={(event) => onChange("applicationType", event.target.value)} value={filters.applicationType || ""}>
              <option value="">All</option>
              {applicationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Outside-EU answer
            <select onChange={(event) => onChange("outsideEuResponse", event.target.value)} value={filters.outsideEuResponse || ""}>
              <option value="">All</option>
              <option value="yes_open">Yes / open</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            Hiring pattern
            <select onChange={(event) => onChange("hiringPattern", event.target.value)} value={filters.hiringPattern || ""}>
              <option value="">All</option>
              <option value="Q4">Q4</option>
              <option value="Q1">Q1</option>
              <option value="Mid-year">Mid-year</option>
            </select>
          </label>
          <label>
            Salary min
            <input
              onChange={(event) => onChange("salaryMin", event.target.value)}
              placeholder="50000"
              type="number"
              value={filters.salaryMin || ""}
            />
          </label>
          <label>
            Salary max
            <input
              onChange={(event) => onChange("salaryMax", event.target.value)}
              placeholder="100000"
              type="number"
              value={filters.salaryMax || ""}
            />
          </label>
        </fieldset>

        {filterableFields.length > 0 ? (
          <fieldset className="filter-group">
            <legend>Custom fields</legend>
            {filterableFields.map((field) => (
              <label key={field.key}>
                {field.name}
                {field.field_type === "select" || field.field_type === "boolean" ? (
                  <select
                    onChange={(event) => onChange(`custom_${field.key}`, event.target.value)}
                    value={filters[`custom_${field.key}`] || ""}
                  >
                    <option value="">All</option>
                    {field.field_type === "boolean"
                      ? <><option value="true">Yes</option><option value="false">No</option></>
                      : field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input
                    onChange={(event) => onChange(`custom_${field.key}`, event.target.value)}
                    placeholder={field.field_type === "tags" ? "Filter tags" : ""}
                    type={field.field_type === "number" ? "number" : "text"}
                    value={filters[`custom_${field.key}`] || ""}
                  />
                )}
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="custom-filter-empty">
            <span>No custom filters yet. Add a searchable custom field to show it here.</span>
            <button className="ghost-button" onClick={onOpenCustomFields} type="button">
              Add custom fields
            </button>
          </div>
        )}
        <button className="primary-button apply-filters-button" type="submit">
          Apply filters
        </button>
        </form>
      </aside>
    </>
  );
}
