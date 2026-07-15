import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer } from "ws";
import { RobotEngine } from "./robotEngine.js";
import { createRoutes } from "./routes.js";

const app = express();

// N'autorise que l'origine du frontend, configurable par variable d'environnement.
// En développement local, ça reste http://localhost:5173 par défaut.
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const engine = new RobotEngine();
app.use("/api", createRoutes(engine));

app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

wss.on("connection", (socket) => {
  console.log("[ws] client connecté");
  socket.send(JSON.stringify({ type: "state", payload: engine.getState() }));
  socket.on("close", () => console.log("[ws] client déconnecté"));
});

engine.onUpdate((state) => {
  const message = JSON.stringify({ type: "state", payload: state });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(message);
  });
});

engine.start();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend robot-simulator à l'écoute sur le port ${PORT}`);
  console.log(`  Origine autorisée (CORS): ${ALLOWED_ORIGIN}`);
  console.log(`  REST:      http://localhost:${PORT}/api/state`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
});
