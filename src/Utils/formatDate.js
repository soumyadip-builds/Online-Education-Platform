
export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString();
}
``
