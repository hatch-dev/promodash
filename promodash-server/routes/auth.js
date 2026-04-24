const router = require("express").Router();
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );
    const user = rows[0];

    // NOTE: In production use bcrypt.compare(password, user.password)
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      session: { id: user.id, email: user.email, role: user.role, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me  (verify token + return user)
router.get("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    res.json({ session: { id: payload.id, email: payload.email, role: payload.role, name: payload.name } });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
