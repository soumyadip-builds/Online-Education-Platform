// src/utils/userStorage.js

const STORAGE_KEY = 'edstream_users';

/* -------------------- Core CRUD -------------------- */
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

/* Event emitters to keep UI in sync (Navbar listens to `session-changed`) */
const emitUserMutated = (email) => {
  try {
    window.dispatchEvent(new CustomEvent('users-changed', { detail: { email }}));
    window.dispatchEvent(new Event('session-changed'));
  } catch {
    // noop for non-browser envs
  }
};

/* Ensure learner/instructor schema fields exist for a user object */
const ensureRoleArrays = (user) => {
  if (user.role === 'learner') {
    if (!Array.isArray(user.coursesEnrolled)) user.coursesEnrolled = [];
  } else if (user.role === 'instructor') {
    if (!Array.isArray(user.coursesCreated)) user.coursesCreated = [];
  }
};

/* One-time migration for existing stored users */
const migrateUsersIfNeeded = () => {
  const users = getUsers();
  let changed = false;
  for (const u of users) {
    const before = JSON.stringify(u);
    ensureRoleArrays(u);
    if (!u.createdAt) u.createdAt = new Date().toISOString();
    if (before !== JSON.stringify(u)) changed = true;
  }
  if (changed) saveUsers(users);
};
migrateUsersIfNeeded();

export const addUser = (user) => {
  const users = getUsers();
  const exists = users.some(
    (u) => u.email.toLowerCase() === (user.email || '').toLowerCase()
  );
  if (exists) {
    return { ok: false, error: 'Email is already registered.' };
  }

  const newUser = {
    role: user.role,                   // 'learner' | 'instructor'
    name: user.name,
    email: user.email,
    password: user.password,           // NOTE: plain text for demo only
    dob: user.dob || '',
    gender: user.gender || '',
    experience: user.role === 'instructor' ? Number(user.experience || 0) : undefined,
    skills: user.role === 'instructor' ? (user.skills || []) : undefined,
    domainInterests: user.role === 'learner' ? (user.domainInterests || []) : undefined,
    occupation: user.role === 'learner' ? user.occupation : undefined,

    // NEW: role-specific arrays
    coursesEnrolled: user.role === 'learner' ? [] : undefined,
    coursesCreated: user.role === 'instructor' ? [] : undefined,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  emitUserMutated(newUser.email);
  return { ok: true, user: newUser };
};

export const findUser = (email) => {
  const users = getUsers();
  return users.find(
    (u) => u.email.toLowerCase() === (email || '').toLowerCase()
  );
};

/* -------------------- Safe updaters -------------------- */

/**
 * Internal: patch a single user by email with a mutator, then save & emit.
 */
const updateUserByEmail = (email, mutator) => {
  const users = getUsers();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === (email || '').toLowerCase()
  );
  if (idx === -1) return { ok: false, error: 'User not found.' };

  // Work on a copy to avoid accidental shared mutations
  const next = { ...users[idx] };
  ensureRoleArrays(next);

  try {
    mutator(next);
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to update user.' };
  }

  next.updatedAt = new Date().toISOString();
  users[idx] = next;
  saveUsers(users);
  emitUserMutated(next.email);

  return { ok: true, user: next };
};

/* -------------------- Public API: Learner -------------------- */

/**
 * Enroll a learner into a course (no duplicates).
 */
export const enrollInCourse = (studentEmail, courseId) =>
  updateUserByEmail(studentEmail, (u) => {
    if (u.role !== 'learner') {
      throw new Error('Only learners can enroll in courses.');
    }
    if (!courseId) {
      throw new Error('courseId is required.');
    }
    if (!u.coursesEnrolled.includes(courseId)) {
      u.coursesEnrolled.push(courseId);
    }
  });

/**
 * Unenroll a learner from a course.
 */
export const unenrollFromCourse = (studentEmail, courseId) =>
  updateUserByEmail(studentEmail, (u) => {
    if (u.role !== 'learner') {
      throw new Error('Only learners can unenroll from courses.');
    }
    u.coursesEnrolled = (u.coursesEnrolled || []).filter((id) => id !== courseId);
  });


/* -------------------- Public API: Instructor -------------------- */

/**
 * Record a course created by an instructor (no duplicates).
 */
export const recordCourseCreated = (instructorEmail, courseId) =>
  updateUserByEmail(instructorEmail, (u) => {
    if (u.role !== 'instructor') {
      throw new Error('Only instructors can create courses.');
    }
    if (!courseId) {
      throw new Error('courseId is required.');
    }
    if (!u.coursesCreated.includes(courseId)) {
      u.coursesCreated.push(courseId);
    }
  });

/**
 * Remove a course from the instructor's created list.
 * (Use when a course is deleted or ownership changes.)
 */
export const removeCourseCreated = (instructorEmail, courseId) =>
  updateUserByEmail(instructorEmail, (u) => {
    if (u.role !== 'instructor') {
      throw new Error('Only instructors can remove created courses.');
    }
    u.coursesCreated = (u.coursesCreated || []).filter((id) => id !== courseId);
  });