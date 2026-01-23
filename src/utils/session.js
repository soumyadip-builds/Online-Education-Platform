
// src/utils/session.js

// Keys
const SESSION_KEY = 'edstream_current_user';
const USERS_KEY = 'edstream_users';

// A tiny helper to notify this-tab listeners that session changed
function notifySessionChanged() {
  try {
    // Custom event for same-tab listeners (Navbar, etc.)
    window.dispatchEvent(new Event('session-changed'));
  } catch (_) {
    // noop
  }
}

/**
 * Return currently signed-in (session) user.
 * Session is always persisted to localStorage (no "remember me" toggle).
 */
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to parse current user:', e);
    return null;
  }
};

/**
 * Create/update the current session with a minimal, password-free payload.
 * (Use the users collection for password & full profile.)
 */
export const createSession = (user) => {
  try {
    // Minimal session payload (no password)
    const sessionUser = {
      role: user.role,
      name: user.name,
      email: user.email,
      dob: user.dob ?? '',
      gender: user.gender ?? '',
      experience: user.experience ?? '',
      skills: user.skills ?? [],
      domainInterests: user.domainInterests ?? [],
      occupation: user.occupation ?? '',
      createdAt: user.createdAt ?? new Date().toISOString(),
      issuedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    // Notify same-tab listeners
    notifySessionChanged();

    return { ok: true, user: sessionUser };
  } catch (e) {
    console.error('Failed to create session:', e);
    return { ok: false, error: 'Failed to create session.' };
  }
};

export const destroySession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);

    // Notify same-tab listeners
    notifySessionChanged();
  } catch (e) {
    console.error('Failed to destroy session:', e);
  }
};

export const isAuthenticated = () => !!getCurrentUser();

/* ---------------------- Users collection helpers (always in localStorage) ---------------------- */
const getUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse users:', e);
    return [];
  }
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Register or upsert a user record into localStorage users collection.
 * Expecting an object that can include password and all profile fields.
 */
export const upsertUser = (user) => {
  const users = getUsers();
  const idx = users.findIndex(
    (u) => (u.email || '').toLowerCase() === (user.email || '').toLowerCase()
  );
  if (idx > -1) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  saveUsers(users);
  return user;
};

export const getUserByEmail = (email) => {
  if (!email) return null;
  const users = getUsers();
  return (
    users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) ||
    null
  );
};

export const updateUserByEmail = (email, updates = {}) => {
  const users = getUsers();
  const idx = users.findIndex(
    (u) => (u.email || '').toLowerCase() === (email || '').toLowerCase()
  );
  if (idx === -1) return { ok: false, error: 'User not found' };
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return { ok: true, user: users[idx] };
};
