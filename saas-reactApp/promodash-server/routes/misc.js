const { Router } = require("express");
const prisma = require("../db/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────────────────────
//  Comments
// ─────────────────────────────────────────────────────────────────────────────
const commentsRouter = Router();

function mapComment(c) {
  return { id: c.id, promotionId: c.promotionId, author: c.author, role: c.role, body: c.body, createdAt: c.createdAt };
}

// GET /api/comments?promotionId=xxx
commentsRouter.get("/", requireAuth, async (req, res) => {
  const { promotionId } = req.query;
  if (!promotionId) return res.status(400).json({ error: "promotionId required" });
  try {
    const comments = await prisma.comment.findMany({
      where:   { promotionId },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments.map(mapComment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/comments
commentsRouter.post("/", requireAuth, async (req, res) => {
  const { promotionId, body } = req.body;
  if (!promotionId || !body) return res.status(400).json({ error: "promotionId and body required" });
  try {
    const comment = await prisma.comment.create({
      data: {
        promotionId,
        author: req.user.role === "admin" ? "Admin" : "Client",
        role:   req.user.role,
        body:   body.trim(),
      },
    });
    res.status(201).json(mapComment(comment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/comments/:id
commentsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Comment not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Clients
// ─────────────────────────────────────────────────────────────────────────────
const clientsRouter = Router();

function mapClient(c) {
  return { id: c.id, name: c.name, email: c.email, company: c.company || "", createdAt: c.createdAt };
}

clientsRouter.get("/", requireAuth, async (_req, res) => {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  res.json(clients.map(mapClient));
});

clientsRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, email, company } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name and email required" });
  try {
    const client = await prisma.client.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), company: company?.trim() || "" },
    });
    res.status(201).json(mapClient(client));
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

clientsRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, email, company } = req.body;
  try {
    const old = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!old) return res.status(404).json({ error: "Client not found" });

    const newEmail = email.trim().toLowerCase();
    const client   = await prisma.client.update({
      where: { id: req.params.id },
      data:  { name: name.trim(), email: newEmail, company: company?.trim() || "" },
    });

    // Sync email in project client_users arrays if email changed
    if (old.email !== newEmail) {
      const projects = await prisma.project.findMany({
        where: { clientUsers: { has: old.email } },
      });
      for (const p of projects) {
        await prisma.project.update({
          where: { id: p.id },
          data:  { clientUsers: p.clientUsers.map(e => e === old.email ? newEmail : e) },
        });
      }
    }
    res.json(mapClient(client));
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

clientsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: "Client not found" });

    await prisma.client.delete({ where: { id: req.params.id } });

    // Remove from project assignments
    const projects = await prisma.project.findMany({
      where: { clientUsers: { has: client.email } },
    });
    for (const p of projects) {
      await prisma.project.update({
        where: { id: p.id },
        data:  { clientUsers: p.clientUsers.filter(e => e !== client.email) },
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Promotion Types
// ─────────────────────────────────────────────────────────────────────────────
const typesRouter = Router();

function mapType(t) {
  return { id: t.id, name: t.name, description: t.description || "", createdAt: t.createdAt };
}

typesRouter.get("/", requireAuth, async (_req, res) => {
  const types = await prisma.promotionType.findMany({ orderBy: { name: "asc" } });
  res.json(types.map(mapType));
});

typesRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const type = await prisma.promotionType.create({
      data: { name: name.trim(), description: description?.trim() || "" },
    });
    res.status(201).json(mapType(type));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

typesRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    const type = await prisma.promotionType.update({
      where: { id: req.params.id },
      data:  { name: name.trim(), description: description?.trim() || "" },
    });
    res.json(mapType(type));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Type not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

typesRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const count = await prisma.promotion.count({ where: { typeId: req.params.id } });
    if (count > 0)
      return res.status(409).json({ error: "Type is used by promotions. Remove those first." });

    await prisma.promotionType.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Type not found" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = { commentsRouter, clientsRouter, typesRouter };
