import type { APIRoute } from 'astro';
import { withBase } from '@/lib/base';

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://amoedo.github.io/ContratosConcelloVigo/');
  return new Response(`User-agent: *\nAllow: ${withBase('/')}\nSitemap: ${new URL(withBase('/sitemap.xml'), origin)}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
