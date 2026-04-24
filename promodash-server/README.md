# PromoDash — Setup & Deployment Guide

## Folder structure
```
promodash/          ← React frontend (Vite)
promodash-server/   ← Node + Express + PostgreSQL backend
```

---

## 1. PostgreSQL — Create DB and run schema

```bash
# Open psql as postgres user
psql -U postgres

# Inside psql:
CREATE DATABASE promodash;
\q

# Run the schema + seed data
psql -U postgres -d promodash -f promodash-server/db/schema.sql
```

You should see tables created and seed rows inserted.
Verify with:
```bash
psql -U postgres -d promodash -c "\dt"
psql -U postgres -d promodash -c "SELECT * FROM users;"
```

---

## 2. Backend — Start the API server

```bash
cd promodash-server

# Copy the env file and fill in your values
cp .env.example .env
# Edit .env: set DB_PASSWORD, JWT_SECRET, CLIENT_URL

# Install dependencies
npm install

# Dev mode (auto-restarts on file change)
npm run dev

# Production
npm start
```

Server runs at: **http://localhost:4000**

---

## 3. Frontend — Start the React app

```bash
cd promodash

# The .env.local file is already created pointing to localhost:4000
# If missing, create it:
echo "VITE_API_URL=http://localhost:4000" > .env.local

npm install
npm run dev
```

App runs at: **http://localhost:5173**

---

## 4. How API calls work in React

All API calls are in **`src/services/api.js`**.
Pages import from there — never write `fetch()` directly in a page.

### Example — loading projects in ProjectsPage.jsx:
```jsx
import { useEffect, useState } from "react";
import { projectsAPI } from "../services/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    projectsAPI.list().then(setProjects).catch(console.error);
  }, []);

  // ... render projects
}
```

### Example — creating a project in Modal.jsx:
```jsx
import { projectsAPI } from "../services/api";

const newProject = await projectsAPI.create({ name, client, description, clientUsers });
```

### Example — uploading a creative file:
```jsx
import { versionsAPI, imageUrl } from "../services/api";

const formData = new FormData();
formData.append("promotionId", promo.id);
formData.append("label", "Banner v2");
formData.append("notes", "Revised CTA");
files.forEach(f => formData.append("files", f));

const created = await versionsAPI.upload(formData);
// created[0].url === "/uploads/abc123.jpg"

// In JSX to display:
<img src={imageUrl(created[0].url)} alt="creative" />
```

---

## 5. Image paths — why they're safe for deployment

**The server stores images as relative paths:**
```
/uploads/abc123-uuid.jpg
```

**The frontend builds the full URL at runtime:**
```js
// api.js
export function imageUrl(path) {
  return `${BASE}${path}`;
  // Dev:  http://localhost:4000/uploads/abc123.jpg
  // Prod: https://your-server.onrender.com/uploads/abc123.jpg
}
```

**You never need to update the database when you deploy.**
Only `VITE_API_URL` changes — set it in your hosting dashboard.

---

## 6. Push to GitHub

```bash
# From your project root
git init
git add .
git commit -m "Initial PromoDash commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/promodash.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes:
- `node_modules/`
- `.env` and `.env.local` (your secrets)
- `uploads/` (user files — don't commit these)
- `dist/` (build output)

---

## 7. Deploy — Render.com (recommended free option)

### Backend (Web Service):
1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Root directory: `promodash-server`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add Environment Variables:
   ```
   DB_HOST       = (your Render Postgres host)
   DB_PORT       = 5432
   DB_NAME       = promodash
   DB_USER       = (your db user)
   DB_PASSWORD   = (your db password)
   JWT_SECRET    = (long random string)
   CLIENT_URL    = https://your-frontend.vercel.app
   PORT          = 4000
   ```

### PostgreSQL on Render:
1. New → PostgreSQL
2. Copy the connection details into your backend env vars above
3. Connect to it and run the schema:
   ```bash
   psql "postgresql://user:pass@host/promodash" -f db/schema.sql
   ```

### Frontend (Vercel or Netlify):
1. Go to https://vercel.com → New Project
2. Connect your GitHub repo
3. Root directory: `promodash`
4. Add Environment Variable:
   ```
   VITE_API_URL = https://your-backend.onrender.com
   ```
5. Deploy

---

## 8. For production — move uploads to Cloudinary (optional but recommended)

Render's disk resets on every deploy, which would delete uploaded files.
Use Cloudinary (free tier) to store images permanently:

```bash
npm install cloudinary
```

In `routes/versions.js`, replace the multer disk storage with:
```js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "promodash", allowed_formats: ["jpg", "png", "pdf"] },
});
```

Cloudinary returns absolute URLs like `https://res.cloudinary.com/...`.
The `imageUrl()` helper in `api.js` already handles this — it passes through
any URL that starts with `http` unchanged.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/auth/me | any | Verify token |
| GET | /api/projects | any | List projects (filtered by role) |
| POST | /api/projects | admin | Create project |
| PUT | /api/projects/:id | admin | Update project |
| DELETE | /api/projects/:id | admin | Delete project + cascade |
| GET | /api/promotions | any | List promotions |
| POST | /api/promotions | admin | Create promotion |
| PUT | /api/promotions/:id | admin | Update promotion |
| PATCH | /api/promotions/:id/status | any | Update status only |
| PATCH | /api/promotions/:id/version | any | Set active version |
| DELETE | /api/promotions/:id | admin | Delete promotion |
| GET | /api/versions | any | List versions for a promotion |
| POST | /api/versions/upload | admin | Upload creative files |
| DELETE | /api/versions/:id | admin | Delete version + file |
| GET | /api/comments | any | List comments |
| POST | /api/comments | any | Add comment |
| DELETE | /api/comments/:id | admin | Delete comment |
| GET | /api/clients | admin | List clients |
| POST | /api/clients | admin | Create client |
| PUT | /api/clients/:id | admin | Update client |
| DELETE | /api/clients/:id | admin | Delete client |
| GET | /api/types | any | List promotion types |
| POST | /api/types | admin | Create type |
| PUT | /api/types/:id | admin | Update type |
| DELETE | /api/types/:id | admin | Delete type |
