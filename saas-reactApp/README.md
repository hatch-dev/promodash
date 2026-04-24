# PromoDash — Full-Stack Setup & Deployment Guide

```
promotion-approval/
├── promodash-react/     ← Vite + React frontend
└── promodash-server/    ← Node + Express + Prisma + PostgreSQL backend
```

---

## 1. Create the Database

```bash
# Open psql
psql -U postgres

# Inside psql:
CREATE DATABASE "promotion-approval";
\q
```

Then run the schema + seed:

```bash
# Option A — raw SQL (no Prisma CLI needed)
psql -U postgres -d "promotion-approval" -f promodash-server/prisma/migrations/001_init.sql
psql -U postgres -d "promotion-approval" -f promodash-server/prisma/migrations/002_seed.sql

# Option B — Prisma migrate (recommended)
cd promodash-server
npx prisma migrate dev --name init
npx prisma db seed
```

Verify:
```bash
psql -U postgres -d "promotion-approval" -c "\dt"
psql -U postgres -d "promotion-approval" -c "SELECT email, role FROM users;"
```

---

## 2. Backend Setup

```bash
cd promodash-server

# 1. Copy and fill env
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, CLIENT_URL

# 2. Install deps + generate Prisma client
npm install
npx prisma generate

# 3. Run
npm run dev       # dev with nodemon
npm start         # production
```

Server runs at **http://localhost:4000**

### .env values

| Variable       | Description                                          |
|----------------|------------------------------------------------------|
| `DATABASE_URL` | `postgresql://postgres:pass@localhost:5433/promotion-approval` |
| `JWT_SECRET`   | Any long random string (64+ chars)                   |
| `CLIENT_URL`   | `http://localhost:5173` (dev) or your Vercel URL     |
| `PORT`         | `4000` (default)                                     |

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 3. Frontend Setup

```bash
cd promodash-react

# .env.local is already created pointing to localhost:4000
# If missing:
echo "VITE_API_URL=http://localhost:4000" > .env.local

npm install
npm run dev
```

App runs at **http://localhost:5173**

### Demo login credentials (from seed)

| Role  | Email                          | Password   |
|-------|--------------------------------|------------|
| Admin | admin@promodash.local          | password   |
| Client| client@cognesense.com          | password   |
| Client| marketing@northstar.example    | password   |

---

## 4. How Images Work (Production-Safe)

**DB stores relative paths:**
```
/uploads/550e8400-e29b-41d4-a716-446655440000.jpg
```

**Frontend converts to full URL at runtime:**
```js
// src/services/api.js
export function imageUrl(path) {
  if (path.startsWith("http")) return path;   // Cloudinary passthrough
  return `${VITE_API_URL}${path}`;
}

// In component:
<img src={imageUrl(version.url)} />
```

**This means:**
- Dev:  `http://localhost:4000/uploads/xxx.jpg`
- Prod: `https://your-api.onrender.com/uploads/xxx.jpg`
- DB never needs updating when you change domains ✓

---

## 5. Deploy to Render + Vercel

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/promotion-approval.git
git branch -M main
git push -u origin main
```

### Step 2 — PostgreSQL on Render
1. Go to https://render.com → New → PostgreSQL
2. Name: `promotion-approval-db`
3. Copy **Internal Database URL** — you'll need it next

Connect and run schema:
```bash
psql "postgresql://user:pass@host/promotion-approval" \
  -f promodash-server/prisma/migrations/001_init.sql

psql "postgresql://user:pass@host/promotion-approval" \
  -f promodash-server/prisma/migrations/002_seed.sql
```

### Step 3 — Backend on Render (Web Service)
1. New → Web Service → Connect your repo
2. **Root Directory:** `promodash-server`
3. **Build Command:** `npm install && npx prisma generate`
4. **Start Command:** `node server.js`
5. **Environment Variables:**

```
DATABASE_URL  = postgresql://user:pass@host/promotion-approval
JWT_SECRET    = (your 64-char secret)
CLIENT_URL    = https://your-frontend.vercel.app
PORT          = 4000
```

### Step 4 — Frontend on Vercel
1. Go to https://vercel.com → New Project → Connect repo
2. **Root Directory:** `promodash-react`
3. **Environment Variable:**
```
VITE_API_URL = https://your-backend.onrender.com
```
4. Deploy

---

## 6. Prisma Commands Reference

```bash
cd promodash-server

npx prisma generate        # Regenerate client after schema change
npx prisma migrate dev     # Create + apply new migration (dev only)
npx prisma migrate deploy  # Apply migrations in production
npx prisma db seed         # Run seed.js
npx prisma studio          # Open DB browser at http://localhost:5555
```

---

## 7. Optional: Cloudinary for Production File Storage

Render's disk resets on every deploy, deleting uploaded files.
Use Cloudinary (free tier) for permanent storage:

```bash
cd promodash-server
npm install cloudinary multer-storage-cloudinary
```

In `routes/versions.js`, replace multer disk storage with:
```js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "promotion-approval", allowed_formats: ["jpg", "png", "pdf"] },
});
```

Cloudinary returns absolute URLs (`https://res.cloudinary.com/...`).
`imageUrl()` in `api.js` already handles this — it passes `http`-prefixed
URLs through unchanged.

Add to Render backend env:
```
CLOUDINARY_CLOUD_NAME = your_cloud_name
CLOUDINARY_API_KEY    = your_api_key
CLOUDINARY_API_SECRET = your_api_secret
```

---

## 8. API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /api/auth/login | — | Login → JWT |
| GET    | /api/auth/me | any | Verify token |
| GET    | /api/projects | any | List projects |
| POST   | /api/projects | admin | Create project |
| PUT    | /api/projects/:id | admin | Update project |
| DELETE | /api/projects/:id | admin | Delete project |
| GET    | /api/promotions | any | List promotions |
| POST   | /api/promotions | admin | Create promotion |
| PUT    | /api/promotions/:id | admin | Update promotion |
| PATCH  | /api/promotions/:id/status | any | Update status |
| PATCH  | /api/promotions/:id/version | any | Set active version |
| DELETE | /api/promotions/:id | admin | Delete promotion |
| GET    | /api/versions?promotionId= | any | List versions |
| POST   | /api/versions/upload | admin | Upload files |
| DELETE | /api/versions/:id | admin | Delete version |
| GET    | /api/comments?promotionId= | any | List comments |
| POST   | /api/comments | any | Add comment |
| DELETE | /api/comments/:id | admin | Delete comment |
| GET    | /api/clients | admin | List clients |
| POST   | /api/clients | admin | Create client |
| PUT    | /api/clients/:id | admin | Update client |
| DELETE | /api/clients/:id | admin | Delete client |
| GET    | /api/types | any | List types |
| POST   | /api/types | admin | Create type |
| PUT    | /api/types/:id | admin | Update type |
| DELETE | /api/types/:id | admin | Delete type |
| GET    | /health | — | Health check |
