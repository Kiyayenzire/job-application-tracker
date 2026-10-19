export function parseKeywords(value = "") {
  return value.split(",").map((keyword) => keyword.trim()).filter(Boolean);
}

export function canSubmitApplication({ keywords, otherRequirements }) {
  return keywords.length >= 5 && keywords.length <= 17 && otherRequirements.length >= 7;
}

export function buildCustomData(formData, customFields) {
  const definedKeys = new Set(customFields.map((field) => field.key));
  const preservedValues = Object.fromEntries(
    Object.entries(formData).filter(([key]) => !definedKeys.has(key)),
  );

  return customFields.reduce((result, field) => {
    const value = formData[field.key];

    if (field.field_type === "boolean") {
      result[field.key] = Boolean(value);
    } else if (field.field_type === "tags") {
      const tags = Array.isArray(value) ? value : parseKeywords(value || "");
      if (tags.length) result[field.key] = tags;
    } else if (field.field_type === "number") {
      if (value !== "" && value != null) result[field.key] = Number(value);
    } else if (value !== "" && value != null) {
      result[field.key] = value;
    }

    return result;
  }, preservedValues);
}

export function getNextStep(vacancyStatus, outsideEUResponse) {
  if (vacancyStatus === "current") return "Apply now";

  return {
    yes_open: "Target",
    maybe: "Re-contact later",
    no: "Remove for now",
  }[outsideEUResponse] || "Speculative";
}

export function isVacancyDetailsComplete({
  vacancyStatus,
  outsideEUResponse,
  hiringPattern,
}) {
  if (vacancyStatus === "current") return true;
  if (vacancyStatus !== "none" || !outsideEUResponse) return false;
  return outsideEUResponse !== "yes_open" || Boolean(hiringPattern);
}

export function buildApplicationPayload(form, customFields = []) {
  const { custom_requirement: _customRequirement, ...payload } = form;
  const applicationPayload = {
    ...payload,
    keywords: parseKeywords(form.keywords),
    english_level: payload.english_requirement === "Yes" ? payload.english_level : "",
    german_level: payload.german_requirement === "Yes" ? payload.german_level : "",
    outside_eu_response: payload.vacancy_status === "none" ? payload.outside_eu_response : "",
    hiring_pattern:
      payload.vacancy_status === "none" && payload.outside_eu_response === "yes_open"
        ? payload.hiring_pattern
        : "",
  };
  if ("salary_min" in form || "salary_max" in form) {
    applicationPayload.salary_min = payload.salary_min === "" ? null : Number(payload.salary_min);
    applicationPayload.salary_max = payload.salary_max === "" ? null : Number(payload.salary_max);
  }
  if ("custom_data" in form || customFields.length) {
    applicationPayload.custom_data = buildCustomData(form.custom_data || {}, customFields);
  }
  return applicationPayload;
}
