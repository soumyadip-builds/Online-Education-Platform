
//LocalStorage helper
const LS_KEY = 'cb_assignments_v1';

function lsLoad() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function lsSave(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function lsCreate(payload) {
  const list = lsLoad();
  const id = 'a_' + Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();
  const created = { id, createdAt: now, updatedAt: now, ...payload };
  list.push(created);
  lsSave(list);
  return created;
}
