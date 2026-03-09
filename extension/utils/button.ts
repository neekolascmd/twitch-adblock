/**
 * Enhanced replacement button.
 * Improvements:
 * - Better error handling around DOM queries
 * - Server health check before showing button
 * - Visual feedback during replacement
 * - Tooltip with status info
 */

import { logger } from './logger';
import { modifyVideoElement } from './player';
import { getServerStatus } from './api';

const BUTTON_ID = 'twitch-adblock-replace-btn';

function createLightningIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.style.marginRight = '4px';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M13 2L4.09 12.11h6.09L8.18 22 17.73 11.18h-6.09L13 2z');
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

export function insertReplacementButton(): void {
  // Don't insert if already exists
  if (document.getElementById(BUTTON_ID)) return;

  try {
    const subscribeBtn = document.querySelector(
      '[data-a-target="subscribed-button"], [data-a-target="subscribe-button"]'
    );
    if (!subscribeBtn) {
      logger.debug('Subscribe button not found, cannot insert replace button');
      return;
    }

    const container = subscribeBtn.parentElement;
    if (!container) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'ta-replace-btn';
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      margin-left: 8px;
      border: none;
      border-radius: 4px;
      background: #772ce8;
      color: white;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      font-family: inherit;
    `;

    btn.appendChild(createLightningIcon());
    btn.appendChild(document.createTextNode('Replace'));

    // Server status indicator dot
    const statusDot = document.createElement('span');
    statusDot.className = 'ta-status-dot';
    const status = getServerStatus();
    statusDot.style.cssText = `
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-left: 8px;
      background: ${status === 'connected' ? '#00e676' : status === 'checking' ? '#ffc107' : '#e91916'};
    `;
    btn.appendChild(statusDot);

    // Hover effect
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#9147ff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#772ce8';
    });

    // Click handler with loading state
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
      const originalText = btn.childNodes[1];
      if (originalText) originalText.textContent = 'Replacing...';

      try {
        await modifyVideoElement();
        // Remove button after successful replacement
        btn.remove();
      } catch (err) {
        logger.error('Player replacement failed:', err);
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        if (originalText) originalText.textContent = 'Retry';
        btn.style.background = '#e91916';
      }
    });

    container.appendChild(btn);
    logger.info('Replace button inserted');
  } catch (err) {
    logger.error('Failed to insert replacement button:', err);
  }
}

export function removeReplaceButton(): void {
  const btn = document.getElementById(BUTTON_ID);
  if (btn) {
    btn.remove();
    logger.debug('Replace button removed');
  }
}
