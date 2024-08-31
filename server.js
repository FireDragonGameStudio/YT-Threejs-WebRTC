import { WebSocketServer, WebSocket } from "ws";

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", function connection(ws) {
  console.log("New client connected");

  ws.on("message", function incoming(message) {
    // forward messages to all other clients
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log(`WebSocketServer running on ws://localhost:${PORT}`);
