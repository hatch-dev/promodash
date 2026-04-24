import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { formatDate, formatDateTime, isEmailType, slugId } from "../utils/helpers";
import { StatusBadge, TypeBadge } from "../components/Badges";
import Modal from "../components/Modal";
import Icon from "../components/Icon";

function CreativePreview({ version, promoType }) {
  if (!version) return <div className="preview"><div className="empty">No creative uploaded.</div></div>;
  if (version.url && version.fileType === "image") {
    return <div className="preview"><img src={version.url} alt={version.fileName} /></div>;
  }
  if (version.url && version.fileType === "pdf") {
    return <div className="preview"><iframe className="pdf-preview" src={version.url} title={version.fileName} /></div>;
  }
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
  const { state, setState } = useApp();
  const { getProject, getVersions, getComments } = useSelectors();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const commentRef = useRef(null);

  const promo = state.promotions.find((p) => p.id === promotionId);
  if (!promo) return <div className="empty">Promotion not found.</div>;

  const project = getProject(promo.projectId);
  const versions = getVersions(promo.id);
  const currentVersion = state.versions.find((v) => v.id === promo.currentVersionId) || versions[0];
  const comments = getComments(promo.id);

  const updateStatus = (status) => {
    const commentText = {
      Approved: "Approved this promotion.",
      "Revision Required": "Marked this promotion as needing changes.",
      Published: "Marked this promotion as published.",
      "Pending Approval": "Sent this promotion for approval.",
    }[status] || "";

    setState({
      promotions: state.promotions.map((p) => (p.id === promo.id ? { ...p, status } : p)),
      comments: [
        ...state.comments,
        {
          id: slugId("comment", status),
          promotionId: promo.id,
          author: state.session?.role === "admin" ? "Admin" : "Client",
          role: state.session?.role,
          body: commentText,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  const selectVersion = (versionId) => {
    setState({ promotions: state.promotions.map((p) => (p.id === promo.id ? { ...p, currentVersionId: versionId } : p)) });
  };

  const addComment = (e) => {
    e.preventDefault();
    const body = commentRef.current?.value?.trim();
    if (!body) return;
    setState({
      comments: [
        ...state.comments,
        {
          id: slugId("comment", body),
          promotionId: promo.id,
          author: state.session?.role === "admin" ? "Admin" : "Client",
          role: state.session?.role,
          body,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    if (commentRef.current) commentRef.current.value = "";
  };

  const emailType = isEmailType(promo.type, state.promotionTypes);

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
                <Icon name="upload" /> Options
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
                    onClick={() => selectVersion(v.id)}
                    type="button"
                  >
                    Option {v.version}
                    <span>{v.fileName}</span>
                  </button>
                ))}
              </div>
            )}
            <CreativePreview version={currentVersion} promoType={promo.type} />
            {promo.type === "social" && promo.captions.length > 0 && (
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
                  <button className="btn" onClick={() => updateStatus("Approved")}><Icon name="check" /> Approve</button>
                  <button className="btn danger" onClick={() => updateStatus("Revision Required")}><Icon name="edit" /> Needs Changes</button>
                </>
              ) : (
                <>
                  <button className="btn secondary" onClick={() => updateStatus("Pending Approval")}>Send for Approval</button>
                  <button className="btn" onClick={() => updateStatus("Published")}><Icon name="check" /> Mark Published</button>
                </>
              )}
            </div>
          </article>

          <article className="panel" style={{ marginTop: "18px" }}>
            <h2>Creative Options</h2>
            {versions.length
              ? versions.map((v) => (
                  <div key={v.id} className="version-item">
                    <strong>Option {v.version} · {v.label}</strong>
                    <div className="muted">{v.fileName} · {v.uploadedBy} · {formatDateTime(v.uploadedAt)}</div>
                    <div className="muted">{v.notes}</div>
                  </div>
                ))
              : <div className="empty">No versions uploaded.</div>}
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
          <form onSubmit={addComment} style={{ marginTop: "14px" }}>
            <label className="field">
              <span>Comment</span>
              <textarea ref={commentRef} placeholder="Add feedback or context" required />
            </label>
            <button className="btn" type="submit" style={{ marginTop: "12px" }}>
              <Icon name="plus" /> Add Comment
            </button>
          </form>
        </aside>
      </section>

      {modal && (
        <Modal type={modal.type} context={modal.context || {}} onClose={() => setModal(null)} />
      )}
    </>
  );
}
