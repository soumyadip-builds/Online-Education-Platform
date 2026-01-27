
// src/utils/userStorage.js
const STORAGE_KEY = 'edstream_users';
const COUNTERS_KEY = 'edstream_userid_counters'; // { instructor: number, learner: number }

// ---------- Sequential ID helpers ----------
function readCounters() {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return {
      instructor: Number.isInteger(obj?.instructor) ? obj.instructor : 0,
      learner: Number.isInteger(obj?.learner) ? obj.learner : 0,
    };
  } catch (e) {
    console.error('Failed to read userId counters:', e);
    return { instructor: 0, learner: 0 };
  }
}

function writeCounters(counters) {
  localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

function roleToKey(role = '') {
  return role === 'instructor' ? 'instructor' : 'learner';
}

function rolePrefix(role = '') {
  return role === 'instructor' ? 'I' : 'L';
}

/**
 * Return next sequential 4-char userId for the given role.
 * - Instructor: I001..I999
 * - Learner:    L001..L999
 */
function nextSequentialId(role) {
  const key = roleToKey(role);
  const counters = readCounters();
  const next = (counters[key] ?? 0) + 1; // start at 1
  if (next > 999) {
    throw new Error(`ID space exhausted for role ${key}.`);
  }
  counters[key] = next;
  writeCounters(counters);
  return `${rolePrefix(role)}${String(next).padStart(3, '0')}`;
}
// ------------------------------------------

export const getUsers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse users:', e);
    return [];
  }
};

export const saveUsers = (users) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

export const addUser = (user) => {
  const users = getUsers();
  const exists = users.some(
    (u) => u.email.toLowerCase() === (user.email || '').toLowerCase()
  );
  if (exists) {
    return { ok: false, error: 'Email is already registered.' };
  }

  // Generate sequential userId
  let userId;
  try {
    userId = nextSequentialId(user.role);
  } catch (e) {
    console.error(e);
    return { ok: false, error: e.message || 'Could not generate userId.' };
  }

  const newUser = {
    userId,
    role: user.role,
    name: user.name,
    email: user.email,
    password: user.password, // NOTE: plain text for demo only (dev use)
    dob: user.dob || '',
    gender: user.gender || '',
    // instructor-only
    experience: user.role === 'instructor' ? Number(user.experience || 0) : undefined,
    skills: user.role === 'instructor' ? (user.skills || []) : undefined,
    // learner-only
    domainInterests: user.role === 'learner' ? (user.domainInterests || []) : undefined,
    occupation: user.role === 'learner' ? user.occupation : undefined,

    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  return { ok: true, user: newUser };
};

export const findUser = (email) => {
  const users = getUsers();
  return users.find(
    (u) => u.email.toLowerCase() === (email || '').toLowerCase()
  );
};
