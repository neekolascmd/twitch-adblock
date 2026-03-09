# Twitch Adblock - Comprehensive Improvements

This document details all improvements made to the [hawolt/twitch-adblock](https://github.com/hawolt/twitch-adblock) project.

---

## Summary of Changes

**25 files** modified or created across 4 major areas:
- 14 extension files (TypeScript/HTML/CSS)
- 5 server files (Java/Maven)
- 4 test files (JUnit 5)
- 1 CI/CD pipeline (GitHub Actions)
- 1 documentation file

---

## 1. Security Hardening

### CORS Lockdown (Main.java)
- **Before:** Server allowed `Access-Control-Allow-Origin: *` (any website could query what streams you watch)
- **After:** CORS restricted to `https://www.twitch.tv`, `https://twitch.tv`, and browser extension origins

### Localhost Binding (Main.java)
- **Before:** Server binding was not explicitly restricted
- **After:** Javalin explicitly binds to `127.0.0.1`, preventing exposure on local network

### Content Security Policy (wxt.config.ts)
- Added `content_security_policy` to extension manifest
- Prevents XSS vectors in the extension popup and background pages

## 2. New Player Controls Overlay
- Play/Pause, Volume slider, Mute toggle
- Live indicator, Theater mode, Fullscreen
- Auto-hide after 3 seconds, Twitch dark theme styling

## 3. Health Check System
- Server: `/health` and `/status` endpoints
- Extension: Periodic health checks, badge status updates
- Popup: Server connection state display

## 4. Error Handling & Resilience
- API client: Retry with exponential backoff, request timeouts
- HLS Player: Network error recovery, media error recovery, graceful fallback
- Server Instance: Thread-safe with atomic operations, idempotent shutdown

## 5. Concurrency Improvements
- `ConcurrentHashMap` for instance tracking
- `AtomicReference`, `AtomicLong`, `AtomicBoolean` for thread-safe state
- `CountDownLatch` for initialization signaling
- 2-minute idle timeout (was 1 minute)

## 6. Modern HTTP Client
- Replaced `URLConnection` with `java.net.http.HttpClient`
- HTTP/2 support, connection pooling, configurable timeouts

## 7. Enhanced Logging
- Log levels (DEBUG, INFO, WARN, ERROR) with filtering
- Timestamps on all messages
- Configurable verbosity persisted in storage

## 8. Improved Storage
- Cross-context fallback (browser.storage -> chrome.storage -> localStorage)
- Quality preference persistence
- Log level persistence

## 9. Better Navigation Handling
- Debounced MutationObserver (150ms)
- Cleanup on SPA navigation
- Subscriber detection (skip replacement for subscribers)

## 10. Testing (32 tests)
- EXTM3UTest: 9 tests for master playlist parsing
- M3U8Test: 10 tests for tag attribute parsing
- MainTest: 8 tests for CORS and origin validation
- InstanceTest: 5 tests for lifecycle and concurrency

## 11. CI/CD Pipeline
- 4-job GitHub Actions workflow
- Java server tests, Extension builds (Chrome + Firefox matrix)
- Rust wrapper builds (Windows/Linux/macOS)
- Automated GitHub Release on tag push

## 12. Extension Popup Redesign
- Server status bar with animated indicator
- Active streams counter
- Toggle switch for auto-replace
- Twitch-themed dark UI

## 13. Background Script
- Periodic health checks (60s interval)
- Badge status updates (green/red)
- Message passing between popup and content scripts

## 14. Firefox Compatibility
- Proper `.xpi` packaging in CI
- `web_accessible_resources` with match patterns
- Cross-browser storage API fallbacks

## 15. Developer Experience
- Structured type definitions (TypeScript interfaces)
- JSDoc comments on all exported functions
- Consistent error handling patterns
