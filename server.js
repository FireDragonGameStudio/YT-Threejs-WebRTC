import https from "https";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();
const server = https.createServer({
  cert: fs.readFileSync(path.join(__dirname, "../../.vite-plugin-mkcert/cert.pem")),
  key: fs.readFileSync(path.join(__dirname, "../../.vite-plugin-mkcert/dev.pem")),
});

const PORT = 8080;
const wss = new WebSocketServer({ server });

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

  ws.onerror = function () {
    console.log("Some Error occurred");
  };
});

server.listen(PORT, () => {
  console.log(`WSS Server running on wss://localhost:${PORT}`);
});
