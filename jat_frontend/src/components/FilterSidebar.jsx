import React from "react";

import { applicationTypes, statuses } from "../constants";
import { CountryPicker } from "./CountryPicker";

export function FilterSidebar({
  activeFilterCount,
  countryOptions,
  companies = [],
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
            <h2>Filter companies &amp; applications</h2>
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
            Company record
            <select
              onChange={(event) => onChange("companyId", event.target.value)}
              value={filters.companyId || ""}
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </label>
          <label>
            Company
            <input
              onChange={(event) => onChange("companyName", event.target.value)}
              value={filters.companyName || ""}
            />
          </label>
          <label>
            Company research
            <input
              onChange={(event) => onChange("companyResearch", event.target.value)}
              placeholder="Search evidence, notes, or stack"
              value={filters.companyResearch || ""}
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
            Vacancy hiring pattern
            <select onChange={(event) => onChange("hiringPattern", event.target.value)} value={filters.hiringPattern || ""}>
              <option value="">All</option>
              <option value="Q4">Q4</option>
              <option value="Q1">Q1</option>
              <option value="Mid-year">Mid-year</option>
            </select>
          </label>
          <label>
            Outside-EU hiring
            <select onChange={(event) => onChange("outsideEuHiring", event.target.value)} value={filters.outsideEuHiring || ""}>
              <option value="">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="likely">Likely</option>
              <option value="unverified">Unverified</option>
              <option value="local_only">Local-only</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label>
            Immigration / relocation support
            <select onChange={(event) => onChange("relocationSupport", event.target.value)} value={filters.relocationSupport || ""}>
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="possible">Possible</option>
              <option value="no">No</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Current location requirement
            <select onChange={(event) => onChange("locationRequirement", event.target.value)} value={filters.locationRequirement || ""}>
              <option value="">All</option>
              <option value="outside_eu_accepted">Outside-EU accepted</option>
              <option value="eu_only">EU only</option>
              <option value="germany_only">Germany only</option>
              <option value="local_only">Local only</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Speculative application
            <select onChange={(event) => onChange("speculativeCompanyApplication", event.target.value)} value={filters.speculativeCompanyApplication || ""}>
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            Company priority
            <select onChange={(event) => onChange("companyPriority", event.target.value)} value={filters.companyPriority || ""}>
              <option value="">All</option>
              <option value="A">A — High priority</option>
              <option value="B">B — Strong target</option>
              <option value="C">C — Speculative</option>
              <option value="avoid">Avoid</option>
            </select>
          </label>
          <label>
            Minimum tech stack match
            <input
              max="100"
              min="0"
              onChange={(event) => onChange("techStackMatchMin", event.target.value)}
              type="number"
              value={filters.techStackMatchMin || ""}
            />
          </label>
          <label>
            Speculative contact status
            <select onChange={(event) => onChange("speculativeContactStatus", event.target.value)} value={filters.speculativeContactStatus || ""}>
              <option value="">All</option>
              <option value="not_contacted">Not contacted</option>
              <option value="preparing">Preparing</option>
              <option value="sent">Sent</option>
              <option value="reply_received">Reply received</option>
              <option value="considering">Considering</option>
              <option value="interested">Interested in future</option>
              <option value="not_interested">Not interested</option>
              <option value="local_only">Explicitly EU/local only</option>
              <option value="follow_up">Follow-up needed</option>
            </select>
          </label>
          <label>
            Company hiring pattern
            <select onChange={(event) => onChange("companyHiringPattern", event.target.value)} value={filters.companyHiringPattern || ""}>
              <option value="">All</option>
              <option value="year_round">Year-round</option>
              <option value="Q4-Q1">Q4-Q1</option>
              <option value="Q1-Q2">Q1-Q2</option>
              <option value="Q2-Q3">Q2-Q3</option>
              <option value="Q3-Q4">Q3-Q4</option>
              <option value="irregular">Irregular</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Work arrangement
            <select onChange={(event) => onChange("companyWorkArrangement", event.target.value)} value={filters.companyWorkArrangement || ""}>
              <option value="">All</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="office">Office</option>
              <option value="flexible">Flexible / varies</option>
              <option value="unknown">Unknown</option>
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
