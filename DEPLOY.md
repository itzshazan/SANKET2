# Deploying SANKET

| Part | Where | Folder |
|---|---|---|
| Website (React) | **Vercel** | `web/` |
| API (FastAPI) | **Render** | project root (`module1/`, `module3/`) |
| Accounts | **Supabase** | already set up, see `supabase/README.md` |

Do the steps in order: the website needs the API's address, and the API needs the website's address.

---

## 0. Before you start

**Revoke the old leaked keys.** An earlier version of `web/src/config/keys.js` had API keys written into it, and that
file is in this repository's git history (all commits up to `b65827a`). The current code does not use any of them, so
revoking them breaks nothing. In each provider's dashboard, delete or regenerate the key:
Cesium ion (access token), Google Cloud (Maps API key), NASA FIRMS (map key), TomTom (API key), AISStream (API key).
If the GitHub repository is or was public, treat them as public. Removing them from history as well needs a history
rewrite (`git filter-repo`) and a force-push; revoking is what actually protects you.

**Push the code to GitHub.** `.env`, the local database and the downloaded model are git-ignored and never uploaded.
Check with `git status` that no `.env` file is listed before you commit.

**Optional: include the past-landslide records.** `module1/data/raw/landslide/` (GSI, NASA GLC and COOLR files, about
62 MB) is git-ignored because of its size, so a server built from GitHub shows no past-landslide counts. To include it:

```bash
git add -f module1/data/raw/landslide/*.csv module1/data/raw/landslide/*.geojson
```

(`-f` adds these files despite the ignore rule. GitHub warns about the 52 MB GSI file but accepts it.)

---

## 1. API on Render

1. https://dashboard.render.com → **New** → **Web Service** → **Build and deploy from a Git repository** → pick the repository.
2. Settings:

   | Field | Value |
   |---|---|
   | Region | **Singapore** (closest to India and to the Supabase Mumbai project) |
   | Branch | `main` |
   | Root Directory | *(leave empty)* |
   | Runtime | **Python 3** |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn module1.api.main:app --host 0.0.0.0 --port $PORT` |
   | Health Check Path | `/api/v1/module1/health` (under *Advanced*) |
   | Instance Type | see the table below |

3. **Environment variables** (copy the values from your local `.env`; never put them in the code):

   | Key | Value |
   |---|---|
   | `PYTHON_VERSION` | `3.14.3` (the version SANKET is tested on) |
   | `SUPABASE_URL` | from `.env` |
   | `SUPABASE_ANON_KEY` | from `.env` |
   | `SUPABASE_SERVICE_ROLE_KEY` | from `.env` (secret: server only) |
   | `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET` | from `.env` (vegetation / NDVI) |
   | `NASA_EARTHDATA_TOKEN` | from `.env`, if you have it |
   | `SANKET_CORS_ORIGINS` | your Vercel address, added in step 3 |

4. **Create Web Service**. When it is live, open `https://<your-service>.onrender.com/api/v1/module1/health`; it
   should answer with JSON. Copy this `https://<your-service>.onrender.com` address for step 2.

**Which instance type** (measured: the API uses about 200 MB; checking one road photo needs about 1.2 GB):

| | Free (512 MB) | Standard (2 GB) |
|---|---|---|
| Everything except road photos | ✓ | ✓ |
| Road Blockage photo check | shows "not installed on this server" | ✓ with the build command below |
| Sleeps when idle | after 15 min (first visit then takes about a minute) | no |

For road photos use **Standard** and this Build Command (CPU-only PyTorch, then the 237 MB model):

```bash
pip install -r requirements.txt -r requirements-road.txt && python -m module3.download_weights
```

**Field reports and incidents** are stored in a SQLite file. Render's disk is wiped on every deploy and restart, so
on a plain instance they are lost. To keep them (paid instances): service → **Disks** → **Add disk**, mount path
`/var/data`, 1 GB, and add the environment variable `SANKET_DB_PATH=/var/data/sanket.db`.

---

## 2. Website on Vercel

1. https://vercel.com/new → **Import** the same GitHub repository.
2. **Root Directory**: click *Edit* → choose `web`. Framework **Vite** is detected; build command and output folder
   come from `web/vercel.json` (it also makes page links like `/login` and `/monitor` work on refresh).
3. **Environment Variables**: `VITE_API_BASE_URL` = `https://<your-service>.onrender.com` (no slash at the end).
4. **Deploy**. Your site is `https://<your-project>.vercel.app`.

`VITE_API_BASE_URL` is built into the site, so after changing it press **Redeploy** in Vercel.

---

## 3. Connect them

1. **Render** → your service → **Environment** → set `SANKET_CORS_ORIGINS` = `https://<your-project>.vercel.app`
   → save (Render redeploys). From now on only your website may call the API from a browser.
2. **Supabase** → Authentication → **URL Configuration**:
   - Site URL: `https://<your-project>.vercel.app`
   - Redirect URLs → **Add URL**: `https://<your-project>.vercel.app/**` (keep `http://localhost:5180/**` for local work)
3. **Google Cloud** → APIs & Services → Credentials → your OAuth client → **Authorized JavaScript origins** → add
   `https://<your-project>.vercel.app`. The redirect URI stays the Supabase callback. While the consent screen is in
   *Testing*, only listed test users can use Google sign-in; press **Publish app** to open it to everyone.

---

## 4. Check

- `https://<your-project>.vercel.app` loads the home page; `https://<your-project>.vercel.app/monitor` opened directly
  asks you to sign in, then shows Live Monitor (proves the page links work).
- Sign in with email and with Google; the Admin page shows **System health**.
- On the free plan, if the first page says the server is not reachable, the API is waking up: wait a minute and reload.

## Later

- Custom domain: add it in Vercel (Settings → Domains), then repeat step 3 with the new address.
- For records that survive restarts on any plan, move field reports and incidents from SQLite into the Supabase
  database the accounts already use.
