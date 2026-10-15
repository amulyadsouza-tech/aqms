/**
 * AQMS Live WebSocket Client
 * St. Joseph Engineering College, Vamanjoor, Mangaluru
 * Connects to the ESP32 or IoT Gateway WebSocket server dynamically.
 */

export function connectAQMSWebSocket({
  url,
  onReading,
  onStatus,
  onError,
}) {
  let socket = null;
  let closedByUser = false;
  let retryTimer = null;
  let retryCount = 0;

  function connect() {
    if (closedByUser) return;

    let parsedUrl;

    try {
      parsedUrl = new URL(url);

      if (!["ws:", "wss:"].includes(parsedUrl.protocol)) {
        throw new Error("Enter a valid WebSocket URL.");
      }

      if (
        window.location.protocol === "https:" &&
        parsedUrl.protocol !== "wss:"
      ) {
        throw new Error("HTTPS websites require a secure WSS connection.");
      }

      socket = new WebSocket(parsedUrl.href);
      onStatus?.("connecting");
    } catch (error) {
      onStatus?.("disconnected");
      onError?.(error);
      return;
    }

    socket.onopen = () => {
      retryCount = 0;
      onStatus?.("connected");
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (
          !message ||
          typeof message !== "object" ||
          Array.isArray(message) ||
          typeof message.deviceId !== "string" ||
          message.deviceId.trim().length === 0 ||
          !message.sensors ||
          typeof message.sensors !== "object" ||
          Array.isArray(message.sensors)
        ) {
          throw new Error("Invalid sensor message received.");
        }

        // Pass only actual incoming data to the application.
        onReading?.(message);
      } catch (error) {
        onError?.(error);
      }
    };

    socket.onerror = () => {
      onError?.(new Error("WebSocket connection failed."));
    };

    socket.onclose = () => {
      onStatus?.("disconnected");

      if (closedByUser || retryTimer) return;

      const delay = Math.min(
        1000 * 2 ** retryCount,
        30000
      );

      retryCount += 1;

      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };
  }

  connect();

  return {
    disconnect() {
      closedByUser = true;
      clearTimeout(retryTimer);
      retryTimer = null;

      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
      }

      onStatus?.("disconnected");
    },
    send(payload) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        return true;
      }
      return false;
    },
    getSocket() {
      return socket;
    },
  };
}
