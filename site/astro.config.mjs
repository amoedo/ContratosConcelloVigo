import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const base = process.env.SITE_BASE ?? '/';
const site = process.env.SITE_URL ?? 'https://example.com';

export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [react()],
  build: {
    format: 'directory',
  },
});
