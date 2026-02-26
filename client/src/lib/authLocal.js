// ---- Local auth helpers (localStorage only; no sessionStorage) ----

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