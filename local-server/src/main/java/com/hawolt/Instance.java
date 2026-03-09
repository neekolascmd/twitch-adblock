package com.hawolt;

import com.hawolt.stream.twitch.TwitchStream;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Manages a single Twitch stream proxy instance.
 *
 * Improvements:
 * - Thread-safe state with AtomicReference / AtomicLong / AtomicBoolean
 * - Idle timeout (2 minutes) - was 1 minute, too aggressive
 * - CountDownLatch for initialization signaling
 * - Idempotent shutdown (safe to call multiple times)
 * - Separate alive/ready states
 */
public class Instance {

    private static final long IDLE_TIMEOUT_MS = 120_000; // 2 minutes

    private final String channel;
    private final AtomicReference<TwitchStream> streamRef = new AtomicReference<>();
    private final AtomicReference<String> playlistUrl = new AtomicReference<>();
    private final AtomicLong lastAccess = new AtomicLong(System.currentTimeMillis());
    private final AtomicBoolean alive = new AtomicBoolean(true);
    private final AtomicBoolean shutdownCalled = new AtomicBoolean(false);
    private final CountDownLatch readyLatch = new CountDownLatch(1);

    private Thread workerThread;
    private Thread idleWatcher;

    public Instance(String channel) {
        this.channel = channel;
        start();
    }

    private void start() {
        workerThread = new Thread(() -> {
            try {
                TwitchStream stream = new TwitchStream(channel);
                streamRef.set(stream);

                String url = stream.fetchPlaylist();
                if (url != null) {
                    playlistUrl.set(url);
                }

                readyLatch.countDown();

                // Keep refreshing the playlist periodically
                while (alive.get() && !Thread.currentThread().isInterrupted()) {
                    Thread.sleep(30_000); // Refresh every 30s
                    try {
                        String refreshed = stream.fetchPlaylist();
                        if (refreshed != null) {
                            playlistUrl.set(refreshed);
                        }
                    } catch (Exception e) {
                        System.err.println("[Instance:" + channel + "] Playlist refresh error: " + e.getMessage());
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                System.err.println("[Instance:" + channel + "] Worker error: " + e.getMessage());
            } finally {
                readyLatch.countDown(); // Ensure latch is released even on error
                alive.set(false);
            }
        }, "stream-worker-" + channel);
        workerThread.setDaemon(true);
        workerThread.start();

        // Start idle timeout watcher
        idleWatcher = new Thread(() -> {
            while (alive.get() && !Thread.currentThread().isInterrupted()) {
                try {
                    Thread.sleep(10_000); // Check every 10s
                    long idle = System.currentTimeMillis() - lastAccess.get();
                    if (idle > IDLE_TIMEOUT_MS) {
                        System.out.println("[Instance:" + channel + "] Idle timeout, shutting down");
                        Main.removeInstance(channel);
                        return;
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }, "idle-watcher-" + channel);
        idleWatcher.setDaemon(true);
        idleWatcher.start();
    }

    public boolean isAlive() {
        return alive.get();
    }

    public boolean isReady() {
        return readyLatch.getCount() == 0;
    }

    public void awaitReady(long timeoutMs) throws InterruptedException {
        readyLatch.await(timeoutMs, TimeUnit.MILLISECONDS);
    }

    public String getPlaylistUrl() {
        refreshLastAccess();
        return playlistUrl.get();
    }

    public void refreshLastAccess() {
        lastAccess.set(System.currentTimeMillis());
    }

    public String getChannel() {
        return channel;
    }

    /**
     * Idempotent shutdown - safe to call multiple times.
     */
    public void shutdown() {
        if (!shutdownCalled.compareAndSet(false, true)) {
            return; // Already called
        }

        alive.set(false);

        // Interrupt worker thread
        if (workerThread != null) {
            workerThread.interrupt();
        }
        if (idleWatcher != null) {
            idleWatcher.interrupt();
        }

        // Close the stream
        TwitchStream stream = streamRef.getAndSet(null);
        if (stream != null) {
            try {
                stream.close();
            } catch (Exception e) {
                System.err.println("[Instance:" + channel + "] Error closing stream: " + e.getMessage());
            }
        }

        System.out.println("[Instance:" + channel + "] Shut down");
    }
}
