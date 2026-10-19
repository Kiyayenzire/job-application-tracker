import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LogOut, Plus, RefreshCw, Settings2 } from "lucide-react";

import {
  createApplication,
  createCompany,
  createCustomField,
  deleteApplication,
  deleteCustomField,
  fetchCurrentUser,
  fetchTrackingProfile,
  listApplications,
  listCompanies,
  listCustomFields,
  listCountries,
  updateApplication,
  updateCompany,
  updateTrackingProfile,
} from "./api";
import { ApplicationForm } from "./components/ApplicationForm";
import { ApplicationTable } from "./components/ApplicationTable";
import { CompanyForm } from "./components/CompanyForm";
import { CompanyTable } from "./components/CompanyTable";
import { CreateAccountPage } from "./components/CreateAccountPage";
import { CustomFieldManager } from "./components/CustomFieldManager";
import { FilterSidebar } from "./components/FilterSidebar";
import { LoginPage } from "./components/LoginPage";
import "./styles.css";
import { filterCompanies } from "./utils/filterCompanies";
import { filterApplications } from "./utils/filterApplications";

function App() {
  const [applications, setApplications] = React.useState([]);
  const [companies, setCompanies] = React.useState([]);
  const [countryOptions, setCountryOptions] = React.useState([]);
  const [customFields, setCustomFields] = React.useState([]);
  const [profile, setProfile] = React.useState({ profession_template: "" });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingApplication, setEditingApplication] = React.useState(null);
  const [companyFormOpen, setCompanyFormOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState(null);
  const [filters, setFilters] = React.useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    companyId: "",
    companyResearch: "",
    salaryMin: "",
    salaryMax: "",
    searchText: "",
    companyName: "",
    jobTitle: "",
    keyword: "",
    requirement: "",
    country: "",
    vacancyStatus: "",
    applicationType: "",
    outsideEuResponse: "",
    hiringPattern: "",
    outsideEuHiring: "",
    companyPriority: "",
    techStackMatchMin: "",
    speculativeContactStatus: "",
    companyHiringPattern: "",
    relocationSupport: "",
    locationRequirement: "",
    companyWorkArrangement: "",
    speculativeCompanyApplication: "",
  });
  const [filterDrafts, setFilterDrafts] = React.useState(filters);
  const [user, setUser] = React.useState(null);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [authCheckAttempt, setAuthCheckAttempt] = React.useState(0);
  const [authError, setAuthError] = React.useState("");
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextApplications, nextCompanies, nextCustomFields, nextProfile, nextCountryOptions] = await Promise.all([
        listApplications(),
        listCompanies(),
        listCustomFields(),
        fetchTrackingProfile(),
        listCountries(),
      ]);
      setApplications(nextApplications);
      setCompanies(nextCompanies);
      setCustomFields(nextCustomFields);
      setProfile(nextProfile);
      setCountryOptions(nextCountryOptions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const currentUser = await fetchCurrentUser();
        if (!active) return;
        setUser(currentUser);
        setAuthError("");
      } catch (err) {
        if (!active) return;
        if (err.status === 401) {
          localStorage.removeItem("authToken");
          setUser(null);
          setAuthError("");
        } else if (localStorage.getItem("authToken")) {
          setAuthError(
            "Unable to verify your saved session. Check your connection, then retry.",
          );
        } else {
          setUser(null);
        }
      } finally {
        if (active) setAuthChecked(true);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [authCheckAttempt]);

  function retrySessionCheck() {
    setAuthError("");
    setAuthChecked(false);
    setAuthCheckAttempt((attempt) => attempt + 1);
  }

  React.useEffect(() => {
    if (user) {
      load();
    }
  }, [load, user]);

  async function handleSave(payload) {
    if (editingApplication) {
      const updated = await updateApplication(editingApplication.id, payload);
      setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setCompanies((current) => current.map((company) => {
        const wasLinked = String(editingApplication.company) === String(company.id);
        const isLinked = String(updated.company) === String(company.id);
        if (wasLinked === isLinked) return company;
        return {
          ...company,
          application_count: Math.max(0, (company.application_count || 0) + (isLinked ? 1 : -1)),
        };
      }));
    } else {
      const created = await createApplication(payload);
      setApplications((current) => [created, ...current]);
      setCompanies((current) => current.map((company) => (
        String(company.id) === String(created.company)
          ? { ...company, application_count: (company.application_count || 0) + 1 }
          : company
      )));
    }

    setEditingApplication(null);
    setFormOpen(false);
  }

  async function handleSaveCompany(payload) {
    if (editingCompany) {
      const updated = await updateCompany(editingCompany.id, payload);
      setCompanies((current) => current.map((item) => item.id === updated.id ? updated : item));
      const nextApplications = await listApplications();
      setApplications(nextApplications);
    } else {
      const created = await createCompany(payload);
      setCompanies((current) => [...current, created].sort((left, right) => left.name.localeCompare(right.name)));
    }
    setEditingCompany(null);
    setCompanyFormOpen(false);
  }

  function handleEdit(application) {
    setEditingApplication(application);
    setFormOpen(true);
  }

  async function handleDelete(application) {
    if (application.status === "Interviewed" || application.status === "Rejected" || application.status === "Got It") {
      return;
    }

    await deleteApplication(application.id);
    setApplications((current) => current.filter((item) => item.id !== application.id));
  }

  async function handleCreateCustomField(payload) {
    const created = await createCustomField(payload);
    setCustomFields((current) => [...current, created]);
  }

  async function handleDeleteCustomField(field) {
    try {
      await deleteCustomField(field.id);
      setCustomFields((current) => current.filter((item) => item.id !== field.id));
      setFilters((current) => {
        const next = { ...current };
        delete next[`custom_${field.key}`];
        return next;
      });
      setFilterDrafts((current) => {
        const next = { ...current };
        delete next[`custom_${field.key}`];
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveProfile(payload) {
    setProfile(await updateTrackingProfile(payload));
  }

  const filteredApplications = React.useMemo(
    () => filterApplications(applications, filters, customFields),
    [applications, filters, customFields],
  );
  const filteredCompanies = React.useMemo(
    () => filterCompanies(companies, filters),
    [companies, filters],
  );
  const hasActiveFilters = Object.values(filters).some((value) => value !== "" && value != null);
  const activeFilterCount = Object.values(filters).filter((value) => value !== "" && value != null).length;

  function updateFilter(field, value) {
    setFilterDrafts((current) => ({ ...current, [field]: value }));
  }

  function applyFilters() {
    setFilters(filterDrafts);
  }

  function clearFilters() {
    const clearedFilters = {
      dateFrom: "",
      dateTo: "",
      status: "",
      companyId: "",
      companyResearch: "",
      salaryMin: "",
      salaryMax: "",
      searchText: "",
      companyName: "",
      jobTitle: "",
      keyword: "",
      requirement: "",
      country: "",
      vacancyStatus: "",
      applicationType: "",
      outsideEuResponse: "",
      hiringPattern: "",
      outsideEuHiring: "",
      companyPriority: "",
      techStackMatchMin: "",
      speculativeContactStatus: "",
      companyHiringPattern: "",
      relocationSupport: "",
      locationRequirement: "",
      companyWorkArrangement: "",
      speculativeCompanyApplication: "",
      ...Object.fromEntries(customFields.map((field) => [`custom_${field.key}`, ""])),
    };
    setFilters(clearedFilters);
    setFilterDrafts(clearedFilters);
  }

  if (!authChecked) {
    return <main className="shell"><div className="loading">Checking session...</div></main>;
  }

  if (authError) {
    return (
      <main className="shell auth-shell">
        <section className="auth-card">
          <div className="error" role="alert">{authError}</div>
          <button className="primary-button" onClick={retrySessionCheck} type="button">
            Retry session check
          </button>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<LoginPage onAuthenticated={setUser} />} path="/login" />
          <Route element={<CreateAccountPage onAuthenticated={setUser} />} path="/create-account" />
          <Route element={<Navigate replace to="/login" />} path="*" />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Job Applications</h1>
          <p>{companies.length} companies · {applications.length} tracked applications</p>
        </div>
        <div className="actions">
          <button className="icon-button" onClick={load} title="Refresh applications" type="button">
            <RefreshCw size={18} />
          </button>
          <button
            className="ghost-button"
            onClick={() => setSettingsOpen((open) => !open)}
            type="button"
          >
            <Settings2 size={18} />
            {settingsOpen ? "Hide custom data settings" : "Custom data & profile settings"}
          </button>
          <button
            className="ghost-button"
            onClick={() => {
              localStorage.removeItem("authToken");
              setUser(null);
            }}
            type="button"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      {settingsOpen && (
        <CustomFieldManager
          fields={customFields}
          onCreateField={handleCreateCustomField}
          onDeleteField={handleDeleteCustomField}
          onSaveProfile={handleSaveProfile}
          profile={profile}
        />
      )}

      <div className="application-layout">
        <section aria-label="Application list" className="application-results">
          <div className="application-list-toolbar">
            <div>
              <h2>Company research</h2>
              <p className="muted">Record company eligibility and hiring research once, then link vacancies to it.</p>
            </div>
            <button
              className="primary-button"
              disabled={loading || countryOptions.length === 0}
              onClick={() => {
                setEditingCompany(null);
                setCompanyFormOpen(true);
              }}
              type="button"
            >
              <Plus size={18} />
              Add company
            </button>
          </div>
          {companyFormOpen && (
            <CompanyForm
              company={editingCompany}
              countryOptions={countryOptions}
              onCancel={() => {
                setEditingCompany(null);
                setCompanyFormOpen(false);
              }}
              onSave={handleSaveCompany}
            />
          )}
          {loading ? (
            <div className="loading">Loading companies...</div>
          ) : (
            <CompanyTable
              companies={filteredCompanies}
              countryOptions={countryOptions}
              emptyMessage={
                companies.length > 0 && filteredCompanies.length === 0
                  ? "No companies match these filters."
                  : undefined
              }
              onEdit={(company) => {
                setEditingCompany(company);
                setCompanyFormOpen(true);
              }}
            />
          )}
          <div className="application-list-toolbar job-list-toolbar">
            <div>
              <h2>Vacancies &amp; applications</h2>
              <p className="muted">Track individual jobs and their application status.</p>
            </div>
            <button
              className="primary-button"
              disabled={loading || companies.length === 0}
              onClick={() => {
                setEditingApplication(null);
                setFormOpen(true);
              }}
              type="button"
            >
              <Plus size={18} />
              Add vacancy / application
            </button>
          </div>
          {companies.length === 0 && (
            <p className="muted">Add a company before recording its vacancies or applications.</p>
          )}
          {formOpen && (
            <ApplicationForm
              companies={companies}
              countryOptions={countryOptions}
              customFields={customFields}
              initialValues={editingApplication}
              onCancel={() => {
                setEditingApplication(null);
                setFormOpen(false);
              }}
              onSave={handleSave}
            />
          )}
          {loading ? (
            <div className="loading">Loading applications...</div>
          ) : (
            <ApplicationTable
              applications={filteredApplications}
              countryOptions={countryOptions}
              customFields={customFields}
              emptyMessage={
                applications.length > 0 && hasActiveFilters
                  ? "No applications match these filters."
                  : "No applications yet."
              }
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
        </section>
        <FilterSidebar
          activeFilterCount={activeFilterCount}
          countryOptions={countryOptions}
          customFields={customFields}
          filters={filterDrafts}
          companies={companies}
          onApply={applyFilters}
          onChange={updateFilter}
          onClear={clearFilters}
          onOpenCustomFields={() => setSettingsOpen(true)}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
