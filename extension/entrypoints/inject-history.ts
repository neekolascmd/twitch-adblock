/**
 * History API interceptor for SPA navigation detection.
 * Minimal changes from original - this was already well-implemented.
 * Improvement: Added error handling and type safety.
 */

export default defineUnlistedScript(() => {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  function dispatchLocationChange(type: string): void {
    try {
      window.dispatchEvent(
        new CustomEvent('twitch-adblock:locationchange', {
          detail: { type, url: window.location.href },
        })
      );
    } catch (e) {
      console.error('[twitch-adblock] Failed to dispatch location change:', e);
    }
  }

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args);
    dispatchLocationChange('pushState');
  };

  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    originalReplaceState(...args);
    dispatchLocationChange('replaceState');
  };

  window.addEventListener('popstate', () => {
    dispatchLocationChange('popstate');
  });
});