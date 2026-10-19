const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8007";

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    const cleanText = text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      detail: cleanText || "The server returned an invalid response. Please start the backend and confirm the API URL is correct.",
      raw: text,
    };
  }
}

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Token ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export async function listApplications() {
  const response = await fetch(`${API_BASE_URL}/api/applications/`, { headers: authHeaders() });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to load applications"), { details: data });
  }

  return Array.isArray(data) ? data : data.results;
}

export async function listCompanies() {
  const response = await fetch(`${API_BASE_URL}/api/companies/`, { headers: authHeaders() });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to load companies"), { details: data });
  }
  return Array.isArray(data) ? data : data.results;
}

export async function createCompany(payload) {
  const response = await fetch(`${API_BASE_URL}/api/companies/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to save company"), { details: data });
  }
  return data;
}

export async function updateCompany(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/companies/${id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to update company"), { details: data });
  }
  return data;
}

export async function listCountries() {
  const response = await fetch(`${API_BASE_URL}/api/countries/`);
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to load countries"), { details: data });
  }
  return data;
}

export async function createApplication(payload) {
  const response = await fetch(`${API_BASE_URL}/api/applications/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to save application"), { details: data });
  }
  return data;
}

export async function updateApplication(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/applications/${id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to update application"), { details: data });
  }
  return data;
}

export async function deleteApplication(id) {
  const response = await fetch(`${API_BASE_URL}/api/applications/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to delete application"), { details: data });
  }
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || data.message || "Unable to login"), { details: data });
  }
  return data;
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || data.message || "Unable to create account"), { details: data });
  }
  return data;
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me/`, { headers: authHeaders() });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Not authenticated"), {
      details: data,
      status: response.status,
    });
  }
  return data;
}

export async function listCustomFields() {
  const response = await fetch(`${API_BASE_URL}/api/custom-fields/`, { headers: authHeaders() });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to load custom fields"), { details: data });
  }
  return Array.isArray(data) ? data : data.results;
}

export async function createCustomField(payload) {
  const response = await fetch(`${API_BASE_URL}/api/custom-fields/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to create custom field"), { details: data });
  }
  return data;
}

export async function deleteCustomField(id) {
  const response = await fetch(`${API_BASE_URL}/api/custom-fields/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to delete custom field"), { details: data });
  }
}

export async function fetchTrackingProfile() {
  const response = await fetch(`${API_BASE_URL}/api/profile/`, { headers: authHeaders() });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to load tracking profile"), { details: data });
  }
  return data;
}

export async function updateTrackingProfile(payload) {
  const response = await fetch(`${API_BASE_URL}/api/profile/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.detail || "Unable to save tracking profile"), { details: data });
  }
  return data;
}
