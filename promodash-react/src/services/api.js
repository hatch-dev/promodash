// src/services/api.js
// ─────────────────────────────────────────────────────────────────────────────
//  All HTTP calls to the Express backend live here.
//  Pages/components import functions from this file — never write fetch() calls
//  directly in a page component.
//
//  BASE URL:
//    Dev  → http://localhost:4000   (set in .env.local as VITE_API_URL)
//    Prod → your deployed server URL (set in Render/Railway env vars)
// ─────────────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ── Token helpers ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("pd_token") || "";
}

export function saveToken(token) {
  localStorage.setItem("pd_token", token);
}

export function clearToken() {
  localStorage.removeItem("pd_token");
}

// ── Core request wrapper ──────────────────────────────────────────────────────
async function request(method, path, body = null, isFormData = false) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body
      ? isFormData
        ? body                        // FormData — browser sets Content-Type
        : JSON.stringify(body)        // JSON
      : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
//  Called from: LoginPage.jsx
export const authAPI = {
  // POST /api/auth/login  →  { token, session }
  login: (email, password) =>
    request("POST", "/api/auth/login", { email, password }),

  // GET /api/auth/me  →  { session }   (used to restore session on refresh)
  me: () => request("GET", "/api/auth/me"),
};

// ── Projects ──────────────────────────────────────────────────────────────────
//  Called from: ProjectsPage.jsx, ProjectDetailPage.jsx, DashboardPage.jsx
export const projectsAPI = {
  // GET /api/projects  →  Project[]
  list: () => request("GET", "/api/projects"),

  // GET /api/projects/:id  →  Project
  get: (id) => request("GET", `/api/projects/${id}`),

  // POST /api/projects  →  Project   (admin only)
  create: (data) => request("POST", "/api/projects", data),

  // PUT /api/projects/:id  →  Project   (admin only)
  update: (id, data) => request("PUT", `/api/projects/${id}`, data),

  // DELETE /api/projects/:id   (admin only)
  remove: (id) => request("DELETE", `/api/projects/${id}`),
};

// ── Promotions ────────────────────────────────────────────────────────────────
//  Called from: ProjectDetailPage.jsx, PromotionDetailPage.jsx, DashboardPage.jsx
export const promotionsAPI = {
  // GET /api/promotions?projectId=xxx  →  Promotion[]
  list: (projectId) =>
    request("GET", `/api/promotions${projectId ? `?projectId=${projectId}` : ""}`),

  // GET /api/promotions/:id  →  Promotion
  get: (id) => request("GET", `/api/promotions/${id}`),

  // POST /api/promotions  →  Promotion   (admin only)
  create: (data) => request("POST", "/api/promotions", data),

  // PUT /api/promotions/:id  →  Promotion   (admin only)
  update: (id, data) => request("PUT", `/api/promotions/${id}`, data),

  // PATCH /api/promotions/:id/status  →  Promotion
  //   Used by: Approve / Needs Changes / Mark Published buttons
  updateStatus: (id, status) =>
    request("PATCH", `/api/promotions/${id}/status`, { status }),

  // PATCH /api/promotions/:id/version  →  Promotion
  //   Used by: option chip selection in PromotionDetailPage
  setVersion: (id, currentVersionId) =>
    request("PATCH", `/api/promotions/${id}/version`, { currentVersionId }),

  // DELETE /api/promotions/:id   (admin only)
  remove: (id) => request("DELETE", `/api/promotions/${id}`),
};

// ── Versions (creative file uploads) ─────────────────────────────────────────
//  Called from: Modal.jsx (version type), PromotionDetailPage.jsx
export const versionsAPI = {
  // GET /api/versions?promotionId=xxx  →  Version[]
  list: (promotionId) =>
    request("GET", `/api/versions?promotionId=${promotionId}`),

  // POST /api/versions  →  Version[]
  //   Accepts multipart/form-data with fields:
  //     promotionId, label, notes, files (multiple)
  //   Returns an array of created version records.
  //   The url field in each record is a relative path like /uploads/filename.jpg
  //   which the frontend prefixes with BASE to display the image.
  upload: (formData) => request("POST", "/api/versions/upload", formData, true),

  // DELETE /api/versions/:id   (admin only)
  remove: (id) => request("DELETE", `/api/versions/${id}`),
};

// ── Comments ──────────────────────────────────────────────────────────────────
//  Called from: PromotionDetailPage.jsx (feedback panel)
export const commentsAPI = {
  // GET /api/comments?promotionId=xxx  →  Comment[]
  list: (promotionId) =>
    request("GET", `/api/comments?promotionId=${promotionId}`),

  // POST /api/comments  →  Comment
  create: (promotionId, body) =>
    request("POST", "/api/comments", { promotionId, body }),

  // DELETE /api/comments/:id   (admin only)
  remove: (id) => request("DELETE", `/api/comments/${id}`),
};

// ── Clients ───────────────────────────────────────────────────────────────────
//  Called from: ClientsPage.jsx
export const clientsAPI = {
  list: () => request("GET", "/api/clients"),
  create: (data) => request("POST", "/api/clients", data),
  update: (id, data) => request("PUT", `/api/clients/${id}`, data),
  remove: (id) => request("DELETE", `/api/clients/${id}`),
};

// ── Promotion Types ───────────────────────────────────────────────────────────
//  Called from: TypesPage.jsx
export const typesAPI = {
  list: () => request("GET", "/api/types"),
  create: (data) => request("POST", "/api/types", data),
  update: (id, data) => request("PUT", `/api/types/${id}`, data),
  remove: (id) => request("DELETE", `/api/types/${id}`),
};

// ── Image URL helper ──────────────────────────────────────────────────────────
//  IMPORTANT for deployment:
//  version.url is stored in the DB as a relative path: "/uploads/abc123.jpg"
//  This function converts it to an absolute URL for <img src>.
//
//  In development:  http://localhost:4000/uploads/abc123.jpg
//  In production:   https://your-server.render.com/uploads/abc123.jpg
//
//  The VITE_API_URL env var is the only thing that changes between environments.
//  Your image paths in the database never need to change.
export function imageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;   // already absolute
  return `${BASE}${path}`;
}