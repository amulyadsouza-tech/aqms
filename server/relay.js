/**
 * AQMS Live WebSocket Relay Server
 * St. Joseph Engineering College, Vamanjoor, Mangaluru
 *
 * Relays real-time LoRa ground station packets from the ESP32 bridge
 * to all connected website dashboard clients.
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8080;

// In-memory cache for latest telemetry packet
let latestTelemetry = null;
let packetCounter = 0;

// HTTP server for health checks & cloud host keep-alive (e.g. Render)
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        status: 'online',
        service: 'SJEC AQMS WebSocket Relay',
        port: PORT,
        connectedClients: wss.clients.size,
        totalPacketsRelayed: packetCounter,
        latestPacketTime: latestTelemetry ? latestTelemetry.timestamp : null,
      })
    );
    return;
  }

  if (req.url === '/latest') {
    res.writeHead(latestTelemetry ? 200 : 404);
    res.end(
      JSON.stringify(
        latestTelemetry || { error: 'No telemetry packets received yet.' }
      )
    );
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// WebSocket Server attached to HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[Relay] New connection from ${clientIp} (Total clients: ${wss.clients.size})`);

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // If we already have a cached reading, send it to the newly connected browser once ready!
  if (latestTelemetry) {
    setTimeout(() => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(latestTelemetry));
          console.log(`[Relay] Sent cached packet #${packetCounter} to new client`);
        }
      } catch (err) {
        console.error('[Relay] Error sending initial packet to client:', err.message);
      }
    }, 150);
  }

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      // Validate that it looks like an AQMS sensor packet
      if (message && message.deviceId && message.sensors) {
        packetCounter++;
        latestTelemetry = {
          ...message,
          serverRelayedAt: Date.now(),
        };

        const payloadStr = JSON.stringify(latestTelemetry);
        console.log(
          `[Relay] Broadcast packet #${packetCounter} [${message.deviceId}] -> ${wss.clients.size} clients`
        );

        // Broadcast to all connected clients (except possibly the sender if it is ws)
        for (const client of wss.clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(payloadStr);
          }
        }
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (err) {
      console.warn('[Relay] Received non-JSON or invalid message:', data.toString());
    }
  });

  ws.on('close', () => {
    console.log(`[Relay] Client disconnected (Remaining: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`[Relay] Socket error:`, err.message);
  });
});

// Ping-pong heartbeat every 25 seconds to keep cloud connections alive
const pingInterval = setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 25000);

wss.on('close', () => {
  clearInterval(pingInterval);
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 AQMS WebSocket Relay Server is running on port ${PORT}`);
  console.log(`   Local URL:    ws://localhost:${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log('====================================================');
});
