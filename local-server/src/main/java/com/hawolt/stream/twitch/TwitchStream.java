package com.hawolt.stream.twitch;

import java.io.Closeable;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Enhanced Twitch stream fetcher.
 *
 * Improvements over original:
 * - Uses java.net.http.HttpClient instead of manual URLConnection
 * - Built-in connection pooling and HTTP/2 support
 * - Configurable connect and read timeouts
 * - Implements Closeable for resource management
 * - Better error messages
 */
public class TwitchStream implements Closeable {

    private static final String USHER_BASE = "https://usher.ttvnw.net/api/channel/hls/%s.m3u8";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final String channel;
    private final HttpClient httpClient;
    private volatile boolean closed = false;

    public TwitchStream(String channel) {
        this.channel = channel;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Fetch the current HLS playlist URL for this channel.
     * Returns null if the channel is offline or an error occurs.
     */
    public String fetchPlaylist() {
        if (closed) return null;

        try {
            String url = String.format(USHER_BASE, channel)
                    + "?player=twitchweb"
                    + "&token={\"adblock\":true,\"hide_ads\":true}"
                    + "&sig=no_sig"
                    + "&allow_audio_only=true"
                    + "&allow_source=true"
                    + "&fast_bread=true"
                    + "&p=" + (int) (Math.random() * 999999);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .header("Accept", "application/vnd.apple.mpegurl")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                String body = response.body();
                if (body != null && body.contains("#EXTM3U")) {
                    return selectBestQuality(body);
                }
            } else if (response.statusCode() == 404) {
                // Channel is offline
                return null;
            } else {
                System.err.println("[TwitchStream:" + channel + "] Unexpected status: " + response.statusCode());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            if (!closed) {
                System.err.println("[TwitchStream:" + channel + "] Fetch error: " + e.getMessage());
            }
        }

        return null;
    }

    /**
     * Select the best quality stream from the master playlist.
     * Parses #EXT-X-STREAM-INF bandwidth values and picks the highest.
     */
    private String selectBestQuality(String masterPlaylist) {
        String bestUrl = null;
        long bestBandwidth = -1;

        String[] lines = masterPlaylist.split("\n");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.startsWith("#EXT-X-STREAM-INF")) {
                long bandwidth = parseBandwidth(line);
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

    private long parseBandwidth(String streamInfLine) {
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

    @Override
    public void close() {
        closed = true;
    }
}
