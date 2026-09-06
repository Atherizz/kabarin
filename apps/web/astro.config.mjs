// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// astro.config.mjs
export default defineConfig({
  output: "server",
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'https://kabarin-api.atherizz.dev',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    ssr: {
      noExternal: ['phosphor-svelte'],
    },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: false,
    },
  }),
});
