export function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: options.year === false ? undefined : "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function slugId(prefix, value) {
  return `${prefix}-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
}

export function isEmailType(typeId, promotionTypes) {
  const type = promotionTypes?.find((item) => item.id === typeId);
  return typeId === "email" || type?.name?.toLowerCase().includes("email");
}

export function getTypeName(typeId, promotionTypes) {
  return promotionTypes?.find((t) => t.id === typeId)?.name || typeId;
}

export function getClientByEmail(email, clients) {
  return clients?.find((c) => c.email.toLowerCase() === String(email).toLowerCase());
}

export function assignedClientNames(emails = [], clients = []) {
  if (!emails.length) return "No clients assigned";
  return emails.map((email) => getClientByEmail(email, clients)?.name || email).join(", ");
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function buildVersionsFromFiles(files, promotionId, label, notes, existingVersions, sessionRole) {
  const usableFiles = files.filter((file) => file && file.name);
  const existingCount = existingVersions.filter((v) => v.promotionId === promotionId).length;
  const uploadedAt = new Date().toISOString();
  return Promise.all(
    usableFiles.map(async (file, index) => ({
      id: slugId("ver", `${label}-${file.name}-${index}`),
      promotionId,
      version: existingCount + index + 1,
      label: `${String(label).trim() || "Creative option"}${usableFiles.length > 1 ? ` ${index + 1}` : ""}`,
      fileName: file.name,
      fileType: file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
      uploadedBy: sessionRole === "admin" ? "Admin" : "Client",
      uploadedAt,
      url: await readFileAsDataURL(file),
      notes: String(notes || "").trim(),
    }))
  );
}
