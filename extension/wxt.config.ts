/**
 * Enhanced WXT config.
 * Improvements:
 * - Added Content Security Policy
 * - Added web_accessible_resources for CSS injection
 * - Added proper Firefox compatibility settings
 */

import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Twitch Adblock',
    version: '1.1.0',
    description: 'Replace Twitch player with ad-free HLS stream via local proxy server',
    permissions: ['activeTab', 'storage'],
    host_permissions: [
      'http://localhost:61616/*',
      'http://127.0.0.1:61616/*',
      'https://*.ttvnw.net/*',
      'https://*.twitch.tv/*',
    ],
    web_accessible_resources: [
      {
        resources: ['inject-history.js', 'styles/controls.css'],
        matches: ['https://www.twitch.tv/*'],
      },
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
  },
});