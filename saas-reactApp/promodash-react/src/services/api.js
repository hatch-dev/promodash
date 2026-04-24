// src/services/api.js
// ─────────────────────────────────────────────────────────────────────────────
//  All HTTP calls to the backend live here.
//  Pages import from this file — never write fetch() directly in a component.
//
//  IMAGE / FILE URLs
//  -----------------
//  The DB stores RELATIVE paths: /uploads/<uuid>.jpg
//  imageUrl() converts them to full URLs at runtime using VITE_API_URL:
//
//    Dev:  http://localhost:4000/uploads/<uuid>.jpg
//    Prod: https://your-api.onrender.com/uploads/<uuid>.jpg
//
//  This means:
//  • DB never needs to change when you deploy to a new domain.
//  • Only VITE_API_URL in your hosting dashboard changes.
//  • Cloudinary URLs (starting with http) pass through unchanged.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ── Token helpers ─────────────────────────────────────────────────────────────
export function saveToken(token) {
  localStorage.setItem("pd_token", token);
}

export function clearToken() {
  localStorage.removeItem("pd_token");
}

function getToken() {
  return localStorage.getItem("pd_token") || "";
}

// ── Image / file URL ──────────────────────────────────────────────────────────
// Usage: <img src={imageUrl(version.url)} />
// Safe for: relative paths (/uploads/xxx.jpg) AND absolute Cloudinary URLs
export function imageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;   // Cloudinary or external — pass through
  return `${BASE}${path}`;                    // Relative → full URL
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function req(method, path, body, isFormData = false) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => req("POST", "/api/auth/login", { email, password }),
  me:    ()               => req("GET",  "/api/auth/me"),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsAPI = {
  list:   ()         => req("GET",    "/api/projects"),
  get:    (id)       => req("GET",    `/api/projects/${id}`),
  create: (data)     => req("POST",   "/api/projects", data),
  update: (id, data) => req("PUT",    `/api/projects/${id}`, data),
  remove: (id)       => req("DELETE", `/api/projects/${id}`),
};

// ── Promotions ────────────────────────────────────────────────────────────────
export const promotionsAPI = {
  list:          (projectId)             => req("GET",   `/api/promotions${projectId ? `?projectId=${projectId}` : ""}`),
  get:           (id)                    => req("GET",   `/api/promotions/${id}`),
  create:        (data)                  => req("POST",  "/api/promotions", data),
  update:        (id, data)              => req("PUT",   `/api/promotions/${id}`, data),
  updateStatus:  (id, status)            => req("PATCH", `/api/promotions/${id}/status`, { status }),
  setVersion:    (id, currentVersionId)  => req("PATCH", `/api/promotions/${id}/version`, { currentVersionId }),
  remove:        (id)                    => req("DELETE",`/api/promotions/${id}`),
};

// ── Versions ──────────────────────────────────────────────────────────────────
export const versionsAPI = {
  list:   (promotionId) => req("GET",    `/api/versions?promotionId=${promotionId}`),
  upload: (formData)    => req("POST",   "/api/versions/upload", formData, true),   // multipart
  remove: (id)          => req("DELETE", `/api/versions/${id}`),
};

// ── Comments ──────────────────────────────────────────────────────────────────
export const commentsAPI = {
  list:   (promotionId) => req("GET",    `/api/comments?promotionId=${promotionId}`),
  create: (promotionId, body) => req("POST", "/api/comments", { promotionId, body }),
  remove: (id)          => req("DELETE", `/api/comments/${id}`),
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientsAPI = {
  list:   ()         => req("GET",    "/api/clients"),
  create: (data)     => req("POST",   "/api/clients", data),
  update: (id, data) => req("PUT",    `/api/clients/${id}`, data),
  remove: (id)       => req("DELETE", `/api/clients/${id}`),
};

// ── Promotion Types ───────────────────────────────────────────────────────────
export const typesAPI = {
  list:   ()         => req("GET",    "/api/types"),
  create: (data)     => req("POST",   "/api/types", data),
  update: (id, data) => req("PUT",    `/api/types/${id}`, data),
  remove: (id)       => req("DELETE", `/api/types/${id}`),
};
