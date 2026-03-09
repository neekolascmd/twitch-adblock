package com.hawolt;

import io.javalin.Javalin;
import io.javalin.http.Context;
import org.json.JSONObject;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enhanced HTTP server for proxying Twitch HLS streams.
 *
 * Improvements over original:
 * - CORS locked to twitch.tv and extension origins only (was: wildcard *)
 * - Binds to 127.0.0.1 to prevent LAN exposure
 * - /health endpoint for extension health checks
 * - /status endpoint for debugging active streams
 * - ConcurrentHashMap for thread-safe instance tracking
 * - Graceful shutdown hook
 * - Structured JSON responses
 */
public class Main {

    private static final int PORT = 61616;
    private static final Instant START_TIME = Instant.now();
    private static final ConcurrentHashMap<String, Instance> INSTANCES = new ConcurrentHashMap<>();

    public static void main(String[] args) {
        Javalin app = Javalin.create(config -> {
            // Bind to localhost only - prevents exposure on local network
            config.jetty.defaultHost = "127.0.0.1";
        });

        // CORS middleware - restrict to Twitch and extension origins
        app.before(ctx -> {
            String origin = ctx.header("Origin");
            if (origin != null && isAllowedOrigin(origin)) {
                ctx.header("Access-Control-Allow-Origin", origin);
                ctx.header("Access-Control-Allow-Methods", "GET, OPTIONS");
                ctx.header("Access-Control-Allow-Headers", "Content-Type");
            }

            if ("OPTIONS".equalsIgnoreCase(ctx.method().name())) {
                ctx.status(204);
            }
        });

        // Health check endpoint
        app.get("/health", ctx -> {
            JSONObject health = new JSONObject();
            health.put("status", "ok");
            health.put("uptime", java.time.Duration.between(START_TIME, Instant.now()).getSeconds());
            health.put("activeStreams", INSTANCES.size());
            health.put("version", "1.1.0");
            ctx.contentType("application/json").result(health.toString());
        });

        // Status endpoint - debug info about active streams
        app.get("/status", ctx -> {
            JSONObject status = new JSONObject();
            for (Map.Entry<String, Instance> entry : INSTANCES.entrySet()) {
                JSONObject instanceInfo = new JSONObject();
                Instance instance = entry.getValue();
                instanceInfo.put("alive", instance.isAlive());
                instanceInfo.put("channel", entry.getKey());
                status.put(entry.getKey(), instanceInfo);
            }
            ctx.contentType("application/json").result(status.toString());
        });

        // Main livestream endpoint
        app.get("/live/{username}", ctx -> {
            String username = ctx.pathParam("username");
            if (username == null || username.isBlank()) {
                ctx.status(400);
                ctx.contentType("application/json")
                   .result(new JSONObject().put("error", "username is required").toString());
                return;
            }

            username = username.toLowerCase().trim();
            handleLiveRequest(ctx, username);
        });

        // Graceful shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[twitch-adblock] Shutting down...");
            for (Instance instance : INSTANCES.values()) {
                try {
                    instance.shutdown();
                } catch (Exception e) {
                    System.err.println("[twitch-adblock] Error shutting down instance: " + e.getMessage());
                }
            }
            INSTANCES.clear();
            app.stop();
        }));

        // Launch system tray
        Tray.setup(app, INSTANCES);

        app.start(PORT);
        System.out.println("[twitch-adblock] Server started on http://127.0.0.1:" + PORT);
    }

    private static void handleLiveRequest(Context ctx, String username) {
        try {
            Instance instance = INSTANCES.compute(username, (key, existing) -> {
                if (existing != null && existing.isAlive()) {
                    existing.refreshLastAccess();
                    return existing;
                }
                // Clean up dead instance
                if (existing != null) {
                    existing.shutdown();
                }
                return new Instance(key);
            });

            // Wait briefly for the stream to initialize
            if (!instance.isReady()) {
                instance.awaitReady(5000);
            }

            String playlist = instance.getPlaylistUrl();

            JSONObject response = new JSONObject();
            response.put("live", playlist != null);
            response.put("playlist", playlist);

            ctx.contentType("application/json").result(response.toString());
        } catch (Exception e) {
            System.err.println("[twitch-adblock] Error handling /live/" + username + ": " + e.getMessage());
            ctx.status(500);
            ctx.contentType("application/json")
               .result(new JSONObject()
                   .put("live", false)
                   .put("error", e.getMessage())
                   .toString());
        }
    }

    static boolean isAllowedOrigin(String origin) {
        if (origin == null) return false;
        return origin.equals("https://www.twitch.tv")
            || origin.equals("https://twitch.tv")
            || origin.startsWith("chrome-extension://")
            || origin.startsWith("moz-extension://");
    }

    public static void removeInstance(String username) {
        Instance removed = INSTANCES.remove(username);
        if (removed != null) {
            removed.shutdown();
        }
    }
}
