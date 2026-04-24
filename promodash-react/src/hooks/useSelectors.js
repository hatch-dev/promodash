import { useApp } from "../context/AppContext";

export function useSelectors() {
  const { state } = useApp();

  function getVisibleProjects() {
    if (!state.session) return [];
    if (state.session.role === "admin") return state.projects;
    return state.projects.filter((p) => p.clientUsers.includes(state.session.email));
  }

  function getProject(id = state.selectedProjectId) {
    return state.projects.find((p) => p.id === id) || getVisibleProjects()[0] || state.projects[0];
  }

  function getProjectPromotions(projectId = state.selectedProjectId) {
    const visibleIds = new Set(getVisibleProjects().map((p) => p.id));
    return state.promotions
      .filter((promo) => {
        if (projectId && promo.projectId !== projectId) return false;
        if (!visibleIds.has(promo.projectId)) return false;
        return true;
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }

  function getCalendarPromotions() {
    return state.calendarProjectFilter === "all"
      ? getProjectPromotions(null)
      : getProjectPromotions(state.calendarProjectFilter);
  }

  function getPromotion(id = state.selectedPromotionId) {
    return state.promotions.find((p) => p.id === id) || getProjectPromotions()[0] || state.promotions[0];
  }

  function getVersions(promotionId) {
    return state.versions.filter((v) => v.promotionId === promotionId).sort((a, b) => b.version - a.version);
  }

  function getComments(promotionId) {
    return state.comments.filter((c) => c.promotionId === promotionId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  return { getVisibleProjects, getProject, getProjectPromotions, getCalendarPromotions, getPromotion, getVersions, getComments };
}
