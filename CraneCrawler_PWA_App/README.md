
# Crane Remote Static PWA

This project is a 100% offline-first Progressive Web App (PWA) for controlling a crane. It is built with vanilla HTML, CSS, and JavaScript, has no external dependencies, and communicates with the crane hardware (e.g., an Arduino Opta) over a local Wi-Fi network via WebSockets.

## Features

-   **Fully Offline:** Works without any internet connection. All assets are cached locally via a service worker.
-   **Zero Dependencies:** No frameworks, libraries, or CDNs are used. Just plain HTML, CSS, and JS.
-   **PWA Ready:** Can be installed to the Home Screen on iOS or Android for a native, fullscreen app experience.
-   **Real-time Control:** Sends commands and receives telemetry instantly over a local WebSocket connection.
-   **Cross-Device Compatible:** Runs in any modern browser on an iPad, Android tablet, or laptop.
-   **Configurable:** The WebSocket URL for the crane hardware can be changed via a settings dialog within the app.

## How to Deploy and Use

### Step 1: Host the Files

The beauty of this static app is its simple deployment. You have two main options:

1.  **On the Crane Controller:** If your hardware (like a Raspberry Pi or an Arduino with an SD card slot) can host static files, simply place the `index.html`, `style.css`, `app.js`, `manifest.json`, `service-worker.js`, and the icon files in a web-accessible folder.
2.  **On a Local Server:** Run a simple HTTP server on any device connected to the crane's local Wi-Fi network to serve the files.

### Step 2: Configure Network and IP Addresses

1.  **Set up the Wi-Fi Network:** Use a dedicated access point (like a TP-Link CPE210) to create a private, local-only Wi-Fi network. Do not connect it to the internet.
2.  **Assign a Static IP to the Crane:** Configure your crane's controller (Arduino Opta) to have a fixed, static IP address on the network (e.g., `192.168.0.10`). This ensures the app can always find it.
3.  **Connect the Control Device:** Connect your iPad or tablet to this same local Wi-Fi network.

### Step 3: Install the App on your Device

1.  On the iPad/tablet, open Safari or Chrome.
2.  Navigate to the IP address where the app is hosted (e.g., `http://192.168.0.20/index.html`).
3.  The app will load. Use the **Share** button and select **"Add to Home Screen"**.
4.  An icon for the "Crane Remote" will appear on your home screen.

### Step 4: Configure and Run

1.  Launch the app from your home screen.
2.  Tap the settings icon in the top-right corner.
3.  Enter the WebSocket URL for your crane controller (e.g., `ws://192.168.0.10:8080/ws`).
4.  Click "Save and Restart".
5.  The app will reload and connect to the crane. You can now use it to send commands and view live telemetry. The app will work even if you are completely disconnected from all networks.

    