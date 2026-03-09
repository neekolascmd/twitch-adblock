/**
 * Enhanced background script.
 * Original was empty. Now handles:
 * - Extension badge updates (server status indicator)
 * - Periodic health checks of the local server
 * - Extension lifecycle management
 * - Message passing between popup and content scripts
 */

import { logger } from '../utils/logger';

const HEALTH_CHECK_URL = 'http://localhost:61616/health';
const HEALTH_CHECK_INTERVAL_MS = 60_000; // 1 minute

let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

export default defineBackground(() => {
  logger.info('Background script initialized');

  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'UPDATE_BADGE') {
      updateBadge(message.state);
      sendResponse({ ok: true });
    } else if (message.type === 'GET_SERVER_STATUS') {
      checkHealth().then((ok) => {
        sendResponse({ connected: ok });
      });
      return true; // async response
    } else if (message.type === 'CHECK_HEALTH') {
      checkHealth().then((ok) => {
        sendResponse({ status: ok ? 'ok' : 'error' });
      });
      return true;
    }
  });

  // Start periodic health checks
  startHealthMonitor();

  // Check health on install/update
  browser.runtime.onInstalled.addListener(() => {
    logger.info('Extension installed/updated');
    checkHealth();
  });
});

function startHealthMonitor(): void {
  // Initial check
  checkHealth();

  // Periodic checks
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  healthCheckTimer = setInterval(() => {
    checkHealth();
  }, HEALTH_CHECK_INTERVAL_MS);
}

async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(HEALTH_CHECK_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      updateBadge('on');
      return true;
    }
    updateBadge('off');
    return false;
  } catch {
    updateBadge('off');
    return false;
  }
}

function updateBadge(state: 'on' | 'off'): void {
  try {
    const color = state === 'on' ? '#00e676' : '#e91916';
    const text = state === 'on' ? '' : '!';

    browser.action.setBadgeBackgroundColor({ color });
    browser.action.setBadgeText({ text });

    // Also update the title for accessibility
    browser.action.setTitle({
      title: state === 'on'
        ? 'Twitch Adblock - Server Connected'
        : 'Twitch Adblock - Server Disconnected',
    });
  } catch (e) {
    // Badge API might not be available in all contexts
    logger.debug('Badge update failed:', e);
  }
}
