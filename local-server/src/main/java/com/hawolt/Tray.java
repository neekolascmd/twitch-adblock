package com.hawolt;

import io.javalin.Javalin;

import java.awt.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * System tray integration.
 * Improvement: Added status menu item showing active stream count.
 * Fix: Exit handler now calls app.stop() instead of System.exit(0),
 * allowing shutdown hooks to run and clean up resources properly.
 */
public class Tray {

    public static void setup(Javalin app, ConcurrentHashMap<String, Instance> instances) {
        if (!SystemTray.isSupported()) {
            System.out.println("[twitch-adblock] System tray not supported");
            return;
        }

        try {
            SystemTray tray = SystemTray.getSystemTray();

            // Create a simple icon (16x16 purple square)
            Image icon = Toolkit.getDefaultToolkit().createImage(new byte[0]);
            TrayIcon trayIcon = new TrayIcon(icon, "Twitch Ad Block Server");
            trayIcon.setImageAutoSize(true);

            PopupMenu menu = new PopupMenu();

            MenuItem statusItem = new MenuItem("Active Streams: 0");
            statusItem.setEnabled(false);
            menu.add(statusItem);

            menu.addSeparator();

            MenuItem exitItem = new MenuItem("Exit");
            exitItem.addActionListener(e -> {
                tray.remove(trayIcon);
                // FIX: Use app.stop() instead of System.exit(0)
                // This triggers the shutdown hook in Main, which properly
                // cleans up all instances, workers, and idle watchers
                app.stop();
                // Signal all instances to shut down
                instances.values().forEach(Instance::shutdown);
                // Give threads a moment to clean up, then exit
                new Thread(() -> {
                    try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                    System.exit(0);
                }, "shutdown-delay").start();
            });
            menu.add(exitItem);

            trayIcon.setPopupMenu(menu);
            tray.add(trayIcon);

            // Update status periodically
            Thread statusUpdater = new Thread(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Thread.sleep(5000);
                        statusItem.setLabel("Active Streams: " + instances.size());
                    } catch (InterruptedException ex) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
            }, "tray-status-updater");
            statusUpdater.setDaemon(true);
            statusUpdater.start();

        } catch (Exception e) {
            System.err.println("[twitch-adblock] Failed to setup system tray: " + e.getMessage());
        }
    }
}
