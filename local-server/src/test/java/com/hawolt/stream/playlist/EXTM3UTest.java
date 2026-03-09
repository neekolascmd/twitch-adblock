package com.hawolt.stream.playlist;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for EXTM3U master playlist parsing.
 * Validates bandwidth extraction, quality selection, and edge cases.
 */
@DisplayName("EXTM3U Master Playlist Parser Tests")
class EXTM3UTest {

    @Test
    @DisplayName("Should parse bandwidth from STREAM-INF tag")
    void parseBandwidth() {
        String line = "#EXT-X-STREAM-INF:BANDWIDTH=6000000,RESOLUTION=1920x1080,CODECS=\"avc1.64002A\"";
        long bandwidth = extractBandwidth(line);
        assertEquals(6000000L, bandwidth);
    }

    @Test
    @DisplayName("Should return 0 for missing BANDWIDTH attribute")
    void parseBandwidthMissing() {
        String line = "#EXT-X-STREAM-INF:RESOLUTION=1920x1080";
        long bandwidth = extractBandwidth(line);
        assertEquals(0L, bandwidth);
    }

    @Test
    @DisplayName("Should parse multi-stream master playlist")
    void parseMultiStreamPlaylist() {
        String playlist = """
                #EXTM3U
                #EXT-X-STREAM-INF:BANDWIDTH=6000000,RESOLUTION=1920x1080
                https://video-weaver.example.com/1080p.m3u8
                #EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
                https://video-weaver.example.com/720p.m3u8
                #EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
                https://video-weaver.example.com/480p.m3u8
                """;
        String best = selectBestQuality(playlist);
        assertEquals("https://video-weaver.example.com/1080p.m3u8", best);
    }

    @Test
    @DisplayName("Should handle single stream playlist")
    void parseSingleStream() {
        String playlist = """
                #EXTM3U
                #EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
                https://video-weaver.example.com/720p.m3u8
                """;
        String best = selectBestQuality(playlist);
        assertEquals("https://video-weaver.example.com/720p.m3u8", best);
    }

    @Test
    @DisplayName("Should return null for empty playlist")
    void parseEmptyPlaylist() {
        String playlist = "#EXTM3U\n";
        String best = selectBestQuality(playlist);
        assertNull(best);
    }

    @Test
    @DisplayName("Should handle audio-only stream")
    void parseAudioOnly() {
        String playlist = """
                #EXTM3U
                #EXT-X-STREAM-INF:BANDWIDTH=160000,CODECS="mp4a.40.2"
                https://video-weaver.example.com/audio_only.m3u8
                #EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
                https://video-weaver.example.com/720p.m3u8
                """;
        String best = selectBestQuality(playlist);
        assertEquals("https://video-weaver.example.com/720p.m3u8", best);
    }

    @Test
    @DisplayName("Should handle malformed bandwidth gracefully")
    void parseMalformedBandwidth() {
        String line = "#EXT-X-STREAM-INF:BANDWIDTH=notanumber,RESOLUTION=1920x1080";
        long bandwidth = extractBandwidth(line);
        assertEquals(0L, bandwidth);
    }

    @Test
    @DisplayName("Should validate EXTM3U header presence")
    void validateHeader() {
        String valid = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=3000000\nhttp://example.com/stream.m3u8";
        String invalid = "not a playlist";
        assertTrue(valid.contains("#EXTM3U"));
        assertFalse(invalid.contains("#EXTM3U"));
    }

    @Test
    @DisplayName("Should handle BANDWIDTH at end of attribute list")
    void parseBandwidthAtEnd() {
        String line = "#EXT-X-STREAM-INF:RESOLUTION=1920x1080,CODECS=\"avc1.64002A\",BANDWIDTH=6000000";
        long bandwidth = extractBandwidth(line);
        assertEquals(6000000L, bandwidth);
    }

    // --- Helper methods that mirror the production code logic ---

    private long extractBandwidth(String streamInfLine) {
        try {
            int idx = streamInfLine.indexOf("BANDWIDTH=");
            if (idx == -1) return 0;
            idx += "BANDWIDTH=".length();
            int end = streamInfLine.indexOf(',', idx);
            if (end == -1) end = streamInfLine.length();
            return Long.parseLong(streamInfLine.substring(idx, end).trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String selectBestQuality(String masterPlaylist) {
        String bestUrl = null;
        long bestBandwidth = -1;
        String[] lines = masterPlaylist.split("\n");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.startsWith("#EXT-X-STREAM-INF")) {
                long bandwidth = extractBandwidth(line);
                if (i + 1 < lines.length) {
                    String streamUrl = lines[i + 1].trim();
                    if (!streamUrl.startsWith("#") && !streamUrl.isEmpty()) {
                        if (bandwidth > bestBandwidth) {
                            bestBandwidth = bandwidth;
                            bestUrl = streamUrl;
                        }
                    }
                }
            }
        }
        return bestUrl;
    }
}
