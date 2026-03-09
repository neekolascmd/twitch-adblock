/**
 * Enhanced popup script.
 * Improvements:
 * - Server health status display
 * - Active streams count
 * - Better error handling
 */

import { getAutoReplaceEnabled, setAutoReplaceEnabled } from './storage';

const HEALTH_URL = 'http://localhost:61616/health';

async function init(): Promise<void> {
  // Load auto-replace setting
  const autoReplaceCheckbox = document.getElementById('autoReplace') as HTMLInputElement;
  if (autoReplaceCheckbox) {
    autoReplaceCheckbox.checked = await getAutoReplaceEnabled();
    autoReplaceCheckbox.addEventListener('change', async () => {
      await setAutoReplaceEnabled(autoReplaceCheckbox.checked);
    });
  }

  // Check server health
  await checkServerStatus();
}

async function checkServerStatus(): Promise<void> {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const streamsEl = document.getElementById('activeStreams');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();

      if (dot) {
        dot.className = 'status-dot connected';
      }
      if (text) {
        text.innerHTML = '<strong>Server Connected</strong>';
      }
      if (streamsEl && data.activeStreams !== undefined) {
        streamsEl.textContent = String(data.activeStreams);
      }
    } else {
      setDisconnected(dot, text, streamsEl);
    }
  } catch {
    setDisconnected(dot, text, streamsEl);
  }
}

function setDisconnected(
  dot: HTMLElement | null,
  text: HTMLElement | null,
  streams: HTMLElement | null
): void {
  if (dot) dot.className = 'status-dot disconnected';
  if (text) text.innerHTML = '<strong>Server Not Running</strong>';
  if (streams) streams.textContent = '--';
}

document.addEventListener('DOMContentLoaded', init);
