/*
export function getAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user") || localStorage.getItem("auth_users");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function redirectByRole(navigate, user = getAuthUser()) {
  const role = user?.role;
  if (role === "learner") navigate("/student-home", { replace: true });
  else if (role === "instructor") navigate("/instructor-home", { replace: true });
  else navigate("/not-authorized", { replace: true });
}

export function getAuthToken() {
  return localStorage.getItem('auth_token') || null;
}
export function isAuthed() {
  return Boolean(getAuthToken() && getAuthUser());
}
export function createLocalSession({ user, token }) {
  // called on successful LOGIN only
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem('auth_token', token);
  // optional: notify other tabs
  window.dispatchEvent(new Event('storage')); // triggers listeners cross-tab
  window.dispatchEvent(new Event('auth-changed'));
}
export function clearLocalSession() {
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_token');
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('auth-changed'));
}
*/

// Centralized keys for consistency
const AUTH_USER_KEY = 'auth_user';
const AUTH_TOKEN_KEY = 'auth_token';

/** Get the authenticated user object. */
export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Get the JWT access token (string or null). */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || null;
}

/** Is there both a user object and a JWT token? */
export function isAuthed() {
  return Boolean(getAuthUser() && getAuthToken());
}

/** Persist user + token after successful login. */
export function createLocalSession({ user, token }) {
  if (!user || !token) {
    throw new Error('createLocalSession requires { user, token }');
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  // Notify listeners (same-tab) and other app parts
  window.dispatchEvent(new Event('auth-changed'));
}

/** Clear auth state. */
export function clearLocalSession() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);

  window.dispatchEvent(new Event('auth-changed'));
}

/** Return Authorization header object: { Authorization: 'Bearer <token>' } or {} */
export function getAuthHeader() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Role-based redirect helper */
export function redirectByRole(navigate, user = getAuthUser()) {
  const role = user?.role;
  if (role === 'learner') navigate('/student-home', { replace: true });
  else if (role === 'instructor') navigate('/instructor-home', { replace: true });
  else navigate('/not-authorized', { replace: true });
}

/** Guard utility for imperative redirects inside components */
export function requireAuth(navigate, to = '/auth') {
  if (!isAuthed()) navigate(to, { replace: true });
}

/** Subscribe to auth changes. Returns an unsubscribe fn. */
export function subscribeAuth(handler) {
  const fn = () => handler?.(getAuthUser());
  window.addEventListener('auth-changed', fn);
  return () => window.removeEventListener('auth-changed', fn);
}

// (Optional) export keys if other modules need them
export const __authKeys = { AUTH_USER_KEY, AUTH_TOKEN_KEY };