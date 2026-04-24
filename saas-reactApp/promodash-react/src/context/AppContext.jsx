import { createContext, useContext, useState, useCallback } from "react";

const STORAGE_KEY = "promodash-state-v1";

const statusConfig = {
  Draft: { className: "draft", label: "Draft" },
  "Pending Approval": { className: "pending", label: "Pending Approval" },
  Approved: { className: "approved", label: "Approved" },
  "Revision Required": { className: "revision", label: "Revision Required" },
  Published: { className: "published", label: "Published" },
};

const seedState = {
  session: null,
  selectedProjectId: "project-cognesense",
  selectedPromotionId: "promo-ai-launch",
  calendarProjectFilter: "all",
  promotionTypes: [
    { id: "social", name: "Social Media Campaign", description: "Banners, captions, and post creatives for social profiles." },
    { id: "email", name: "Email Campaign", description: "PDF or image previews for email blast approvals." },
  ],
  clients: [
    { id: "client-cognesense", name: "Cognesense Client", email: "client@cognesense.com", company: "Cognesense" },
    { id: "client-northstar", name: "Northstar Marketing", email: "marketing@northstar.example", company: "Northstar Labs" },
  ],
  projects: [
    {
      id: "project-cognesense",
      name: "Cognesense Projects",
      client: "Cognesense",
      owner: "Growth Team",
      description: "Marketing approvals for social media and email campaigns.",
      clientUsers: ["client@cognesense.com"],
      createdAt: "2026-04-10T09:30:00.000Z",
    },
    {
      id: "project-northstar",
      name: "Northstar Product Rollout",
      client: "Northstar Labs",
      owner: "Growth Team",
      description: "Launch promotions and lifecycle email assets.",
      clientUsers: ["marketing@northstar.example"],
      createdAt: "2026-04-12T11:00:00.000Z",
    },
  ],
  promotions: [
    {
      id: "promo-ai-launch",
      projectId: "project-cognesense",
      title: "AI Workflow Launch",
      type: "social",
      scheduledDate: "2026-04-25",
      status: "Pending Approval",
      description: "LinkedIn launch campaign for the new workflow automation feature.",
      subjectLine: "",
      contactList: "",
      clientUsers: ["client@cognesense.com"],
      captions: [
        "Cognesense teams can now review complex project signals in one streamlined approval workspace.",
        "Launch faster with one place for context, comments, versions, and final sign-off.",
      ],
      currentVersionId: "ver-ai-launch-2",
      createdAt: "2026-04-17T10:30:00.000Z",
    },
    {
      id: "promo-newsletter",
      projectId: "project-cognesense",
      title: "April Product Newsletter",
      type: "email",
      scheduledDate: "2026-04-28",
      status: "Revision Required",
      description: "Monthly product update email with customer story and feature highlights.",
      subjectLine: "April product updates from Cognesense",
      contactList: "Cognesense newsletter subscribers",
      clientUsers: ["client@cognesense.com"],
      captions: [],
      currentVersionId: "ver-newsletter-1",
      createdAt: "2026-04-18T12:15:00.000Z",
    },
    {
      id: "promo-webinar",
      projectId: "project-cognesense",
      title: "Customer Webinar Reminder",
      type: "social",
      scheduledDate: "2026-05-02",
      status: "Draft",
      description: "Reminder banner and short caption set for the upcoming webinar.",
      subjectLine: "",
      contactList: "",
      clientUsers: ["client@cognesense.com"],
      captions: ["Reserve your seat for Cognesense Live: practical strategies for faster project approvals."],
      currentVersionId: "ver-webinar-1",
      createdAt: "2026-04-19T08:30:00.000Z",
    },
    {
      id: "promo-northstar-drip",
      projectId: "project-northstar",
      title: "Beta Invite Drip",
      type: "email",
      scheduledDate: "2026-04-30",
      status: "Approved",
      description: "Three-part beta invitation sequence.",
      subjectLine: "Your Northstar beta invitation",
      contactList: "Northstar beta waitlist",
      clientUsers: ["marketing@northstar.example"],
      captions: [],
      currentVersionId: "ver-northstar-1",
      createdAt: "2026-04-14T15:45:00.000Z",
    },
  ],
  versions: [
    {
      id: "ver-ai-launch-1",
      promotionId: "promo-ai-launch",
      version: 1,
      label: "Initial banner concept",
      fileName: "launch-banner-v1.png",
      fileType: "image",
      uploadedBy: "Admin",
      uploadedAt: "2026-04-17T10:45:00.000Z",
      url: "",
      notes: "First layout with launch headline.",
    },
    {
      id: "ver-ai-launch-2",
      promotionId: "promo-ai-launch",
      version: 2,
      label: "Updated CTA",
      fileName: "launch-banner-v2.png",
      fileType: "image",
      uploadedBy: "Admin",
      uploadedAt: "2026-04-19T16:10:00.000Z",
      url: "",
      notes: "Adjusted call to action and typography.",
    },
    {
      id: "ver-newsletter-1",
      promotionId: "promo-newsletter",
      version: 1,
      label: "PDF email preview",
      fileName: "april-newsletter-preview.pdf",
      fileType: "pdf",
      uploadedBy: "Admin",
      uploadedAt: "2026-04-18T12:40:00.000Z",
      url: "",
      notes: "Email design exported as PDF.",
    },
    {
      id: "ver-webinar-1",
      promotionId: "promo-webinar",
      version: 1,
      label: "Draft creative",
      fileName: "webinar-reminder.png",
      fileType: "image",
      uploadedBy: "Admin",
      uploadedAt: "2026-04-19T09:00:00.000Z",
      url: "",
      notes: "Draft for internal review.",
    },
    {
      id: "ver-northstar-1",
      promotionId: "promo-northstar-drip",
      version: 1,
      label: "Approved PDF",
      fileName: "beta-invite.pdf",
      fileType: "pdf",
      uploadedBy: "Admin",
      uploadedAt: "2026-04-15T11:00:00.000Z",
      url: "",
      notes: "Client approved.",
    },
  ],
  comments: [
    {
      id: "comment-1",
      promotionId: "promo-ai-launch",
      author: "Client",
      role: "client",
      body: "The layout works. Can we make the CTA feel more action-oriented?",
      createdAt: "2026-04-19T09:22:00.000Z",
    },
    {
      id: "comment-2",
      promotionId: "promo-ai-launch",
      author: "Admin",
      role: "admin",
      body: "Updated in version 2 with a stronger CTA and cleaner hierarchy.",
      createdAt: "2026-04-19T16:12:00.000Z",
    },
    {
      id: "comment-3",
      promotionId: "promo-newsletter",
      author: "Client",
      role: "client",
      body: "Please move the customer quote higher and shorten the intro paragraph.",
      createdAt: "2026-04-20T13:04:00.000Z",
    },
  ],
};

function normalizeState(nextState) {
  const normalized = { ...structuredClone(seedState), ...nextState };
  normalized.promotionTypes = normalized.promotionTypes?.length ? normalized.promotionTypes : structuredClone(seedState.promotionTypes);
  normalized.clients = normalized.clients?.length ? normalized.clients : structuredClone(seedState.clients);
  const inheritedProjectClients = new Map(normalized.projects.map((p) => [p.id, new Set(p.clientUsers || [])]));
  normalized.promotions.forEach((promo) => {
    (promo.clientUsers || []).forEach((email) => {
      if (!inheritedProjectClients.has(promo.projectId)) inheritedProjectClients.set(promo.projectId, new Set());
      inheritedProjectClients.get(promo.projectId).add(email);
    });
  });
  normalized.projects = normalized.projects.map((p) => ({ ...p, clientUsers: Array.from(inheritedProjectClients.get(p.id) || []) }));
  normalized.promotions = normalized.promotions.map((promo) => ({
    ...promo,
    subjectLine: promo.subjectLine || "",
    contactList: promo.contactList || "",
    currentVersionId: promo.currentVersionId || normalized.versions.find((v) => v.promotionId === promo.id)?.id || null,
  }));
  return normalized;
}

function loadInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeState(structuredClone(seedState));
  try {
    return normalizeState({ ...structuredClone(seedState), ...JSON.parse(saved) });
  } catch {
    return normalizeState(structuredClone(seedState));
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setStateRaw] = useState(loadInitialState);

  const setState = useCallback((patch) => {
    setStateRaw((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return <AppContext.Provider value={{ state, setState, statusConfig, seedState }}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

export { statusConfig };
