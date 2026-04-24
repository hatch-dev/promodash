import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { formatDate, formatDateTime, isEmailType } from "../utils/helpers";
import { StatusBadge, TypeBadge } from "../components/Badges";
import { imageUrl } from "../services/api";
import Modal from "../components/Modal";
import Icon from "../components/Icon";

// ─── Creative Preview ─────────────────────────────────────────────────────────
// imageUrl() converts the relative /uploads/xxx.jpg path from DB into
// the full URL using VITE_API_URL — works in dev AND production unchanged.
function CreativePreview({ version, promoType }) {
  if (!version) return <div className="preview"><div className="empty">No creative uploaded.</div></div>;

  if (version.fileType === "image") {
    return (
      <div className="preview">
        <img src={imageUrl(version.url)} alt={version.fileName} />
      </div>
    );
  }
  if (version.fileType === "pdf") {
    return (
      <div className="preview">
        <iframe className="pdf-preview" src={imageUrl(version.url)} title={version.fileName} />
      </div>
    );
  }
  // Fallback SVG placeholder
  return (
    <div className="preview">
      <svg viewBox="0 0 800 480" width="100%" height="100%" role="img" aria-label={version.fileName}>
        <rect width="800" height="480" fill={promoType === "social" ? "#153c34" : "#ffffff"} />
        <rect x="40" y="40" width="720" height="400" rx="8" fill={promoType === "social" ? "#e9f5ef" : "#f2f6fb"} />
        <circle cx="668" cy="122" r="48" fill={promoType === "social" ? "#1f8a70" : "#2d6cdf"} />
        <rect x="92" y="108" width="360" height="28" rx="4" fill="#17202a" />
        <rect x="92" y="156" width="520" height="18" rx="4" fill="#62707f" />
        <rect x="92" y="190" width="470" height="18" rx="4" fill="#8793a0" />
        <rect x="92" y="306" width="178" height="46" rx="8" fill={promoType === "social" ? "#1f8a70" : "#2d6cdf"} />
        <text x="92" y="404" fill="#62707f" fontSize="22" fontFamily="Arial">{version.fileName}</text>
      </svg>
    </div>
  );
}

export default function PromotionDetailPage() {
  const { promotionId } = useParams();
  const navigate = useNavigate();
  const {
    state,
    loadProjects, loadPromotions, loadVersions, loadComments,
    updatePromotionStatus, setPromotionVersion,
    createComment, deleteVersion,
  } = useApp();
  const { getProject, getVersions, getComments } = useSelectors();

  const [modal,   setModal]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const commentRef = useRef(null);

  useEffect(() => {
    Promise.all([
      loadProjects(),
      loadPromotions(),
      loadVersions(promotionId),
      loadComments(promotionId),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [promotionId]);

  const promo = state.promotions.find((p) => p.id === promotionId);

  if (loading) return <div className="empty">Loading promotion…</div>;
  if (!promo)  return <div className="empty">Promotion not found.</div>;

  const project        = getProject(promo.projectId);
  const versions       = getVersions(promo.id);
  const currentVersion = versions.find((v) => v.id === promo.currentVersionId) || versions[0];
  const comments       = getComments(promo.id);
  const emailType      = isEmailType(promo.type, state.promotionTypes);

  // ── Status update ─────────────────────────────────────────────────────────
  const handleStatusUpdate = async (status) => {
    try {
      await updatePromotionStatus(promo.id, status);
      // Add auto-comment
      const body = {
        Approved:           "Approved this promotion.",
        "Revision Required":"Marked this promotion as needing changes.",
        Published:          "Marked this promotion as published.",
        "Pending Approval": "Sent this promotion for approval.",
      }[status];
      if (body) await createComment(promo.id, body);
      await loadComments(promotionId);
    } catch (e) {
      alert(e.message);
    }
  };

  // ── Select version ────────────────────────────────────────────────────────
  const handleSelectVersion = async (versionId) => {
    try {
      await setPromotionVersion(promo.id, versionId);
    } catch (e) {
      alert(e.message);
    }
  };

  // ── Delete version ────────────────────────────────────────────────────────
  const handleDeleteVersion = async (versionId) => {
    if (!window.confirm("Delete this creative version?")) return;
    try {
      await deleteVersion(versionId);
    } catch (e) {
      alert(e.message);
    }
  };

  // ── Add comment ───────────────────────────────────────────────────────────
  const handleAddComment = async (e) => {
    e.preventDefault();
    const body = commentRef.current?.value?.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      await createComment(promo.id, body);
      if (commentRef.current) commentRef.current.value = "";
      await loadComments(promotionId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="page-head">
        <div>
          <h1>{promo.title}</h1>
          <p className="muted">{project?.name} · {formatDate(promo.scheduledDate)}</p>
          <div className="meta-line" style={{ marginTop: "10px" }}>
            <TypeBadge type={promo.type} />
            <StatusBadge status={promo.status} />
          </div>
          {emailType && (
            <div className="meta-line" style={{ marginTop: "8px" }}>
              <span>Subject: {promo.subjectLine || "Not set"}</span>
              <span>List: {promo.contactList || "Not set"}</span>
            </div>
          )}
        </div>
        <div className="toolbar">
          {state.session?.role === "admin" && (
            <>
              <button className="btn secondary" onClick={() => setModal({ type: "version" })}>
                <Icon name="upload" /> Upload
              </button>
              <button className="btn secondary" onClick={() => setModal({ type: "promotion", context: { id: promo.id } })}>
                <Icon name="edit" /> Edit
              </button>
            </>
          )}
          <button className="btn secondary" onClick={() => navigate(`/projects/${project?.id}`)}>Project</button>
        </div>
      </section>

      <section className="detail-layout">
        <div>
          <article className="panel">
            <h2>Promotion Preview</h2>
            {versions.length > 0 && (
              <div className="option-strip" aria-label="Creative options">
                {[...versions].reverse().map((v) => (
                  <button
                    key={v.id}
                    className={`option-chip ${v.id === promo.currentVersionId ? "active" : ""}`}
                    onClick={() => handleSelectVersion(v.id)}
                    type="button"
                  >
                    Option {v.version}
                    <span>{v.fileName}</span>
                  </button>
                ))}
              </div>
            )}
            <CreativePreview version={currentVersion} promoType={promo.type} />
            {promo.type === "social" && promo.captions?.length > 0 && (
              <div className="caption-box">
                {promo.captions.map((caption, i) => (
                  <div key={i}>
                    <strong>Caption {i + 1}</strong>
                    <br />
                    {caption}
                    {i < promo.captions.length - 1 && <br />}
                  </div>
                ))}
              </div>
            )}
            <div className="split-actions">
              {state.session?.role === "client" ? (
                <>
                  <button className="btn" onClick={() => handleStatusUpdate("Approved")}>
                    <Icon name="check" /> Approve
                  </button>
                  <button className="btn danger" onClick={() => handleStatusUpdate("Revision Required")}>
                    <Icon name="edit" /> Needs Changes
                  </button>
                </>
              ) : (
                <>
                  <button className="btn secondary" onClick={() => handleStatusUpdate("Pending Approval")}>
                    Send for Approval
                  </button>
                  <button className="btn" onClick={() => handleStatusUpdate("Published")}>
                    <Icon name="check" /> Mark Published
                  </button>
                </>
              )}
            </div>
          </article>

          <article className="panel" style={{ marginTop: "18px" }}>
            <h2>Creative Options</h2>
            {versions.length
              ? versions.map((v) => (
                  <div key={v.id} className="version-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <strong>Option {v.version} · {v.label}</strong>
                        <div className="muted">{v.fileName} · {v.uploadedBy} · {formatDateTime(v.uploadedAt)}</div>
                        {v.notes && <div className="muted">{v.notes}</div>}
                      </div>
                      <div className="toolbar">
                        <a
                          className="btn secondary small"
                          href={imageUrl(v.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                        {state.session?.role === "admin" && (
                          <button className="btn danger small" onClick={() => handleDeleteVersion(v.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              : <div className="empty">No versions uploaded yet.</div>}
          </article>
        </div>

        <aside className="panel">
          <h2>Feedback</h2>
          <div id="comments">
            {comments.length
              ? comments.map((c) => (
                  <div key={c.id} className="comment">
                    <strong>{c.author}</strong>
                    <div>{c.body}</div>
                    <small className="muted">{formatDateTime(c.createdAt)}</small>
                  </div>
                ))
              : <div className="empty">No comments yet.</div>}
          </div>
          <form onSubmit={handleAddComment} style={{ marginTop: "14px" }}>
            <label className="field">
              <span>Comment</span>
              <textarea ref={commentRef} placeholder="Add feedback or context" required />
            </label>
            <button className="btn" type="submit" style={{ marginTop: "12px" }} disabled={submitting}>
              <Icon name="plus" /> {submitting ? "Posting…" : "Add Comment"}
            </button>
          </form>
        </aside>
      </section>

      {modal && (
        <Modal
          type={modal.type}
          context={{ ...modal.context, promotionId: promo.id, projectId: promo.projectId }}
          onClose={() => {
            setModal(null);
            // Refresh versions after upload
            loadVersions(promotionId);
          }}
        />
      )}
    </>
  );
}
