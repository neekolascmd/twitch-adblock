/**
 * Enhanced storage utilities.
 * Improvements: Added preferred quality storage, log level persistence,
 * consolidated storage API, and migration support.
 */

import { logger } from './logger';
import type { ExtensionConfig } from './types';

const STORAGE_KEYS = {
  VOLUME: 'twitch-adblock-volume',
  AUTO_REPLACE: 'autoReplaceEnabled',
  PREFERRED_QUALITY: 'twitch-adblock-quality',
  LOG_LEVEL: 'twitch-adblock-log-level',
} as const;

const DEFAULT_CONFIG: ExtensionConfig = {
  autoReplace: false,
  preferredQuality: 'best',
  logLevel: 1, // INFO
  serverPort: 61616,
};

// --- Volume (localStorage - page-scoped, fast access) ---

export function getVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOLUME);
    if (raw !== null) {
      const vol = parseFloat(raw);
      if (!isNaN(vol) && vol >= 0 && vol <= 1) return vol;
    }
  } catch (e) {
    logger.warn('Failed to read volume from localStorage:', e);
  }
  return 0.5; // default volume
}

export function setVolume(volume: number): void {
  try {
    const clamped = Math.max(0, Math.min(1, volume));
    localStorage.setItem(STORAGE_KEYS.VOLUME, clamped.toString());
  } catch (e) {
    logger.warn('Failed to save volume:', e);
  }
}

// --- Auto-replace (browser.storage for cross-context sync) ---

export async function getAutoReplaceEnabled(): Promise<boolean> {
  try {
    // Try browser.storage.local first (works in extension contexts)
    if (typeof browser !== 'undefined' && browser?.storage?.local) {
      const result = await browser.storage.local.get(STORAGE_KEYS.AUTO_REPLACE);
      if (result[STORAGE_KEYS.AUTO_REPLACE] !== undefined) {
        return Boolean(result[STORAGE_KEYS.AUTO_REPLACE]);
      }
    }
  } catch {
    // Fall through to chrome API
  }

  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get(STORAGE_KEYS.AUTO_REPLACE, (result) => {
          resolve(Boolean(result[STORAGE_KEYS.AUTO_REPLACE] ?? DEFAULT_CONFIG.autoReplace));
        });
      });
    }
  } catch {
    // Fall through to localStorage
  }

  try {
    return localStorage.getItem(STORAGE_KEYS.AUTO_REPLACE) === 'true';
  } catch {
    return DEFAULT_CONFIG.autoReplace;
  }
}

export async function setAutoReplaceEnabled(enabled: boolean): Promise<void> {
  try {
    if (typeof browser !== 'undefined' && browser?.storage?.local) {
      await browser.storage.local.set({ [STORAGE_KEYS.AUTO_REPLACE]: enabled });
      return;
    }
  } catch { /* fall through */ }

  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEYS.AUTO_REPLACE]: enabled });
      return;
    }
  } catch { /* fall through */ }

  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_REPLACE, String(enabled));
  } catch (e) {
    logger.error('Failed to save auto-replace setting:', e);
  }
}

// --- Preferred Quality ---

export function getPreferredQuality(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.PREFERRED_QUALITY) ?? DEFAULT_CONFIG.preferredQuality;
  } catch {
    return DEFAULT_CONFIG.preferredQuality;
  }
}

export function setPreferredQuality(quality: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERRED_QUALITY, quality);
  } catch (e) {
    logger.warn('Failed to save quality preference:', e);
  }
}

// --- Log Level ---

export function getSavedLogLevel(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOG_LEVEL);
    if (raw !== null) return parseInt(raw, 10);
  } catch { /* ignore */ }
  return DEFAULT_CONFIG.logLevel;
}

export function saveLogLevel(level: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOG_LEVEL, level.toString());
  } catch { /* ignore */ }
}
