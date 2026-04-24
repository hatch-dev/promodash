import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { isEmailType, assignedClientNames } from "../utils/helpers";
import { statusConfig } from "../context/AppContext";
import Icon from "./Icon";

// ── File row (single file input) ──────────────────────────────────────────────
function FileRow({ required, onRemove, showRemove }) {
  return (
    <div className="file-row">
      <input
        name="files"
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.pdf,application/pdf"
        required={required}
      />
      <button
        className="icon-btn remove-file-row"
        type="button"
        title="Remove file"
        onClick={onRemove}
        disabled={!showRemove}
      >
        ×
      </button>
    </div>
  );
}

function FileUploadFields({ required }) {
  const [rows, setRows] = useState([{ id: 0 }]);
  const counter = useRef(1);
  return (
    <div className="field">
      <span>JPEG / PNG / PDF Creative Options</span>
      <div data-file-rows="true">
        {rows.map((row) => (
          <FileRow
            key={row.id}
            required={required && rows.length === 1}
            showRemove={rows.length > 1}
            onRemove={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
          />
        ))}
      </div>
      <button
        className="btn secondary small"
        type="button"
        onClick={() => setRows((prev) => [...prev, { id: counter.current++ }])}
      >
        <Icon name="plus" /> Add more files
      </button>
    </div>
  );
}

// ── Promotion type/status fields with live email-type toggle ──────────────────
function PromotionTypeToggle({ initialType }) {
  const { state } = useApp();
  const [typeId, setTypeId] = useState(initialType || state.promotionTypes[0]?.id || "");
  const emailType = isEmailType(typeId, state.promotionTypes);

  return (
    <>
      <label className="field">
        <span>{emailType ? "Campaign Name" : "Title"}</span>
        <input name="title" required />
      </label>
      <label className="field">
        <span>Type</span>
        <select name="type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          {state.promotionTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Scheduled Date</span>
        <input name="scheduledDate" type="date" required />
      </label>
      <label className="field">
        <span>Status</span>
        <select name="status">
          {Object.keys(statusConfig).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      {emailType && (
        <>
          <label className="field email-field">
            <span>Subject Line</span>
            <input name="subjectLine" />
          </label>
          <label className="field email-field">
            <span>Contact List</span>
            <input name="contactList" placeholder="Newsletter subscribers, CRM list…" />
          </label>
        </>
      )}
      <label className="field wide">
        <span>Description</span>
        <textarea name="description" />
      </label>
      {!emailType && (
        <label className="field wide social-field">
          <span>Captions</span>
          <textarea name="captions" placeholder="One caption per line" />
        </label>
      )}
    </>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function Modal({ type, context = {}, onClose }) {
  const {
    state,
    loadTypes, loadClients,
    createProject, updateProject,
    createPromotion, updatePromotion,
    uploadVersions,
    createClient, updateClient,
    createType, updateType,
  } = useApp();
  const { getProject } = useSelectors();
  const formRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const isEdit = Boolean(context.id);
  const titles = {
    project:   "Project",
    promotion: "Promotion",
    version:   "Creative Options",
    type:      "Promotion Type",
    client:    "Client",
  };

  // Load types and clients on mount so selects are populated
  useEffect(() => {
    loadTypes().catch(() => {});
    loadClients().catch(() => {});
  }, []);

  // Escape key closes
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Pre-fill helpers ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!formRef.current) return;
    const form = formRef.current;
    const fill = (name, value) => {
      const el = form.elements[name];
      if (!el) return;
      if (el.tagName === "SELECT" && el.multiple) {
        Array.from(el.options).forEach((o) => { o.selected = value?.includes(o.value); });
      } else {
        el.value = value || "";
      }
    };

    if (type === "project" && context.id) {
      const p = state.projects.find((x) => x.id === context.id);
      if (!p) return;
      fill("name",        p.name);
      fill("client",      p.client);
      fill("description", p.description);
      fill("clientUsers", p.clientUsers);
    }
    if (type === "promotion" && context.id) {
      const p = state.promotions.find((x) => x.id === context.id);
      if (!p) return;
      fill("title",         p.title);
      fill("type",          p.type);
      fill("scheduledDate", p.scheduledDate?.slice(0, 10));
      fill("status",        p.status);
      fill("description",   p.description);
      fill("subjectLine",   p.subjectLine);
      fill("contactList",   p.contactList);
      fill("captions",      p.captions?.join("\n"));
    }
    if (type === "client" && context.id) {
      const c = state.clients.find((x) => x.id === context.id);
      if (!c) return;
      fill("name",    c.name);
      fill("email",   c.email);
      fill("company", c.company);
    }
    if (type === "type" && context.id) {
      const t = state.promotionTypes.find((x) => x.id === context.id);
      if (!t) return;
      fill("name",        t.name);
      fill("description", t.description);
    }
  }, [type, context.id, state.projects, state.promotions, state.clients, state.promotionTypes]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      if (type === "project") {
        const data = {
          name:        fd.get("name").trim(),
          client:      fd.get("client").trim(),
          description: fd.get("description")?.trim() || "",
          clientUsers: fd.getAll("clientUsers").map((x) => x.trim()).filter(Boolean),
        };
        if (context.id) await updateProject(context.id, data);
        else            await createProject(data);
        onClose();
        return;
      }

      if (type === "client") {
        const data = {
          name:    fd.get("name").trim(),
          email:   fd.get("email").trim().toLowerCase(),
          company: fd.get("company")?.trim() || "",
        };
        if (context.id) await updateClient(context.id, data);
        else            await createClient(data);
        onClose();
        return;
      }

      if (type === "type") {
        const data = {
          name:        fd.get("name").trim(),
          description: fd.get("description")?.trim() || "",
        };
        if (context.id) await updateType(context.id, data);
        else            await createType(data);
        onClose();
        return;
      }

      if (type === "promotion") {
        const promoType  = fd.get("type");
        const emailPromo = isEmailType(promoType, state.promotionTypes);
        const data = {
          projectId:    context.projectId || state.selectedProjectId,
          title:        fd.get("title").trim(),
          type:         promoType,
          scheduledDate:fd.get("scheduledDate"),
          status:       fd.get("status"),
          description:  fd.get("description")?.trim() || "",
          subjectLine:  emailPromo ? fd.get("subjectLine")?.trim() || "" : "",
          contactList:  emailPromo ? fd.get("contactList")?.trim() || "" : "",
          captions:     emailPromo ? [] : (fd.get("captions") || "").split("\n").map((c) => c.trim()).filter(Boolean),
        };
        let promo;
        if (context.id) promo = await updatePromotion(context.id, data);
        else            promo = await createPromotion(data);

        // Upload any attached files
        const files = fd.getAll("files").filter((f) => f.size > 0);
        if (files.length) {
          const uploadFD = new FormData();
          uploadFD.append("promotionId", promo.id);
          uploadFD.append("label",       data.title);
          uploadFD.append("notes",       "Uploaded with promotion");
          files.forEach((f) => uploadFD.append("files", f));
          await uploadVersions(uploadFD);
        }
        onClose();
        return;
      }

      if (type === "version") {
        const files = fd.getAll("files").filter((f) => f.size > 0);
        if (!files.length) { setError("Please select at least one file."); setSaving(false); return; }
        const uploadFD = new FormData();
        uploadFD.append("promotionId", context.promotionId);
        uploadFD.append("label",       fd.get("label")?.trim() || "Creative option");
        uploadFD.append("notes",       fd.get("notes")?.trim() || "");
        files.forEach((f) => uploadFD.append("files", f));
        await uploadVersions(uploadFD);
        onClose();
        return;
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ── Body ───────────────────────────────────────────────────────────────────
  const renderBody = () => {
    if (type === "project") {
      const project = state.projects.find((p) => p.id === context.id);
      return (
        <>
          <label className="field"><span>Project Name</span><input name="name" required placeholder="Cognesense Projects" /></label>
          <label className="field"><span>Client</span><input name="client" required placeholder="Client company" /></label>
          <label className="field">
            <span>Assigned Client Users</span>
            <select name="clientUsers" multiple>
              {state.clients.map((c) => (
                <option key={c.email} value={c.email}>{c.name} ({c.email})</option>
              ))}
            </select>
          </label>
          <label className="field"><span>Description</span><textarea name="description" placeholder="Project scope" /></label>
        </>
      );
    }

    if (type === "version") {
      return (
        <>
          <label className="field"><span>Option Label</span><input name="label" required placeholder="Creative option" /></label>
          <FileUploadFields required={true} />
          <label className="field"><span>Notes</span><textarea name="notes" placeholder="What changed in this version" /></label>
        </>
      );
    }

    if (type === "client") {
      return (
        <>
          <label className="field"><span>Name</span><input name="name" required placeholder="Client name" /></label>
          <label className="field"><span>Email</span><input name="email" type="email" required placeholder="client@example.com" /></label>
          <label className="field"><span>Company</span><input name="company" placeholder="Company" /></label>
        </>
      );
    }

    if (type === "type") {
      return (
        <>
          <label className="field"><span>Name</span><input name="name" required placeholder="Social Media Campaign" /></label>
          <label className="field"><span>Description</span><textarea name="description" placeholder="Where this type is used" /></label>
        </>
      );
    }

    if (type === "promotion") {
      const promo   = state.promotions.find((p) => p.id === context.id);
      const project = getProject(promo?.projectId || context.projectId || state.selectedProjectId);
      return (
        <div className="form-grid">
          <PromotionTypeToggle initialType={promo?.type} />
          <div className="field wide">
            <span>Assigned Client Users</span>
            <div className="readonly-box">
              {assignedClientNames(project?.clientUsers || [], state.clients)}
            </div>
          </div>
          <div className="wide"><FileUploadFields required={false} /></div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form className="modal" ref={formRef} onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{isEdit ? "Edit" : "New"} {titles[type]}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{renderBody()}</div>
        {error && (
          <p style={{ color: "var(--danger)", padding: "0 24px 12px", fontSize: "14px" }}>{error}</p>
        )}
        <div className="modal-foot">
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn" type="submit" disabled={saving}>
            <Icon name="check" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
