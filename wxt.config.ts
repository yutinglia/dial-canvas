import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifestVersion: 3,
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'unlimitedStorage'],
    optional_permissions: ['bookmarks'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    commands: {
      'toggle-edit': {
        suggested_key: {
          default: 'Alt+E',
        },
        description: '__MSG_cmdToggleEdit__',
      },
      'add-dial': {
        suggested_key: {
          default: 'Alt+A',
        },
        description: '__MSG_cmdAddDial__',
      },
      'search-dials': {
        suggested_key: {
          default: 'Alt+F',
        },
        description: '__MSG_cmdSearchDials__',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'my-speed-dial@yutinglia.dev',
        strict_min_version: '140.0',
        data_collection_permissions: {
          required: ['none'],
          optional: ['locationInfo'],
        },
      },
    },
  },
  zip: {
    excludeSources: ['coverage/**'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
