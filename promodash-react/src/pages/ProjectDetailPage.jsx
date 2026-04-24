import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import PromotionCard from "../components/PromotionCard";
import Modal from "../components/Modal";
import Icon from "../components/Icon";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { state, setState } = useApp();
  const { getProject, getProjectPromotions } = useSelectors();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

  const project = getProject(projectId);
  const promotions = getProjectPromotions(projectId);

  const handleDeletePromotion = (promotionId) => {
    const promo = state.promotions.find((p) => p.id === promotionId);
    if (!promo || !window.confirm(`Delete promotion "${promo.title}"?`)) return;
    const remaining = state.promotions.filter((p) => p.id !== promotionId);
    setState({
      promotions: remaining,
      versions: state.versions.filter((v) => v.promotionId !== promotionId),
      comments: state.comments.filter((c) => c.promotionId !== promotionId),
    });
  };

  if (!project) return <div className="empty">Project not found.</div>;

  return (
    <>
      <section className="page-head">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.client} · {project.description}</p>
        </div>
        <div className="toolbar">
          {state.session?.role === "admin" && (
            <>
              <button className="btn" onClick={() => setModal({ type: "promotion" })}>
                <Icon name="plus" /> Promotion
              </button>
              <button className="btn secondary" onClick={() => setModal({ type: "project", context: { id: project.id } })}>
                <Icon name="edit" /> Edit
              </button>
            </>
          )}
          <button className="btn secondary" onClick={() => navigate("/projects")}>Projects</button>
        </div>
      </section>

      <div className="tabs">
        <button className="active" type="button">Promotions</button>
        <button type="button" onClick={() => navigate("/calendar")}>Calendar</button>
      </div>

      <div className="list">
        {promotions.length
          ? promotions.map((promo) => (
              <PromotionCard
                key={promo.id}
                promo={promo}
                onEdit={(id) => setModal({ type: "promotion", context: { id } })}
                onDelete={handleDeletePromotion}
              />
            ))
          : <div className="empty">No promotions in this project.</div>}
      </div>

      {modal && (
        <Modal
          type={modal.type}
          context={modal.context || {}}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
