import React, { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { useAuth } from './auth/AuthContext.jsx';
import AppShell from './AppShell.jsx';
import { ALIASES, APP_ROUTES, landingPath, pathFor, resolveRoute, routeForPath } from './routes.js';
import {
  AuthCallback, NotFound, PublicOnly, Redirect, RequireActive, RequireSession, RouteError, useGo,
} from './routing.jsx';

// URL map (clean paths, browser history):
//   /                                  home page (public)
//   /login  /signup                    sign-in pages (signed-in users are sent on)
//   /pending                           waiting for approval (needs a session)
//   /auth/callback                     Google sign-in returns here
//   /overview  /monitor?district=...   the app (needs an approved account; role checked per page)
//   /dashboard, /#monitor, ...         old links redirect to their new path
//   anything else                      404 page

const Home = lazy(() => import('./views/home/Home.jsx'));
const AuthPages = lazy(() => import('./views/auth/AuthPages.jsx'));
const Blank = () => <div style={{ minHeight: '100vh', background: '#f7f4ef' }} />;

function HomePage() {
  const auth = useAuth();
  const go = useGo();
  const signedIn = !!(auth.ready && auth.session && auth.profile?.status === 'active');
  // "Open dashboard": a signed-in user's own start page; otherwise the overview (sign-in comes first)
  const onDashboard = () => go(signedIn ? landingPath(auth.profile) : 'overview');
  return (
    <Suspense fallback={<Blank />}>
      <Home goTo={(id, p) => go(id, { districtId: p?.districtId })} onDashboard={onDashboard} signedIn={signedIn} />
    </Suspense>
  );
}

const AuthScreen = ({ mode }) => <Suspense fallback={<Blank />}><AuthPages mode={mode} /></Suspense>;

function Root() {
  const loc = useLocation();
  const route = routeForPath(loc.pathname);
  useEffect(() => {
    document.title = !route ? 'Page not found · SANKET'
      : route.id === 'home' ? 'SANKET — Landslide Early Warning' : `${route.title} · SANKET`;
  }, [route]);

  // Old hash links (/#monitor) from before clean URLs
  const legacy = loc.pathname === '/' && loc.hash && resolveRoute(loc.hash);
  if (legacy) return <Navigate to={pathFor(legacy)} replace />;
  // Google came back to some other page (e.g. Supabase fell back to the site root): finish signing in
  if (/[?&](code|error)=/.test(loc.search) && loc.pathname !== '/auth/callback') {
    return <Navigate to={`/auth/callback${loc.search}`} replace />;
  }
  return <><Outlet /><ScrollRestoration /></>;
}

const router = createBrowserRouter([{
  element: <Root />,
  errorElement: <RouteError />,
  children: [
    { path: '/', element: <HomePage /> },
    { element: <PublicOnly />, children: [
      { path: '/login', element: <AuthScreen mode="login" /> },
      { path: '/signup', element: <AuthScreen mode="signup" /> },
    ] },
    { path: '/pending', element: <RequireSession><AuthScreen mode="pending" /></RequireSession> },
    { path: '/auth/callback', element: <AuthCallback /> },
    { element: <RequireActive />, children: [
      { element: <AppShell />, children: APP_ROUTES.map((r) => ({ path: r.path, handle: { id: r.id } })) },
    ] },
    ...Object.entries(ALIASES).map(([alias, id]) => ({ path: `/${alias}`, element: <Redirect to={pathFor(id)} /> })),
    { path: '*', element: <NotFound /> },
  ],
}]);

export default function App() {
  return <RouterProvider router={router} />;
}
