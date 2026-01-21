
// src/utils/session.js
const SESSION_KEY = 'edstream_current_user';
const REMEMBERED_SESSION_KEY = 'edstream_remembered'; // boolean flag

const getActiveStore = () => {
  const remembered = localStorage.getItem(REMEMBERED_SESSION_KEY) === 'true';
  return remembered ? localStorage : sessionStorage;
};

export const getCurrentUser = () => {
  try {
    const store = getActiveStore();
    const raw = store.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to parse current user:', e);
    return null;
  }
};

export const createSession = (user, remember = false) => {
  try {
    // Clear from both stores to avoid duplicates
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);

    // Persist the remember choice
    localStorage.setItem(REMEMBERED_SESSION_KEY, String(!!remember));

    // Store a minimal, password-free payload
    const sessionUser = {
      role: user.role,
      name: user.name,
      email: user.email,
      dob: user.dob || '',
      gender: user.gender || '',
      experience: user.experience,
      skills: user.skills,
      domainInterests: user.domainInterests,
      occupation: user.occupation,
      createdAt: user.createdAt,
      issuedAt: new Date().toISOString(),
    };

    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return { ok: true, user: sessionUser };
  } catch (e) {
    console.error('Failed to create session:', e);
    return { ok: false, error: 'Failed to create session.' };
  }
};

export const destroySession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBERED_SESSION_KEY);
  } catch (e) {
    console.error('Failed to destroy session:', e);
  }
};

export const isAuthenticated = () => !!getCurrentUser();
