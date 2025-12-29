export function qs(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

export function setStatus(el, msg, type='') {
  el.textContent = msg;
  el.className = `status ${type}`;
}

export function prettyUUID(u) {
  if (!u) return '';
  return u.slice(0, 8);
}

export function asToken(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  // Accept full URL containing token=...
  try {
    const maybeUrl = new URL(s);
    const t = maybeUrl.searchParams.get('token');
    return (t || '').trim() || s;
  } catch (_) {
    return s;
  }
}
