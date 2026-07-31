import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 3,
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  manifest: {
    name: 'My Speed Dial',
    description: 'A customizable free-form speed dial for your new tab page.',
    permissions: ['storage'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'my-speed-dial@local.dev',
        strict_min_version: '121.0',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
