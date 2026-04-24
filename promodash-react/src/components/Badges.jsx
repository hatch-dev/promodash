import { useApp } from "../context/AppContext";
import { getTypeName } from "../utils/helpers";

export function StatusBadge({ status }) {
  const { statusConfig } = useApp();
  const config = statusConfig[status] || statusConfig.Draft;
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

export function TypeBadge({ type }) {
  const { state } = useApp();
  return <span className="badge type">{getTypeName(type, state.promotionTypes)}</span>;
}
