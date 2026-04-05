# HomeMitra – Render Deployment Guide

## Overview

HomeMitra is a full-stack home services app with:
- **Frontend** – plain HTML/CSS/JS (served as a Render Static Site)
- **Backend** – Spring Boot REST API (served as a Render Web Service)
- **Database** – MySQL (use Render's managed MySQL or PlanetScale free tier)

---

## What Was Fixed in This Version

| Problem | Fix Applied |
|---|---|
| Render couldn't find `index.html` (was inside `/frontend/`) | Added a root `index.html` that redirects to `frontend/index.html` |
| API URL hardcoded to `localhost:8080` | Extracted to `frontend/js/env-config.js` – edit one file to point at your live backend |
| Secrets hardcoded in `application.properties` | All secrets now read from environment variables (safe for Render) |
| No deployment config | Added `render.yaml` for one-click service setup |

---

## Step-by-Step Deployment

### 1. Push the Code to GitHub

```bash
# If you haven't already, initialise git and push
cd homemitra2
git init
git add .
git commit -m "feat: prepare for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/homemitra2.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

---

### 2. Set Up a MySQL Database

Render does not offer a free managed MySQL, so use one of these free options:

#### Option A – PlanetScale (Recommended, free tier)
1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a database named `homemitra`
3. Go to **Connect → Java / JDBC** and copy the connection string
4. It will look like: `jdbc:mysql://aws.connect.psdb.cloud/homemitra?sslMode=VERIFY_IDENTITY&...`
5. Note down the **username** and **password** shown

#### Option B – Aiven (free 30-day trial)
1. Sign up at [aiven.io](https://aiven.io)
2. Create a MySQL service
3. Copy the **Service URI** from the connection details

Run the schema after setup:
```sql
-- Connect to your remote DB and run:
source database/schema.sql
```

---

### 3. Deploy the Backend on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Fill in:
   - **Name:** `homemitra-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Java`
   - **Build Command:** `./mvnw clean package -DskipTests`
   - **Start Command:** `java -jar target/*.jar`
   - **Plan:** Free

4. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `SPRING_DATASOURCE_URL` | Your MySQL JDBC URL (from Step 2) |
| `DB_USERNAME` | Your DB username |
| `DB_PASSWORD` | Your DB password |
| `JWT_SECRET` | Any long random string (32+ chars) |
| `RAZORPAY_KEY_ID` | Your Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay key secret |
| `MAIL_USERNAME` | Your Gmail address |
| `MAIL_PASSWORD` | Your Gmail App Password (not your real password – [generate here](https://myaccount.google.com/apppasswords)) |
| `ALLOWED_ORIGINS` | `https://homemitra-frontend.onrender.com` (fill after Step 4) |

5. Click **Deploy Web Service**
6. Wait for build to complete (~3–5 min)
7. Copy your backend URL, e.g. `https://homemitra-backend.onrender.com`

---

### 4. Update Frontend to Point at Your Backend

Open `frontend/js/env-config.js` and replace the placeholder URL:

```js
// Before:
window.API_BASE_URL = 'https://YOUR-BACKEND-SERVICE.onrender.com';

// After (use your actual backend URL from Step 3):
window.API_BASE_URL = 'https://homemitra-backend.onrender.com';
```

Commit and push:
```bash
git add frontend/js/env-config.js
git commit -m "chore: set production backend URL"
git push
```

---

### 5. Deploy the Frontend on Render

1. Go to [render.com](https://render.com) → **New → Static Site**
2. Connect the same GitHub repo
3. Fill in:
   - **Name:** `homemitra-frontend`
   - **Root Directory:** *(leave blank – root of repo)*
   - **Build Command:** *(leave blank or type `echo ok`)*
   - **Publish Directory:** `.` *(the root, where your new `index.html` lives)*
4. Click **Deploy Static Site**
5. Your site will be live at `https://homemitra-frontend.onrender.com`

---

### 6. Update CORS on the Backend

Go back to your backend service on Render and update the env var:

```
ALLOWED_ORIGINS = https://homemitra-frontend.onrender.com
```

Trigger a redeploy (or it will pick it up automatically on next deploy).

---

## Local Development (No Changes Needed)

Everything still works locally as before:

```bash
# Terminal 1: Start backend
cd backend
./mvnw spring-boot:run

# Terminal 2: Serve frontend (e.g. with VS Code Live Server or Python)
cd ..
python3 -m http.server 3000
# Open: http://localhost:3000/frontend/
```

`env-config.js` sets `API_BASE_URL` to your Render backend URL — to test locally, temporarily change it back to `http://localhost:8080`, or override it in your browser console:
```js
window.API_BASE_URL = 'http://localhost:8080';
```

---

## Folder Structure After Fix

```
homemitra2/
├── index.html                  ← NEW: root redirect to frontend/
├── render.yaml                 ← NEW: Render service definitions
├── .gitignore                  ← NEW: excludes target/, .class files
├── frontend/
│   ├── index.html              ← Main homepage
│   ├── css/
│   │   └── global.css
│   ├── js/
│   │   ├── env-config.js       ← NEW: set your backend URL here
│   │   └── api.js              ← Updated: reads URL from env-config.js
│   └── pages/
│       ├── login.html
│       ├── register.html
│       ├── dashboard.html
│       └── ...
├── backend/
│   ├── pom.xml
│   └── src/main/resources/
│       └── application.properties  ← Updated: uses env vars, no hardcoded secrets
└── database/
    └── schema.sql
```

---

## Troubleshooting

**Build fails on Render (Maven wrapper not executable)**
```bash
git update-index --chmod=+x backend/mvnw
git commit -m "fix: make mvnw executable"
git push
```

**CORS errors in browser console**
- Ensure `ALLOWED_ORIGINS` env var on the backend matches your exact frontend URL (no trailing slash)
- Check `SecurityConfig.java` — confirm it reads `app.cors.allowed-origins`

**Free tier backend goes to sleep**
- Render free web services spin down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to respond
- Upgrade to a paid plan or use a cron job (e.g. UptimeRobot) to ping the backend every 10 minutes

**Database connection refused**
- Verify your JDBC URL, username, and password env vars on Render
- For PlanetScale, make sure SSL params are included in the URL

---

## Security Checklist Before Going Live

- [ ] Change `JWT_SECRET` to a unique random value
- [ ] Use Gmail App Password (not real password) for `MAIL_PASSWORD`
- [ ] Switch to Razorpay live keys when ready
- [ ] Do not commit `application.properties` with real credentials (it's now env-var based ✅)
- [ ] Remove `target/` directory from git history if it was committed before

---

*Last updated: April 2026*
