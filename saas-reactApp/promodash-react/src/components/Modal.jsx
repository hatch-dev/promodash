import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { slugId, isEmailType, assignedClientNames, buildVersionsFromFiles } from "../utils/helpers";
import Icon from "./Icon";
import { statusConfig } from "../context/AppContext";

function FileRow({ required, onRemove, showRemove }) {
  return (
    <div className="file-row">
      <input name="files" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.pdf,application/pdf" required={required} />
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
      <span>JPEG/PDF Creative Options</span>
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

function PromotionTypeToggle({ initialType }) {
  const { state } = useApp();
  const [typeId, setTypeId] = useState(initialType || state.promotionTypes[0]?.id);
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
            <input name="contactList" placeholder="Newsletter subscribers, CRM list, etc." />
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

export default function Modal({ type, context = {}, onClose }) {
  const { state, setState } = useApp();
  const { getProject, getPromotion, getVersions } = useSelectors();
  const formRef = useRef(null);

  const isEdit = Boolean(context.id);
  const titles = { project: "Project", promotion: "Promotion", version: "Creative Options", type: "Promotion Type", client: "Client" };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (type === "project") {
      const existing = state.projects.find((p) => p.id === context.id);
      const project = {
        id: existing?.id || slugId("project", formData.get("name")),
        name: formData.get("name").trim(),
        client: formData.get("client").trim(),
        owner: existing?.owner || "Growth Team",
        description: formData.get("description").trim(),
        clientUsers: formData.getAll("clientUsers").map((e) => e.trim()).filter(Boolean),
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      const projects = existing
        ? state.projects.map((p) => (p.id === project.id ? project : p))
        : [...state.projects, project];
      onClose();
      setState({ projects, selectedProjectId: project.id });
      return;
    }

    if (type === "client") {
      const existing = state.clients.find((c) => c.id === context.id);
      const previousEmail = existing?.email;
      const client = {
        id: existing?.id || slugId("client", formData.get("name")),
        name: formData.get("name").trim(),
        email: formData.get("email").trim(),
        company: formData.get("company").trim(),
      };
      const clients = existing ? state.clients.map((c) => (c.id === client.id ? client : c)) : [...state.clients, client];
      const projects = previousEmail && previousEmail !== client.email
        ? state.projects.map((p) => ({ ...p, clientUsers: p.clientUsers.map((em) => (em === previousEmail ? client.email : em)) }))
        : state.projects;
      onClose();
      setState({ clients, projects });
      return;
    }

    if (type === "type") {
      const existing = state.promotionTypes.find((t) => t.id === context.id);
      const promotionType = {
        id: existing?.id || slugId("type", formData.get("name")),
        name: formData.get("name").trim(),
        description: formData.get("description").trim(),
      };
      const promotionTypes = existing
        ? state.promotionTypes.map((t) => (t.id === promotionType.id ? promotionType : t))
        : [...state.promotionTypes, promotionType];
      onClose();
      setState({ promotionTypes });
      return;
    }

    if (type === "promotion") {
      const existing = state.promotions.find((p) => p.id === context.id);
      const promoType = formData.get("type");
      const emailPromo = isEmailType(promoType, state.promotionTypes);
      const promotion = {
        id: existing?.id || slugId("promo", formData.get("title")),
        projectId: existing?.projectId || state.selectedProjectId,
        title: formData.get("title").trim(),
        type: promoType,
        scheduledDate: formData.get("scheduledDate"),
        status: formData.get("status"),
        description: formData.get("description")?.trim() || "",
        subjectLine: emailPromo ? formData.get("subjectLine")?.trim() || "" : "",
        contactList: emailPromo ? formData.get("contactList")?.trim() || "" : "",
        captions: emailPromo ? [] : (formData.get("captions") || "").split("\n").map((c) => c.trim()).filter(Boolean),
        currentVersionId: existing?.currentVersionId || null,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      const promotions = existing
        ? state.promotions.map((p) => (p.id === promotion.id ? promotion : p))
        : [...state.promotions, promotion];
      const uploadedVersions = await buildVersionsFromFiles(formData.getAll("files"), promotion.id, formData.get("title"), "Uploaded with promotion", state.versions, state.session?.role);
      const nextPromotions = uploadedVersions.length
        ? promotions.map((p) => (p.id === promotion.id ? { ...p, currentVersionId: uploadedVersions[0].id } : p))
        : promotions;
      onClose();
      setState({ promotions: nextPromotions, versions: [...state.versions, ...uploadedVersions], selectedPromotionId: promotion.id });
      return;
    }

    if (type === "version") {
      const promo = getPromotion();
      const existingVersions = getVersions(promo.id);
      const uploadedVersions = await buildVersionsFromFiles(formData.getAll("files"), promo.id, formData.get("label"), formData.get("notes"), state.versions, state.session?.role);
      if (!uploadedVersions.length) return;
      onClose();
      setState({
        versions: [...state.versions, ...uploadedVersions],
        promotions: state.promotions.map((p) =>
          p.id === promo.id ? { ...p, currentVersionId: uploadedVersions[0].id, status: "Pending Approval" } : p
        ),
      });
    }
  };

  const renderBody = () => {
    if (type === "project") {
      const project = state.projects.find((p) => p.id === context.id);
      return (
        <>
          <label className="field"><span>Project Name</span><input name="name" required placeholder="Cognesense Projects" defaultValue={project?.name || ""} /></label>
          <label className="field"><span>Client</span><input name="client" required placeholder="Client company" defaultValue={project?.client || ""} /></label>
          <label className="field">
            <span>Assigned Client Users</span>
            <select name="clientUsers" multiple>
              {state.clients.map((c) => (
                <option key={c.email} value={c.email} selected={project?.clientUsers?.includes(c.email)}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>
          <label className="field"><span>Description</span><textarea name="description" required placeholder="Project scope" defaultValue={project?.description || ""} /></label>
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
      const client = state.clients.find((c) => c.id === context.id);
      return (
        <>
          <label className="field"><span>Name</span><input name="name" required placeholder="Client name" defaultValue={client?.name || ""} /></label>
          <label className="field"><span>Email</span><input name="email" type="email" required placeholder="client@example.com" defaultValue={client?.email || ""} /></label>
          <label className="field"><span>Company</span><input name="company" placeholder="Company" defaultValue={client?.company || ""} /></label>
        </>
      );
    }

    if (type === "type") {
      const promotionType = state.promotionTypes.find((t) => t.id === context.id);
      return (
        <>
          <label className="field"><span>Name</span><input name="name" required placeholder="Social Media Campaign" defaultValue={promotionType?.name || ""} /></label>
          <label className="field"><span>Description</span><textarea name="description" placeholder="Where this type is used" defaultValue={promotionType?.description || ""} /></label>
        </>
      );
    }

    if (type === "promotion") {
      const promo = state.promotions.find((p) => p.id === context.id);
      const project = getProject(promo?.projectId || state.selectedProjectId);
      return (
        <div className="form-grid">
          <PromotionTypeToggle initialType={promo?.type} />
          <div className="field wide">
            <span>Assigned Client Users</span>
            <div className="readonly-box">{assignedClientNames(project?.clientUsers || [], state.clients)}</div>
          </div>
          <div className="wide"><FileUploadFields required={false} /></div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" ref={formRef} onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{isEdit ? "Edit" : "New"} {titles[type]}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{renderBody()}</div>
        <div className="modal-foot">
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn" type="submit"><Icon name="check" /> Save</button>
        </div>
      </form>
    </div>
  );
}
