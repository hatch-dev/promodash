import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { formatDate, formatDateTime } from "../utils/helpers";
import { StatusBadge, TypeBadge } from "../components/Badges";
import Modal from "../components/Modal";
import PromotionCard from "../components/PromotionCard";
import Icon from "../components/Icon";

function TimelineItem({ promo, onEdit, onDelete }) {
  const date = new Date(`${promo.scheduledDate}T00:00:00`);
  return (
    <div className="timeline-item">
      <div className="date-tile">
        <small>{date.toLocaleString("en-IN", { month: "short" })}</small>
        <strong>{date.getDate()}</strong>
      </div>
      <PromotionCard promo={promo} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

export default function DashboardPage() {
  const { state, setState } = useApp();
  const { getVisibleProjects, getProjectPromotions } = useSelectors();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

  const projects = getVisibleProjects();
  const promotions = getProjectPromotions(null);
  const pending = promotions.filter((p) => p.status === "Pending Approval").length;
  const revisions = promotions.filter((p) => p.status === "Revision Required").length;
  const approved = promotions.filter((p) => p.status === "Approved").length;
  const published = promotions.filter((p) => p.status === "Published").length;
  const upcoming = promotions.slice(0, 5);
  const recentFeedback = state.comments
    .filter((c) => promotions.some((p) => p.id === c.promotionId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

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

  return (
    <>
      <section className="page-head">
        <div>
          <h1>{state.session?.role === "admin" ? "Admin Dashboard" : "Client Dashboard"}</h1>
          <p className="muted">
            {state.session?.role === "admin"
              ? "All projects, pending approvals, feedback, and upcoming promotions."
              : "Your assigned projects, approval queue, and promotion timeline."}
          </p>
        </div>
        {state.session?.role === "admin" && (
          <button className="btn" onClick={() => setModal({ type: "project" })}>
            <Icon name="plus" /> Project
          </button>
        )}
      </section>

      <section className="stats-grid">
        <div className="stat-card"><span>Projects</span><strong>{projects.length}</strong></div>
        <div className="stat-card"><span>Pending</span><strong>{pending}</strong></div>
        <div className="stat-card"><span>Revisions</span><strong>{revisions}</strong></div>
        <div className="stat-card"><span>Approved</span><strong>{approved}</strong></div>
        <div className="stat-card"><span>Published</span><strong>{published}</strong></div>
      </section>

      <section className="content-grid">
        <div>
          <div className="section-title">
            <h2>Upcoming Promotions</h2>
            <p className="muted">Sorted by scheduled date.</p>
          </div>
          <div className="timeline" style={{ marginTop: "14px" }}>
            {upcoming.length
              ? upcoming.map((promo) => (
                  <TimelineItem
                    key={promo.id}
                    promo={promo}
                    onEdit={(id) => setModal({ type: "promotion", context: { id } })}
                    onDelete={handleDeletePromotion}
                  />
                ))
              : <div className="empty">No upcoming promotions.</div>}
          </div>
        </div>
        <aside className="panel">
          <h2>Recent Feedback</h2>
          {recentFeedback.length
            ? recentFeedback.map((comment) => {
                const promo = state.promotions.find((p) => p.id === comment.promotionId);
                if (!promo) return null;
                return (
                  <div key={comment.id} className="activity-item">
                    <strong>{comment.author} on {promo.title}</strong>
                    <div className="muted">{comment.body}</div>
                    <small className="muted">{formatDateTime(comment.createdAt)}</small>
                  </div>
                );
              })
            : <div className="empty">No feedback yet.</div>}
        </aside>
      </section>

      {modal && (
        <Modal
          type={modal.type}
          context={modal.context || {}}
          onClose={() => {
            setModal(null);
            if (modal.type === "project") navigate("/projects");
          }}
        />
      )}
    </>
  );
}
