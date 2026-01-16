// src/utils/userStorage.js
const STORAGE_KEY = 'edstream_users';

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

  const newUser = {
    role: user.role,
    name: user.name,
    email: user.email,
    password: user.password, // NOTE: plain text for demo only
    dob: user.dob || '',
    gender: user.gender || '',
    experience: user.role === 'instructor' ? Number(user.experience || 0) : undefined,
    skills: user.role === 'instructor' ? (user.skills || []) : undefined,
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