# Setting up sign-in (Supabase)

SANKET uses Supabase (cloud, free plan) for accounts: **email + password** and **Continue with Google**.
No email codes. Every new account waits until an admin approves it in SANKET's **Admin** page.

## 1. Create the project
1. Sign in at https://supabase.com → **New project**.
2. Region: **South Asia (Mumbai)**, so data stays in India.

## 2. Create SANKET's tables
**SQL Editor → New query**, paste all of [`migrations/0001_sanket_auth.sql`](migrations/0001_sanket_auth.sql), press **Run**.

## 3. Email + password without codes
**Authentication → Sign In / Providers → Email**: keep **Enable Email provider** on, turn **Confirm email off**, **Save**.

**Authentication → URL Configuration**:
- Site URL: `http://localhost:5180`
- Redirect URLs → **Add URL**: `http://localhost:5180/**` (Google sign-in returns to `/auth/callback`, which this covers)

When SANKET goes live on a real domain, add `https://<your-domain>/**` here too, and make the web server
answer every page path (`/login`, `/monitor`, ...) with `index.html`, as single-page-app hosts do by default.

## 4. Google sign-in
**a. Google Cloud** (https://console.cloud.google.com, any Google account):
1. Create a project (top bar → *New project*, e.g. `sanket`).
2. **APIs & Services → OAuth consent screen** (or *Google Auth Platform → Branding*): app name `SANKET`,
   your email as support and developer contact, audience **External**, save. While it is in *Testing*,
   add your Google accounts under **Test users** (or press **Publish app**).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5180`
   - Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
     (copy the exact *Callback URL* shown on Supabase's Google provider page)
4. Copy the **Client ID** and **Client secret**.

**b. Supabase**: **Authentication → Sign In / Providers → Google** → enable, paste the Client ID and Client
secret, **Save**.

## 5. Give SANKET the keys
**Project Settings → API Keys** (and **Data API** for the URL). Add to `.env` in the project root:

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>   # server only, never share or commit
# only if your project still uses the legacy JWT secret:
# SUPABASE_JWT_SECRET=<JWT secret>
```

Restart the API (`.\start.ps1`). The browser gets only the public key, from `/api/v1/module1/auth/config`.

## 6. Make yourself the first admin
1. Open SANKET → **Log in** → sign up (email or Google). Google users pick their role on the next screen.
2. In **SQL Editor** run (with your email):
   ```sql
   update public.profiles set role = 'admin', status = 'active', approved_at = now()
    where email = 'you@example.com';
   ```
3. Press **Check again** on the waiting screen. **Admin** now appears in the sidebar; approve everyone else there.

Forgot password: an admin can reset it in Supabase (**Authentication → Users → … → Send password recovery**
needs email set up), or the user signs in with Google using the same email.

## Who can do what
| | Field officer | District officer | Admin |
|---|---|---|---|
| Field Officer View, Road Blockage, Alerts, Data & Model | ✓ | ✓ | ✓ |
| Overview, Live Monitor, 3D Globe, History, Infrastructure, Reports | | ✓ | ✓ |
| Send field reports | ✓ | ✓ | ✓ |
| Create / update incidents, read field reports | | ✓ | ✓ |
| Approve accounts, change roles and districts, activity log | | | ✓ |

The home page and the live district overview stay public.
