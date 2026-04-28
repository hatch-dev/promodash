const router  = require("express").Router();
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcryptjs");
const prisma  = require("../db/prisma");

const SECRET = process.env.JWT_SECRET || "dev_secret";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    // Support both bcrypt hashed and plain (migration period)
    const isHashed = user.password.startsWith("$2");
    const valid = isHashed
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" });

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token   = jwt.sign(payload, SECRET, { expiresIn: "7d" });

    res.json({ token, session: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, SECRET);
    res.json({ session: { id: payload.id, email: payload.email, role: payload.role, name: payload.name } });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;