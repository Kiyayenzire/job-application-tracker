import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { LogOut, Plus, RefreshCw } from "lucide-react";

import {
  createCustomField,
  createApplication,
  createCompany,
  deleteCustomField,
  deleteApplication,
  fetchCurrentUser,
  listApplications,
  listCompanies,
  listCustomFields,
  listCountries,
  updateApplication,
  updateCompany,
} from "./api";
import { ApplicationForm } from "./components/ApplicationForm";
import { ApplicationTable } from "./components/ApplicationTable";
import { AssessmentPage } from "./components/AssessmentPage";
import { CompanyForm } from "./components/CompanyForm";
import { CompanyTable } from "./components/CompanyTable";
import { CreateAccountPage } from "./components/CreateAccountPage";
import { CVPage } from "./components/CVPage";
import { CustomFieldManager } from "./components/CustomFieldManager";
import { HelpSupportPage } from "./components/HelpSupportPage";
import { LoginPage } from "./components/LoginPage";
import { ProfilePage } from "./components/ProfilePage";
import { ThemeToggle } from "./components/ThemeToggle";
import "./styles.css";

function App() {
  const navigate = useNavigate();
  const [applications, setApplications] = React.useState([]);
  const [companies, setCompanies] = React.useState([]);
  const [countryOptions, setCountryOptions] = React.useState([]);
  const [customFields, setCustomFields] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingApplication, setEditingApplication] = React.useState(null);
  const [companyFormOpen, setCompanyFormOpen] = React.useState(false);
  const [customizationScope, setCustomizationScope] = React.useState("");
  const [editingCompany, setEditingCompany] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [authCheckAttempt, setAuthCheckAttempt] = React.useState(0);
  const [authError, setAuthError] = React.useState("");
  const [theme, setTheme] = React.useState(() => (
    localStorage.getItem("oasTheme") === "dark" ? "dark" : "light"
  ));
  const applicationCustomFields = customFields.filter(
    (field) => !field.scope || field.scope === "application",
  );
  const companyCustomFields = customFields.filter((field) => field.scope === "company");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextApplications, nextCompanies, nextCustomFields, nextCountryOptions] = await Promise.all([
        listApplications(),
        listCompanies(),
        listCustomFields(),
        listCountries(),
      ]);
      setApplications(nextApplications);
      setCompanies(nextCompanies);
      setCustomFields(nextCustomFields);
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

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";
      localStorage.setItem("oasTheme", nextTheme);
      return nextTheme;
    });
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

  async function handleCreateCustomField(payload) {
    const created = await createCustomField(payload);
    setCustomFields((current) => [...current, created]);
  }

  async function handleDeleteCustomField(field) {
    await deleteCustomField(field.id);
    setCustomFields((current) => current.filter((item) => item.id !== field.id));
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

  function handleAuthenticated(authenticatedUser) {
    setUser(authenticatedUser);
    navigate("/applications", { replace: true });
  }

  if (!authChecked) {
    return (
      <main className="shell app-shell" data-theme={theme}>
        <AppHeader theme={theme} onThemeToggle={toggleTheme} />
        <div className="loading">Checking session...</div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="shell app-shell" data-theme={theme}>
        <AppHeader theme={theme} onThemeToggle={toggleTheme} />
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
      <main className="shell app-shell" data-theme={theme}>
        <AppHeader theme={theme} onThemeToggle={toggleTheme} />
        <section className="auth-shell">
          <Routes>
            <Route element={<LoginPage onAuthenticated={handleAuthenticated} />} path="/login" />
            <Route element={<CreateAccountPage onAuthenticated={handleAuthenticated} />} path="/create-account" />
            <Route element={<Navigate replace to="/login" />} path="*" />
          </Routes>
        </section>
      </main>
    );
  }

  return (
    <main className="shell app-shell" data-theme={theme}>
      <AppHeader
        onLogout={() => {
          localStorage.removeItem("authToken");
          setUser(null);
          navigate("/login", { replace: true });
        }}
        onRefresh={load}
        onThemeToggle={toggleTheme}
        theme={theme}
        user={user}
      />

      {error && <div className="error">{error}</div>}

      <Routes>
        <Route path="/" element={<Navigate replace to="/applications" />} />
        <Route
          path="/applications"
          element={(
            <section aria-label="Application list" className="application-results">
              <div className="application-list-toolbar">
                <div>
                  <h2>Job applications</h2>
                  <p className="muted">Track each role, application status, and next step in one place.</p>
                </div>
                <div className="actions">
                  <button
                    className="ghost-button"
                    onClick={() => setCustomizationScope((current) => current === "application" ? "" : "application")}
                    type="button"
                  >
                    Customize application fields
                  </button>
                  <button
                    className="primary-button"
                    disabled={loading}
                    onClick={() => {
                      setEditingApplication(null);
                      setFormOpen(true);
                    }}
                    type="button"
                  >
                    <Plus size={18} />
                    Add application
                  </button>
                </div>
              </div>
              {customizationScope === "application" && (
                <CustomFieldManager
                  fields={applicationCustomFields}
                  onCreateField={handleCreateCustomField}
                  onDeleteField={handleDeleteCustomField}
                  scope="application"
                />
              )}
              {formOpen && (
                <ApplicationForm
                  companies={companies}
                  countryOptions={countryOptions}
                  customFields={applicationCustomFields}
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
                  applications={applications}
                  countryOptions={countryOptions}
                  customFields={applicationCustomFields}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              )}
            </section>
          )}
        />
        <Route
          path="/companies"
          element={(
            <section aria-label="Company list" className="application-results">
              <div className="application-list-toolbar">
                <div>
                  <h2>Company intelligence</h2>
                  <p className="muted">Keep reusable eligibility, relocation, and hiring research separate from applications.</p>
                </div>
                <div className="actions">
                  <button
                    className="ghost-button"
                    onClick={() => setCustomizationScope((current) => current === "company" ? "" : "company")}
                    type="button"
                  >
                    Customize company fields
                  </button>
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
                    Add company research
                  </button>
                </div>
              </div>
              {customizationScope === "company" && (
                <CustomFieldManager
                  fields={companyCustomFields}
                  onCreateField={handleCreateCustomField}
                  onDeleteField={handleDeleteCustomField}
                  scope="company"
                />
              )}
              {companyFormOpen && (
                <CompanyForm
                  company={editingCompany}
                  countryOptions={countryOptions}
                  customFields={companyCustomFields}
                  onCancel={() => {
                    setEditingCompany(null);
                    setCompanyFormOpen(false);
                  }}
                  onSave={handleSaveCompany}
                />
              )}
              {loading ? (
                <div className="loading">Loading company research...</div>
              ) : (
                <CompanyTable
                  companies={companies}
                  countryOptions={countryOptions}
                  customFields={companyCustomFields}
                  emptyMessage="No company research yet. Add it when you want to track a company's hiring strategy."
                  onEdit={(company) => {
                    setEditingCompany(company);
                    setCompanyFormOpen(true);
                  }}
                />
              )}
            </section>
          )}
        />
        <Route
          path="/assessments"
          element={<AssessmentPage applications={applications} />}
        />
        <Route
          path="/profile"
          element={<ProfilePage username={user.username} />}
        />
        <Route
          path="/cv"
          element={<CVPage applications={applications} />}
        />
        <Route path="/help" element={<HelpSupportPage />} />
        <Route path="*" element={<Navigate replace to="/applications" />} />
      </Routes>
    </main>
  );
}

function AppHeader({
  onLogout,
  onRefresh,
  onThemeToggle,
  theme,
  user,
}) {
  return (
    <header className="topbar">
      <Link className="brand-link" to={user ? "/applications" : "/login"}>
        <h1>Job Application Tracker</h1>
      </Link>
      <nav aria-label="Main navigation" className="main-navigation">
        {user ? (
          <>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/applications">
              Applications
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/companies">
              Companies
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/assessments">
              Assessments
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/profile">
              Profile
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/cv">
              CV
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/help">
              Help &amp; Support
            </NavLink>
          </>
        ) : (
          <>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/login">
              Login
            </NavLink>
            <NavLink className={({ isActive }) => isActive ? "active" : ""} to="/create-account">
              Create account
            </NavLink>
          </>
        )}
      </nav>
      <div className="actions">
        <ThemeToggle onToggle={onThemeToggle} theme={theme} />
        {user && (
          <>
            <button className="icon-button" onClick={onRefresh} title="Refresh applications" type="button">
              <RefreshCw size={18} />
            </button>
            <button className="ghost-button" onClick={onLogout} type="button">
              <LogOut size={18} />
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
