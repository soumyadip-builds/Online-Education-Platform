// centralized keys for consistency
const AUTH_USER_KEY = "auth_user";
const AUTH_TOKEN_KEY = "auth_token";

// get the authenticated user object
export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// get the jwt access token
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || null;
}

// is there both a user object and a jwt token
export function isAuthed() {
  return Boolean(getAuthUser() && getAuthToken());
}

// saves the user object and the jwt after successful login.
export function createLocalSession({ user, token }) {
  if (!user || !token) {
    throw new Error("createLocalSession requires { user, token }");
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  window.dispatchEvent(new Event("auth-changed")); // if one component logs a user out then by firing a custom auth-changed event, this module broadcasts a message to the entire browser window that login status changed
}

// clear auth state
export function clearLocalSession() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);

  window.dispatchEvent(new Event("auth-changed"));
}

// return authorization header object: { Authorization: 'Bearer <token>' } or {} used in fetch() calls to backend.
export function getAuthHeader() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// role-based redirect helper
export function redirectByRole(navigate, user = getAuthUser()) {
  const role = user?.role;
  if (role === "learner")
    navigate("/student-home", { replace: true }); // it prevents user from clicking back and getting stuck in a redirect loop.
  else if (role === "instructor")
    navigate("/instructor-home", { replace: true });
  else navigate("/not-authorized", { replace: true });
}

// if not authenticated, then back to the /auth - login page.
export function requireAuth(navigate, to = "/auth") {
  if (!isAuthed()) navigate(to, { replace: true });
}

// watch for auth changes, returns an unsubscribe fn.
export function subscribeAuth(handler) {
  const fn = () => handler?.(getAuthUser());
  window.addEventListener("auth-changed", fn);
  return () => window.removeEventListener("auth-changed", fn);
}

// export keys if other modules need them
export const __authKeys = { AUTH_USER_KEY, AUTH_TOKEN_KEY };
