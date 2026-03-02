
// src/utils/publicUrl.js
export function publicUrl(path = '') {
  const viteBase = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL;
  const craBase  = typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL;

  const base = (viteBase ?? craBase ?? '/').replace(/\/+$/, ''); // trim trailing /
  const rel  = String(path || '').replace(/^\/+/, '');           // trim leading /

  return `${base}/${rel}`;
}
