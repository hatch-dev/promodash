const router = require("express").Router();
const prisma  = require("../db/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

function mapPromotion(p) {
  return {
    id: p.id,
    projectId: p.projectId,
    title: p.title,
    type: p.typeId,
    scheduledDate: p.scheduledDate,
    status: p.status.replace("_", " "),   // "Pending_Approval" → "Pending Approval"
    description: p.description || "",
    subjectLine: p.subjectLine || "",
    contactList: p.contactList || "",
    captions: p.captions || [],
    currentVersionId: p.currentVersionId || null,
    createdAt: p.createdAt,
  };
}

function toDbStatus(s) {
  return s.replace(" ", "_");   // "Pending Approval" → "Pending_Approval"
}

// GET /api/promotions?projectId=xxx
router.get("/", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.query;

    let where = {};
    if (req.user.role === "admin") {
      if (projectId) where.projectId = projectId;
    } else {
      where.project = { clientUsers: { has: req.user.email } };
      if (projectId) where.projectId = projectId;
    }

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
    });
    res.json(promotions.map(mapPromotion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/promotions/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const promotion = await prisma.promotion.findUnique({ where: { id: req.params.id } });
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    res.json(mapPromotion(promotion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/promotions
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { projectId, title, type, scheduledDate, status = "Draft",
          description, subjectLine, contactList, captions = [] } = req.body;

  if (!projectId || !title || !type || !scheduledDate)
    return res.status(400).json({ error: "projectId, title, type, scheduledDate required" });

  try {
    const promotion = await prisma.promotion.create({
      data: {
        projectId,
        title: title.trim(),
        typeId: type,
        scheduledDate: new Date(scheduledDate),
        status: toDbStatus(status),
        description: description?.trim() || "",
        subjectLine: subjectLine?.trim() || "",
        contactList: contactList?.trim() || "",
        captions,
      },
    });
    res.status(201).json(mapPromotion(promotion));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/promotions/:id
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { title, type, scheduledDate, status, description,
          subjectLine, contactList, captions, currentVersionId } = req.body;
  try {
    const promotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: {
        title: title?.trim(),
        typeId: type,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        status: status ? toDbStatus(status) : undefined,
        description: description?.trim() || "",
        subjectLine: subjectLine?.trim() || "",
        contactList: contactList?.trim() || "",
        captions: captions || [],
        currentVersionId: currentVersionId || null,
      },
    });
    res.json(mapPromotion(promotion));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/promotions/:id/status
router.patch("/:id/status", requireAuth, async (req, res) => {
  const allowed = ["Draft", "Pending Approval", "Approved", "Revision Required", "Published"];
  const { status } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const promotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: { status: toDbStatus(status) },
    });
    res.json(mapPromotion(promotion));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/promotions/:id/version
router.patch("/:id/version", requireAuth, async (req, res) => {
  const { currentVersionId } = req.body;
  try {
    const promotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: { currentVersionId: currentVersionId || null },
    });
    res.json(mapPromotion(promotion));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/promotions/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Promotion not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
