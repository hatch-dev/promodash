// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  AppContext — API-connected version
//  All data is fetched from the Express/Prisma backend via src/services/api.js
//  The only thing kept in localStorage is the JWT token (pd_token).
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  authAPI, projectsAPI, promotionsAPI, versionsAPI,
  commentsAPI, clientsAPI, typesAPI, saveToken, clearToken,
} from "../services/api";

export const statusConfig = {
  Draft:               { className: "draft",     label: "Draft" },
  "Pending Approval":  { className: "pending",   label: "Pending Approval" },
  Approved:            { className: "approved",  label: "Approved" },
  "Revision Required": { className: "revision",  label: "Revision Required" },
  Published:           { className: "published", label: "Published" },
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session,        setSession]        = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [projects,       setProjects]       = useState([]);
  const [promotions,     setPromotions]     = useState([]);
  const [versions,       setVersions]       = useState([]);
  const [comments,       setComments]       = useState([]);
  const [clients,        setClients]        = useState([]);
  const [promotionTypes, setPromotionTypes] = useState([]);
  const [selectedProjectId,     setSelectedProjectId]     = useState(null);
  const [selectedPromotionId,   setSelectedPromotionId]   = useState(null);
  const [calendarProjectFilter, setCalendarProjectFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("pd_token");
    if (!token) { setSessionLoading(false); return; }
    authAPI.me()
      .then(({ session }) => setSession(session))
      .catch(() => clearToken())
      .finally(() => setSessionLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, session } = await authAPI.login(email, password);
    saveToken(token);
    setSession(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
    setProjects([]); setPromotions([]); setVersions([]);
    setComments([]); setClients([]); setPromotionTypes([]);
    setSelectedProjectId(null); setSelectedPromotionId(null);
  }, []);

  const loadProjects = useCallback(async () => {
    const data = await projectsAPI.list();
    setProjects(data);
    return data;
  }, []);

  const loadPromotions = useCallback(async (projectId) => {
    const data = await promotionsAPI.list(projectId);
    setPromotions(prev => {
      if (projectId) {
        return [...prev.filter(p => p.projectId !== projectId), ...data];
      }
      return data;
    });
    return data;
  }, []);

  const loadVersions = useCallback(async (promotionId) => {
    if (!promotionId) return [];
    const data = await versionsAPI.list(promotionId);
    setVersions(prev => [...prev.filter(v => v.promotionId !== promotionId), ...data]);
    return data;
  }, []);

  const loadComments = useCallback(async (promotionId) => {
    if (!promotionId) return [];
    const data = await commentsAPI.list(promotionId);
    setComments(prev => [...prev.filter(c => c.promotionId !== promotionId), ...data]);
    return data;
  }, []);

  const loadClients = useCallback(async () => {
    const data = await clientsAPI.list();
    setClients(data);
    return data;
  }, []);

  const loadTypes = useCallback(async () => {
    const data = await typesAPI.list();
    setPromotionTypes(data);
    return data;
  }, []);

  // Project mutations
  const createProject = useCallback(async (data) => {
    const project = await projectsAPI.create(data);
    setProjects(prev => [project, ...prev]);
    return project;
  }, []);

  const updateProject = useCallback(async (id, data) => {
    const project = await projectsAPI.update(id, data);
    setProjects(prev => prev.map(p => p.id === id ? project : p));
    return project;
  }, []);

  const deleteProject = useCallback(async (id) => {
    await projectsAPI.remove(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setPromotions(prev => prev.filter(p => p.projectId !== id));
  }, []);

  // Promotion mutations
  const createPromotion = useCallback(async (data) => {
    const promo = await promotionsAPI.create(data);
    setPromotions(prev => [...prev, promo]);
    return promo;
  }, []);

  const updatePromotion = useCallback(async (id, data) => {
    const promo = await promotionsAPI.update(id, data);
    setPromotions(prev => prev.map(p => p.id === id ? promo : p));
    return promo;
  }, []);

  const updatePromotionStatus = useCallback(async (id, status) => {
    const promo = await promotionsAPI.updateStatus(id, status);
    setPromotions(prev => prev.map(p => p.id === id ? promo : p));
    return promo;
  }, []);

  const setPromotionVersion = useCallback(async (id, currentVersionId) => {
    const promo = await promotionsAPI.setVersion(id, currentVersionId);
    setPromotions(prev => prev.map(p => p.id === id ? promo : p));
    return promo;
  }, []);

  const deletePromotion = useCallback(async (id) => {
    await promotionsAPI.remove(id);
    setPromotions(prev => prev.filter(p => p.id !== id));
    setVersions(prev => prev.filter(v => v.promotionId !== id));
    setComments(prev => prev.filter(c => c.promotionId !== id));
  }, []);

  // Version mutations
  const uploadVersions = useCallback(async (formData) => {
    const created = await versionsAPI.upload(formData);
    setVersions(prev => [...prev, ...created]);
    if (created[0]) {
      setPromotions(prev => prev.map(p =>
        p.id === created[0].promotionId
          ? { ...p, currentVersionId: created[0].id, status: "Pending Approval" }
          : p
      ));
    }
    return created;
  }, []);

  const deleteVersion = useCallback(async (id) => {
    await versionsAPI.remove(id);
    setVersions(prev => prev.filter(v => v.id !== id));
  }, []);

  // Comment mutations
  const createComment = useCallback(async (promotionId, body) => {
    const comment = await commentsAPI.create(promotionId, body);
    setComments(prev => [...prev, comment]);
    return comment;
  }, []);

  const deleteComment = useCallback(async (id) => {
    await commentsAPI.remove(id);
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  // Client mutations
  const createClient = useCallback(async (data) => {
    const client = await clientsAPI.create(data);
    setClients(prev => [...prev, client]);
    return client;
  }, []);

  const updateClient = useCallback(async (id, data) => {
    const client = await clientsAPI.update(id, data);
    setClients(prev => prev.map(c => c.id === id ? client : c));
    return client;
  }, []);

  const deleteClient = useCallback(async (id) => {
    await clientsAPI.remove(id);
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  // Type mutations
  const createType = useCallback(async (data) => {
    const type = await typesAPI.create(data);
    setPromotionTypes(prev => [...prev, type]);
    return type;
  }, []);

  const updateType = useCallback(async (id, data) => {
    const type = await typesAPI.update(id, data);
    setPromotionTypes(prev => prev.map(t => t.id === id ? type : t));
    return type;
  }, []);

  const deleteType = useCallback(async (id) => {
    await typesAPI.remove(id);
    setPromotionTypes(prev => prev.filter(t => t.id !== id));
  }, []);

  // setState shim — lets pages call setState({ key: val }) for UI-only state
  const setState = useCallback((patch) => {
    const p = typeof patch === "function" ? patch({}) : patch;
    if ("selectedProjectId"     in p) setSelectedProjectId(p.selectedProjectId);
    if ("selectedPromotionId"   in p) setSelectedPromotionId(p.selectedPromotionId);
    if ("calendarProjectFilter" in p) setCalendarProjectFilter(p.calendarProjectFilter);
    if ("promotionTypes"        in p) setPromotionTypes(p.promotionTypes);
    if ("clients"               in p) setClients(p.clients);
    if ("projects"              in p) setProjects(p.projects);
    if ("promotions"            in p) setPromotions(p.promotions);
    if ("versions"              in p) setVersions(p.versions);
    if ("comments"              in p) setComments(p.comments);
  }, []);

  const state = {
    session, sessionLoading,
    projects, promotions, versions, comments, clients, promotionTypes,
    selectedProjectId, selectedPromotionId, calendarProjectFilter,
  };

  return (
    <AppContext.Provider value={{
      state, setState, statusConfig,
      login, logout,
      loadProjects, loadPromotions, loadVersions, loadComments, loadClients, loadTypes,
      createProject, updateProject, deleteProject,
      createPromotion, updatePromotion, updatePromotionStatus, setPromotionVersion, deletePromotion,
      uploadVersions, deleteVersion,
      createComment, deleteComment,
      createClient, updateClient, deleteClient,
      createType, updateType, deleteType,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
