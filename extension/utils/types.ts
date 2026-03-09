/**
 * Enhanced type definitions.
 * Improvements: Added quality selection types, server health types,
 * player state types, and configuration interfaces.
 */

export interface LiveSource {
  live: boolean;
  playlist: string | null;
}

export interface LocationChangeDetail {
  type: string;
  url: string;
}

/** Server health check response */
export interface HealthStatus {
  status: 'ok' | 'error';
  uptime: number;
  activeStreams: number;
  version: string;
}

/** Quality option for stream selection */
export interface QualityOption {
  label: string;
  bandwidth: number;
  resolution: string;
  url: string;
}

/** Player state tracking */
export interface PlayerState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isTheater: boolean;
  currentQuality: string;
  channel: string | null;
  serverConnected: boolean;
}

/** Extension configuration */
export interface ExtensionConfig {
  autoReplace: boolean;
  preferredQuality: string; // 'best' | 'worst' | resolution string
  logLevel: number;
  serverPort: number;
}

/** Server connection status for badge/popup */
export type ServerStatus = 'connected' | 'disconnected' | 'checking';
