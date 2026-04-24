import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { formatDate, assignedClientNames } from "../utils/helpers";
import { StatusBadge, TypeBadge } from "./Badges";
import Icon from "./Icon";

export default function PromotionCard({ promo, onEdit, onDelete }) {
  const { state } = useApp();
  const { getVersions, getProject } = useSelectors();
  const navigate = useNavigate();
  const versions = getVersions(promo.id);
  const project = getProject(promo.projectId);

  const handleOpen = () => {
    navigate(`/promotions/${promo.id}`);
  };

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h3>{promo.title}</h3>
          <div className="meta-line">
            <TypeBadge type={promo.type} />
            <StatusBadge status={promo.status} />
            <span>{formatDate(promo.scheduledDate)}</span>
            <span>{versions.length ? `${versions.length} options` : "No creative"}</span>
            <span>{assignedClientNames(project?.clientUsers || [], state.clients)}</span>
          </div>
          <p className="muted">{promo.description}</p>
        </div>
        <div className="toolbar">
          <button className="btn secondary small" onClick={handleOpen}>Review</button>
          {state.session?.role === "admin" && (
            <>
              <button className="btn secondary small" onClick={() => onEdit?.(promo.id)}><Icon name="edit" /> Edit</button>
              <button className="btn danger small" onClick={() => onDelete?.(promo.id)}>Delete</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
