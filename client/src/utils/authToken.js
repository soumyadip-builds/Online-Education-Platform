export function getAuthToken() {
  try {
    const t = localStorage.getItem('auth_token'); // single source of truth
    return (typeof t === 'string' && t.trim()) ? t : null;
  } catch {
    return null;
  }
}