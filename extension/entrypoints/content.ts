/**
 * Enhanced content script.
 * Improvements:
 * - Server health check on page load with status badge
 * - Graceful degradation when server is unavailable
 * - Better MutationObserver with configurable debounce
 * - Cleanup on navigation (destroys HLS instance)
 * - Subscriber detection improvements
 */

import { logger, setLogLevel, LogLevel } from '../utils/logger';
import { getSavedLogLevel } from '../utils/storage';
import { isServerReachable, onServerStatusChange } from '../utils/api';
import { modifyVideoElement, destroyPlayer, hasVideoElements } from '../utils/player';
import { insertReplacementButton, removeReplaceButton } from '../utils/button';
import { getAutoReplaceEnabled } from '../utils/storage';
import type { LocationChangeDetail } from '../utils/types';

export default defineContentScript({
  matches: ['*://www.twitch.tv/*'],
  runAt: 'document_idle',

  async main() {
    // Initialize log level from saved preference
    setLogLevel(getSavedLogLevel() as LogLevel);
    logger.info('Twitch Adblock content script loaded');

    // Inject history interceptor for SPA navigation
    injectHistoryInterceptor();

    // Check server health on startup
    const serverOk = await isServerReachable();
    if (!serverOk) {
      logger.warn('Local server not reachable on startup. Extension will retry when needed.');
      updateExtensionBadge('off');
    } else {
      logger.info('Local server is healthy');
      updateExtensionBadge('on');
    }

    // Listen for server status changes
    onServerStatusChange((status) => {
      updateExtensionBadge(status === 'connected' ? 'on' : 'off');
    });

    // Set up location change listener for SPA navigation
    let currentPath = window.location.pathname;
    window.addEventListener('twitch-adblock:locationchange', ((e: CustomEvent<LocationChangeDetail>) => {
      const newPath = new URL(e.detail.url).pathname;
      if (newPath !== currentPath) {
        logger.info(`Navigation: ${currentPath} -> ${newPath}`);
        currentPath = newPath;
        handleNavigation();
      }
    }) as EventListener);

    // Initial page setup
    handleNavigation();
  },
});

function injectHistoryInterceptor(): void {
  try {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('/inject-history.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    logger.debug('History interceptor injected');
  } catch (e) {
    logger.error('Failed to inject history interceptor:', e);
  }
}

function updateExtensionBadge(state: 'on' | 'off'): void {
  try {
    // Send message to background script to update badge
    browser.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      state,
    }).catch(() => {
      // Background script might not be ready
    });
  } catch {
    // Extension context might not be available
  }
}

async function handleNavigation(): Promise<void> {
  // Clean up previous player instance on navigation
  destroyPlayer();
  removeReplaceButton();

  // Check if we're on a channel page (not directory, settings, etc.)
  const path = window.location.pathname;
  const isChannelPage = isLikelyChannelPage(path);

  if (!isChannelPage) {
    logger.debug('Not a channel page, skipping:', path);
    return;
  }

  logger.info('Channel page detected, setting up observer');

  // Wait for the video player and subscribe button to appear
  const autoReplace = await getAutoReplaceEnabled();
  observePlayerReady(autoReplace);
}

function isLikelyChannelPage(path: string): boolean {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return false;

  // Exclude known non-channel routes
  const nonChannelRoutes = [
    'directory', 'settings', 'subscriptions', 'inventory',
    'wallet', 'friends', 'downloads', 'search', 'about',
  ];
  return !nonChannelRoutes.includes(parts[0].toLowerCase());
}

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 150;

function observePlayerReady(autoReplace: boolean): void {
  // Clean up previous observer
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  const checkAndAct = () => {
    // Look for subscribe/subscribed button as indicator that page is ready
    const subscribeBtn = document.querySelector(
      '[data-a-target="subscribed-button"], [data-a-target="subscribe-button"]'
    );
    const hasVideo = hasVideoElements();

    if (!subscribeBtn || !hasVideo) return;

    // Check if user is subscribed (they won't see ads)
    const isSubscribed = !!document.querySelector(
      '[data-a-target="subscribed-button"]'
    );

    if (isSubscribed) {
      logger.info('User is subscribed to this channel, skipping replacement');
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }

    if (autoReplace) {
      logger.info('Auto-replacing player');
      modifyVideoElement();
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    } else {
      // Insert manual replace button
      insertReplacementButton();
    }
  };

  observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkAndAct, DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also run an initial check
  setTimeout(checkAndAct, 500);
}