import type { APIRoute } from 'astro';
import { withBase } from '@/lib/base';

const routes = ['', 'adjudicatarios/', 'unidades/', 'competencia/', 'importes/', 'patrones/', 'temas/', 'evolucion/', 'explorador/', 'metodologia/'];

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://amoedo.github.io/ContratosConcelloVigo/');
  const urls = routes.map((route) => `<url><loc>${new URL(withBase(`/${route}`), origin)}</loc><changefreq>${route ? 'weekly' : 'daily'}</changefreq></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
