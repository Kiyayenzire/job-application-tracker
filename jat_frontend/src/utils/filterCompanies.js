export function filterCompanies(companies, filters) {
  const companyName = filters.companyName?.trim().toLocaleLowerCase();
  const companyResearch = filters.companyResearch?.trim().toLocaleLowerCase();
  const minimumStackMatch = filters.techStackMatchMin === "" || filters.techStackMatchMin == null
    ? null
    : Number(filters.techStackMatchMin);

  return companies.filter((company) => {
    if (companyName && !company.name.toLocaleLowerCase().includes(companyName)) return false;
    if (filters.companyId && String(company.id) !== String(filters.companyId)) return false;
    if (filters.country && company.country !== filters.country) return false;
    if (filters.outsideEuHiring && company.outside_eu_hiring !== filters.outsideEuHiring) return false;
    if (filters.companyPriority && company.priority !== filters.companyPriority) return false;
    if (minimumStackMatch != null && (
      company.tech_stack_match == null
      || company.tech_stack_match < minimumStackMatch
    )) return false;
    if (
      filters.speculativeContactStatus
      && company.speculative_contact_status !== filters.speculativeContactStatus
    ) return false;
    if (filters.companyHiringPattern && company.hiring_pattern !== filters.companyHiringPattern) return false;
    if (filters.relocationSupport && company.relocation_support !== filters.relocationSupport) return false;
    if (filters.locationRequirement && company.location_requirement !== filters.locationRequirement) return false;
    if (filters.companyWorkArrangement && company.work_arrangement !== filters.companyWorkArrangement) return false;
    if (
      filters.speculativeCompanyApplication
      && String(company.speculative_application) !== filters.speculativeCompanyApplication
    ) return false;

    if (companyResearch) {
      const researchText = [
        company.outside_eu_evidence,
        company.company_notes,
        ...(company.primary_stack_match || []),
        company.next_hiring_window,
      ].join(" ").toLocaleLowerCase();
      if (!researchText.includes(companyResearch)) return false;
    }

    return true;
  });
}
