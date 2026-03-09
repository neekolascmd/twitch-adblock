package com.hawolt;

import io.javalin.Javalin;

import java.awt.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * System tray integration.
 * Improvement: Added status menu item showing active stream count.
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
            TrayIcon trayIcon = new TrayIcon(icon, "Twitch Adblock Server");
            trayIcon.setImageAutoSize(true);

            PopupMenu menu = new PopupMenu();

            MenuItem statusItem = new MenuItem("Active Streams: 0");
            statusItem.setEnabled(false);
            menu.add(statusItem);

            menu.addSeparator();

            MenuItem exitItem = new MenuItem("Exit");
            exitItem.addActionListener(e -> {
                tray.remove(trayIcon);
                System.exit(0);
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
