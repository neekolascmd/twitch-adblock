/**
 * Enhanced API client with health checks, error handling, retry logic,
 * and connection status tracking.
 *
 * Improvements:
 * - try/catch around all fetch calls
 * - Health check endpoint support
 * - Retry with exponential backoff
 * - Connection status tracking
 * - Request timeout support
 */

import { logger } from './logger';
import type { LiveSource, HealthStatus, ServerStatus } from './types';

const API_BASE_URL = 'http://localhost:61616';
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

let serverStatus: ServerStatus = 'checking';
let lastHealthCheck = 0;
let cachedHealthData: HealthStatus | null = null;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

type StatusChangeCallback = (status: ServerStatus) => void;
const statusListeners: StatusChangeCallback[] = [];

export function onServerStatusChange(cb: StatusChangeCallback): void {
  statusListeners.push(cb);
}

function setServerStatus(status: ServerStatus): void {
  if (serverStatus !== status) {
    serverStatus = status;
    statusListeners.forEach(cb => cb(status));
    logger.debug('Server status changed:', status);
  }
}

export function getServerStatus(): ServerStatus {
  return serverStatus;
}

export function getUsernameFromURL(): string {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  return parts[0] ?? '';
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry<T>(
  url: string,
  parser: (res: Response) => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        logger.warn(`HTTP ${response.status} from ${url}`);
        if (attempt < retries) {
          await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        return null;
      }
      setServerStatus('connected');
      return await parser(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        logger.warn(`Request timed out: ${url}`);
      } else {
        logger.error(`Request failed (attempt ${attempt + 1}/${retries + 1}):`, err);
      }
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }
  setServerStatus('disconnected');
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Check if the local server is running and healthy */
export async function checkServerHealth(): Promise<HealthStatus | null> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS && serverStatus === 'connected' && cachedHealthData) {
    return cachedHealthData;
  }
  lastHealthCheck = now;
  setServerStatus('checking');

  const result = await fetchWithRetry(
    `${API_BASE_URL}/health`,
    async (res) => await res.json() as HealthStatus,
    1 // fewer retries for health checks
  );

  if (result) {
    cachedHealthData = result;
    setServerStatus('connected');
  } else {
    setServerStatus('disconnected');
  }
  return result;
}

/** Check if server is reachable (quick ping) */
export async function isServerReachable(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 2000);
    const ok = res.ok;
    setServerStatus(ok ? 'connected' : 'disconnected');
    return ok;
  } catch {
    setServerStatus('disconnected');
    return false;
  }
}

/** Generic GET request to local server */
export async function getFromAPI(endpoint: string): Promise<LiveSource | null> {
  return fetchWithRetry(
    `${API_BASE_URL}${endpoint}`,
    async (res) => await res.json() as LiveSource
  );
}

/** Get livestream source for a channel */
export async function getLivestream(username: string): Promise<LiveSource | null> {
  if (!username) {
    logger.warn('No username provided for livestream lookup');
    return null;
  }
  logger.info(`Fetching livestream for: ${username}`);
  return getFromAPI(`/live/${encodeURIComponent(username)}`);
}
