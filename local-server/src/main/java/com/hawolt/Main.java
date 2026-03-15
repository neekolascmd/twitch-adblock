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

        // CORS middleware - restrict to Twitch and extension origins only
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
            // FIX: Use ctx.json() with toMap() instead of ctx.result(toString())
            // toString() double-serializes the JSON (Javalin serializes the string again)
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
            // FIX: Same as above - use contentType + result to avoid double-serialization
            ctx.contentType("application/json").result(status.toString());
        });

        // Main livestream endpoint
        app.get("/live/{username}", ctx -> {
            String username = ctx.pathParam("username");
            if (username == null || username.isBlank()) {
                ctx.status(400).result("Invalid username");
                return;
            }
            username = username.toLowerCase();
            
            // FIX: Use computeIfAbsent() to eliminate race condition
            // Previously: if (!containsKey()) { put() } + get() was not atomic
            Instance instance = INSTANCES.computeIfAbsent(username, k -> Instance.create(k, name -> {
                INSTANCES.remove(name);
            }));
            instance.getHandler().handle(ctx);
        });

        app.start(PORT);
        Tray.setup(app, INSTANCES);

        // Graceful shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            INSTANCES.values().forEach(Instance::shutdown);
            app.stop();
        }));
    }

    private static boolean isAllowedOrigin(String origin) {
        return origin.equals("https://www.twitch.tv")
                || origin.equals("https://usher.ttvnw.net")
                || origin.startsWith("chrome-extension://")
                || origin.startsWith("moz-extension://");
    }
}
