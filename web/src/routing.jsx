import React, { useCallback, useEffect } from 'react';
import { Link, Navigate, Outlet, isRouteErrorResponse, useLocation, useNavigate, useRouteError, useSearchParams } from 'react-router';
import { useAuth } from './auth/AuthContext.jsx';
import Brand from './components/Brand.jsx';
import { WakeNote } from './components/ServerWake.jsx';
import { DEFAULT_ROUTE, getRoute, landingPath, pathFor, safeNext } from './routes.js';

// Route guards and the small full-page screens around them. Every redirect decision lives here, as
// declarative <Navigate replace>, so the Back button never returns to a page that just redirected.

/** Navigate by page id ("monitor") or by path ("/monitor?district=chamoli"). */
export function useGo() {
  const navigate = useNavigate();
  return useCallback((to, { districtId, replace = false, state } = {}) => {
    const path = String(to).startsWith('/') ? to : pathFor(to, { districtId });
    navigate(path, { replace, state });
  }, [navigate]);
}

/** Keeps the query string (e.g. ?district=) when an old path redirects to its new one. */
export function Redirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

export function SigningIn({ text = 'Checking your sign-in…' }) {
  return <div className="signing-in" role="status"><Brand /><span><i />{text}</span><WakeNote /></div>;
}

const loginWithNext = (loc) => `/login?next=${encodeURIComponent(loc.pathname + loc.search)}`;

/** The signed-in app: needs an account that an administrator has approved. */
export function RequireActive() {
  const auth = useAuth();
  const loc = useLocation();
  if (!auth.ready) return <SigningIn />;
  if (!auth.configured || !auth.session) return <Navigate to={loginWithNext(loc)} replace />;
  if (!auth.profile) return auth.error ? <Navigate to="/pending" replace /> : <SigningIn />;
  if (auth.profile.status !== 'active') return <Navigate to="/pending" replace />;
  return <Outlet />;
}

/** Sign-in and sign-up: someone already signed in goes on to the app. */
export function PublicOnly() {
  const auth = useAuth();
  const [params] = useSearchParams();
  if (auth.ready && auth.session) {
    if (auth.profile || auth.error) return <Navigate to={landingPath(auth.profile, params.get('next'))} replace />;
    return <SigningIn text="Signing you in…" />;
  }
  return <Outlet />;
}

/** The waiting screen: needs a session; once approved, continues to the app. */
export function RequireSession({ children }) {
  const auth = useAuth();
  if (!auth.ready) return <SigningIn />;
  if (!auth.configured || !auth.session) return <Navigate to="/login" replace />;
  if (auth.profile?.status === 'active') return <Navigate to={landingPath(auth.profile)} replace />;
  return children;
}

/** Google sends the user back here (?code=...). Supabase swaps the code for a session, then we continue. */
export function AuthCallback() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const cancelled = params.get('error');
  const done = auth.ready && (!auth.session || auth.profile || auth.error);
  useEffect(() => { if (done && auth.session) auth.recordSignIn(); }, [done, auth.session]);

  if (!done) return <SigningIn text="Signing you in…" />;
  if (!auth.session) {
    const error = cancelled ? 'Google sign-in was cancelled.' : 'Google sign-in did not finish. Please try again.';
    return <Navigate to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace state={{ error }} />;
  }
  return <Navigate to={landingPath(auth.profile, next)} replace />;
}

// ---------------------------------------------------------------- status pages
function StatusPage({ code, title, text, children }) {
  return (
    <main className="status-page">
      <Link to="/" className="status-brand" aria-label="SANKET home"><Brand /></Link>
      <div className="status-body">
        {code && <div className="status-code">{code}</div>}
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="status-actions">{children}</div>
      </div>
    </main>
  );
}

export function NotFound() {
  const auth = useAuth();
  const role = auth?.role;
  return (
    <StatusPage code="404" title="Page not found" text="The link may be old or mistyped.">
      <Link className="status-btn" to="/">Go to home</Link>
      {role && <Link className="status-btn ghost" to={pathFor(DEFAULT_ROUTE[role])}>Open dashboard</Link>}
    </StatusPage>
  );
}

/** Shown inside the app shell when a signed-in user opens a page their role cannot use. */
export function NoAccess({ role }) {
  const home = getRoute(DEFAULT_ROUTE[role]);
  return (
    <div className="no-access">
      <h2>You don’t have access to this page</h2>
      <p>Your role does not include it. Ask an administrator if you need it.</p>
      {home && <Link className="status-btn" to={home.path}>Go to {home.title}</Link>}
    </div>
  );
}

/** Last-resort error page, e.g. a page's code failed to download after a new release. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  return (
    <StatusPage title="Something went wrong" text="This page could not be shown. Reloading usually fixes it.">
      <button className="status-btn" onClick={() => window.location.reload()}>Reload</button>
      <Link className="status-btn ghost" to="/">Go to home</Link>
    </StatusPage>
  );
}
