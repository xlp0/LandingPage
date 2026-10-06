/**
 * Browser shim for Node's `path` (POSIX semantics).
 *
 * The kernel imports `path` for URI/route handling, which is pure string work
 * and safe to serve in the browser. Only the members the kernel uses are
 * implemented; anything else throws rather than returning a wrong value.
 */
export const sep = '/';
export const posix = { sep };

export function join(...parts) {
  const joined = parts.filter((p) => p !== undefined && p !== null && p !== '').join('/');
  return normalize(joined);
}

export function normalize(p) {
  const isAbs = String(p).startsWith('/');
  const out = [];
  for (const seg of String(p).split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return (isAbs ? '/' : '') + out.join('/');
}

export function dirname(p) {
  const s = String(p);
  const i = s.lastIndexOf('/');
  if (i < 0) return '.';
  if (i === 0) return '/';
  return s.slice(0, i);
}

export function basename(p, ext) {
  const s = String(p);
  const b = s.slice(s.lastIndexOf('/') + 1);
  return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b;
}

export function extname(p) {
  const b = basename(p);
  const i = b.lastIndexOf('.');
  return i <= 0 ? '' : b.slice(i);
}

export function resolve(...parts) {
  return normalize(parts.filter(Boolean).join('/'));
}

export function relative(from, to) {
  const a = normalize(from).split('/').filter(Boolean);
  const b = normalize(to).split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
}

export function isAbsolute(p) {
  return String(p).startsWith('/');
}

export default { sep, posix, join, normalize, dirname, basename, extname, resolve, relative, isAbsolute };
