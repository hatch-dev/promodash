import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { assignedClientNames } from "../utils/helpers";
import Modal from "../components/Modal";
import Icon from "../components/Icon";

function ProjectCard({ project, onEdit, onDelete }) {
  const { state } = useApp();
  const { getProjectPromotions } = useSelectors();
  const navigate = useNavigate();
 
  const promotions = getProjectPromotions(project.id);
  const pending = promotions.filter((p) => p.status === "Pending Approval").length;

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h3>{project.name}</h3>
          <p className="muted">{project.description}</p>
          <div className="meta-line">
            <span>{project.client}</span>
            <span>{promotions.length} promotions</span>
            <span>{pending} pending</span>
            <span>{assignedClientNames(project.clientUsers, state.clients)}</span>
          </div>
        </div>
        <div className="toolbar">
          <button className="btn secondary small" onClick={() => navigate(`/projects/${project.id}`)}>Open</button>
          {state.session?.role === "admin" && (
            <>
              <button className="btn secondary small" onClick={() => onEdit(project.id)}><Icon name="edit" /> Edit</button>
              <button className="btn danger small" onClick={() => onDelete(project.id)}>Delete</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const { state, setState } = useApp();
  const { getVisibleProjects } = useSelectors();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const projects = getVisibleProjects();

  const handleDelete = (projectId) => {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project || !window.confirm(`Delete project "${project.name}" and all its promotions?`)) return;
    const promotionIds = state.promotions.filter((p) => p.projectId === projectId).map((p) => p.id);
    const remaining = state.projects.filter((p) => p.id !== projectId);
    setState({
      projects: remaining,
      promotions: state.promotions.filter((p) => p.projectId !== projectId),
      versions: state.versions.filter((v) => !promotionIds.includes(v.promotionId)),
      comments: state.comments.filter((c) => !promotionIds.includes(c.promotionId)),
      selectedProjectId: remaining[0]?.id || null,
    });
  };

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="muted">Client workspaces with promotions, versions, and approval history.</p>
        </div>
        {state.session?.role === "admin" && (
          <button className="btn" onClick={() => setModal({ type: "project" })}>
            <Icon name="plus" /> Project
          </button>
        )}
      </section>
      <div className="list">
        {projects.length
          ? projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={(id) => setModal({ type: "project", context: { id } })}
              onDelete={handleDelete}
            />
          ))
          : <div className="empty">No assigned projects.</div>}
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
