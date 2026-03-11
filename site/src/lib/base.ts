const rawBase = import.meta.env.BASE_URL ?? '/';
const basePrefix = rawBase.endsWith('/') && rawBase !== '/' ? rawBase.slice(0, -1) : rawBase === '/' ? '' : rawBase;

export function withBase(pathname: string): string {
  if (!pathname) return rawBase;
  if (/^https?:/i.test(pathname)) return pathname;
  if (pathname === '/') return rawBase;
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${basePrefix}${normalized}`;
}

export function withDataPath(pathname: string): string {
  return withBase(pathname.startsWith('/data/') ? pathname : `/data/${pathname.replace(/^\//, '')}`);
}
