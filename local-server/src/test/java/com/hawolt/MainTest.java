package com.hawolt;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the Main server class.
 * Focuses on CORS validation, origin checking, and request handling.
 */
@DisplayName("Main Server Tests")
class MainTest {

    @Test
    @DisplayName("Should allow twitch.tv origin")
    void allowTwitchOrigin() {
        assertTrue(Main.isAllowedOrigin("https://www.twitch.tv"));
        assertTrue(Main.isAllowedOrigin("https://twitch.tv"));
    }

    @Test
    @DisplayName("Should allow Chrome extension origin")
    void allowChromeExtensionOrigin() {
        assertTrue(Main.isAllowedOrigin("chrome-extension://abcdef123456"));
    }

    @Test
    @DisplayName("Should allow Firefox extension origin")
    void allowFirefoxExtensionOrigin() {
        assertTrue(Main.isAllowedOrigin("moz-extension://abcdef-1234-5678"));
    }

    @Test
    @DisplayName("Should reject unknown origins")
    void rejectUnknownOrigin() {
        assertFalse(Main.isAllowedOrigin("https://evil-site.com"));
        assertFalse(Main.isAllowedOrigin("https://not-twitch.tv"));
        assertFalse(Main.isAllowedOrigin("http://localhost:3000"));
    }

    @Test
    @DisplayName("Should reject null origin")
    void rejectNullOrigin() {
        assertFalse(Main.isAllowedOrigin(null));
    }

    @Test
    @DisplayName("Should reject HTTP twitch (non-HTTPS)")
    void rejectHttpTwitch() {
        assertFalse(Main.isAllowedOrigin("http://www.twitch.tv"));
        assertFalse(Main.isAllowedOrigin("http://twitch.tv"));
    }

    @Test
    @DisplayName("Should reject empty origin")
    void rejectEmptyOrigin() {
        assertFalse(Main.isAllowedOrigin(""));
    }

    @Test
    @DisplayName("Should reject twitch subdomains that aren't www")
    void rejectTwitchSubdomains() {
        assertFalse(Main.isAllowedOrigin("https://clips.twitch.tv"));
        assertFalse(Main.isAllowedOrigin("https://m.twitch.tv"));
    }
}
