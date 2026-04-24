const router = require("express").Router();
const pool = require("../db/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

// Helper: row → camelCase object
function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    owner: row.owner,
    description: row.description,
    clientUsers: row.client_users || [],
    createdAt: row.created_at,
  };
}

// GET /api/projects
router.get("/", requireAuth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === "admin") {
      query = "SELECT * FROM projects ORDER BY created_at DESC";
      params = [];
    } else {
      query = "SELECT * FROM projects WHERE $1 = ANY(client_users) ORDER BY created_at DESC";
      params = [req.user.email];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows.map(mapProject));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/projects/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM projects WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Project not found" });
    const project = mapProject(rows[0]);
    if (req.user.role !== "admin" && !project.clientUsers.includes(req.user.email)) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/projects
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, client, owner = "Growth Team", description, clientUsers = [] } = req.body;
  if (!name || !client) return res.status(400).json({ error: "name and client required" });

  const id = `project-${uuidv4()}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (id, name, client, owner, description, client_users)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, name.trim(), client.trim(), owner, description?.trim() || "", clientUsers]
    );
    res.status(201).json(mapProject(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/projects/:id
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, client, owner, description, clientUsers } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE projects
       SET name=$1, client=$2, owner=$3, description=$4, client_users=$5
       WHERE id=$6 RETURNING *`,
      [
        name?.trim(),
        client?.trim(),
        owner || "Growth Team",
        description?.trim() || "",
        clientUsers || [],
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Project not found" });
    res.json(mapProject(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM projects WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Project not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
