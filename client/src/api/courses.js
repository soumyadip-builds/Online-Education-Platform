// src/api/courses.js

function resolveBaseUrl() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
      return window.__API_BASE_URL__;
    }
  } catch (_) {}
  return 'http://localhost:8000';
  // Default to server port 5000 (server/index.js uses PORT 5000)
  // Keep env overrides (VITE_API_BASE_URL / REACT_APP_API_BASE_URL) available.
}

const BASE_URL = resolveBaseUrl();

/**
 * Create a course (POST /api/courses)
 * Reads JWT from localStorage key 'auth_token'
 */
export async function createCourse(payload) {
  const token = (typeof window !== 'undefined' && window.localStorage)
    ? localStorage.getItem('auth_token')
    : null;

  const res = await fetch(`${BASE_URL}/api/courses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // If using cookie-based auth instead of Bearer, use:
    // credentials: 'include',
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }

  if (!res.ok) {
    const details = typeof data === 'object' ? JSON.stringify(data) : data;
    throw new Error(`${data?.message || 'Failed to create course'} [${res.status}] ${details || ''}`);
  }
  return data;
}

export async function listMyCourses() {
  const token = (typeof window !== 'undefined' && window.localStorage)
    ? localStorage.getItem('auth_token')
    : null;

  const res = await fetch(`${BASE_URL}/api/courses`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    // credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch courses [${res.status}] ${text || ''}`);
  }
  return res.json();
}