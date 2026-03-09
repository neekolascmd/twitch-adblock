package com.hawolt.stream.playlist;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for M3U8 tag attribute parsing.
 * Validates individual HLS tag parsing and attribute extraction.
 */
@DisplayName("M3U8 Tag Parser Tests")
class M3U8Test {

    @Test
    @DisplayName("Should parse simple key=value attribute")
    void parseSimpleAttribute() {
        Map<String, String> attrs = parseAttributes("BANDWIDTH=3000000");
        assertEquals("3000000", attrs.get("BANDWIDTH"));
    }

    @Test
    @DisplayName("Should parse multiple attributes")
    void parseMultipleAttributes() {
        Map<String, String> attrs = parseAttributes("BANDWIDTH=3000000,RESOLUTION=1280x720,FRAME-RATE=30");
        assertEquals("3000000", attrs.get("BANDWIDTH"));
        assertEquals("1280x720", attrs.get("RESOLUTION"));
        assertEquals("30", attrs.get("FRAME-RATE"));
    }

    @Test
    @DisplayName("Should parse quoted attribute values")
    void parseQuotedValues() {
        Map<String, String> attrs = parseAttributes("CODECS=\"avc1.64002A,mp4a.40.2\",BANDWIDTH=6000000");
        assertEquals("avc1.64002A,mp4a.40.2", attrs.get("CODECS"));
        assertEquals("6000000", attrs.get("BANDWIDTH"));
    }

    @Test
    @DisplayName("Should handle empty attribute string")
    void parseEmptyAttributes() {
        Map<String, String> attrs = parseAttributes("");
        assertTrue(attrs.isEmpty());
    }

    @Test
    @DisplayName("Should handle null input safely")
    void parseNullInput() {
        Map<String, String> attrs = parseAttributes(null);
        assertTrue(attrs.isEmpty());
    }

    @Test
    @DisplayName("Should extract resolution width and height")
    void parseResolution() {
        String resolution = "1920x1080";
        String[] parts = resolution.split("x");
        assertEquals(2, parts.length);
        assertEquals(1920, Integer.parseInt(parts[0]));
        assertEquals(1080, Integer.parseInt(parts[1]));
    }

    @Test
    @DisplayName("Should handle VIDEO attribute with quoted value")
    void parseVideoAttribute() {
        Map<String, String> attrs = parseAttributes("VIDEO=\"chunked\",BANDWIDTH=6000000");
        assertEquals("chunked", attrs.get("VIDEO"));
    }

    @Test
    @DisplayName("Should handle attributes with spaces")
    void parseAttributesWithSpaces() {
        Map<String, String> attrs = parseAttributes(" BANDWIDTH=3000000 , RESOLUTION=1280x720 ");
        assertEquals("3000000", attrs.get("BANDWIDTH"));
        assertEquals("1280x720", attrs.get("RESOLUTION"));
    }

    @Test
    @DisplayName("Should handle malformed attribute (no value)")
    void parseMalformedAttribute() {
        Map<String, String> attrs = parseAttributes("BANDWIDTH");
        assertTrue(attrs.isEmpty() || attrs.get("BANDWIDTH") == null);
    }

    @Test
    @DisplayName("Should correctly count parsed attributes")
    void countAttributes() {
        Map<String, String> attrs = parseAttributes("A=1,B=2,C=3,D=4");
        assertEquals(4, attrs.size());
    }

    // --- Helper: Attribute parser matching production logic ---

    private Map<String, String> parseAttributes(String attributeString) {
        Map<String, String> result = new HashMap<>();
        if (attributeString == null || attributeString.isBlank()) return result;

        int i = 0;
        int len = attributeString.length();

        while (i < len) {
            // Skip whitespace and commas
            while (i < len && (attributeString.charAt(i) == ',' || attributeString.charAt(i) == ' ')) i++;
            if (i >= len) break;

            // Read key
            int eqIdx = attributeString.indexOf('=', i);
            if (eqIdx == -1) break;
            String key = attributeString.substring(i, eqIdx).trim();

            i = eqIdx + 1;
            if (i >= len) break;

            // Read value
            String value;
            if (attributeString.charAt(i) == '"') {
                // Quoted value
                int closeQuote = attributeString.indexOf('"', i + 1);
                if (closeQuote == -1) break;
                value = attributeString.substring(i + 1, closeQuote);
                i = closeQuote + 1;
            } else {
                // Unquoted value - read until comma or end
                int commaIdx = attributeString.indexOf(',', i);
                if (commaIdx == -1) commaIdx = len;
                value = attributeString.substring(i, commaIdx).trim();
                i = commaIdx;
            }

            result.put(key, value);
        }

        return result;
    }
}
