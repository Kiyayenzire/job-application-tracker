function normalizeSalary(value) {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/[^0-9.-]/g, "");
  const numeric = Number.parseFloat(digits);
  return Number.isFinite(numeric) ? numeric : null;
}

function matchesCustomField(application, field, expected) {
  const actual = application.custom_data?.[field.key];
  if (actual == null) return false;

  const expectedValues = Array.isArray(expected)
    ? expected.map(String)
    : String(expected).split(",").map((value) => value.trim()).filter(Boolean);
  if (!expectedValues.length) return true;

  if (field.field_type === "tags") {
    const actualValues = (Array.isArray(actual) ? actual : [actual])
      .map((value) => String(value).toLocaleLowerCase());
    return expectedValues.every((value) => actualValues.includes(value.toLocaleLowerCase()));
  }

  const actualText = String(actual).toLocaleLowerCase();
  return expectedValues.every((value) =>
    field.field_type === "text"
      ? actualText.includes(value.toLocaleLowerCase())
      : actualText === value.toLocaleLowerCase(),
  );
}

export function filterApplications(applications, filters, customFields = []) {
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
  const searchText = filters.searchText?.trim().toLocaleLowerCase();
  const companyName = filters.companyName?.trim().toLocaleLowerCase();
  const jobTitle = filters.jobTitle?.trim().toLocaleLowerCase();
  const keyword = filters.keyword?.trim().toLocaleLowerCase();
  const requirement = filters.requirement?.trim().toLocaleLowerCase();
  const activeCustomFilters = customFields.filter(
    (field) => field.is_filterable !== false && filters[`custom_${field.key}`] !== "" && filters[`custom_${field.key}`] != null,
  );

  return applications.filter((application) => {
    const appliedOn = application.applied_on ? new Date(application.applied_on) : null;

    if (companyName && !application.company_name?.toLocaleLowerCase().includes(companyName)) {
      return false;
    }

    if (jobTitle && !application.job_title?.toLocaleLowerCase().includes(jobTitle)) {
      return false;
    }

    if (keyword && !(application.keywords || []).join(" ").toLocaleLowerCase().includes(keyword)) {
      return false;
    }

    if (searchText) {
      const searchableText = [
        application.company_name,
        application.job_title,
        ...(application.keywords || []),
      ].join(" ").toLocaleLowerCase();
      if (!searchableText.includes(searchText)) return false;
    }

    if (requirement) {
      const requirements = [
        ...(application.other_requirements || []),
        ...(application.keywords || []),
      ].join(" ").toLocaleLowerCase();
      if (!requirements.includes(requirement)) return false;
    }

    if (dateFrom && appliedOn && appliedOn < dateFrom) return false;
    if (dateTo && appliedOn && appliedOn > dateTo) return false;

    for (const [filter, value] of [
      ["country", application.country],
      ["vacancyStatus", application.vacancy_status],
      ["applicationType", application.application_type],
      ["outsideEuResponse", application.outside_eu_response],
      ["hiringPattern", application.hiring_pattern],
      ["status", application.status],
    ]) {
      if (filters[filter] && filters[filter] !== value) return false;
    }

    const salaryFilterActive = filters.salaryMin !== "" && filters.salaryMin != null
      || filters.salaryMax !== "" && filters.salaryMax != null;
    if (salaryFilterActive) {
      const requestedMin = filters.salaryMin === "" || filters.salaryMin == null
        ? Number.NEGATIVE_INFINITY
        : Number(filters.salaryMin);
      const requestedMax = filters.salaryMax === "" || filters.salaryMax == null
        ? Number.POSITIVE_INFINITY
        : Number(filters.salaryMax);
      const hasSalaryRange = application.salary_min != null || application.salary_max != null;
      const salaryValue = hasSalaryRange ? null : normalizeSalary(application.salary);
      const applicationMin = hasSalaryRange
        ? (application.salary_min == null ? Number.NEGATIVE_INFINITY : Number(application.salary_min))
        : (salaryValue ?? Number.NEGATIVE_INFINITY);
      const applicationMax = hasSalaryRange
        ? (application.salary_max == null ? Number.POSITIVE_INFINITY : Number(application.salary_max))
        : (salaryValue ?? Number.POSITIVE_INFINITY);

      if (!hasSalaryRange && salaryValue == null) return false;
      if (applicationMax < requestedMin || applicationMin > requestedMax) return false;
    }

    return activeCustomFilters.every((field) =>
      matchesCustomField(application, field, filters[`custom_${field.key}`]),
    );
  });
}
