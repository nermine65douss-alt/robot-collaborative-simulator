// useRobotSocket.js
// Connecte le frontend au backend via WebSocket (état temps réel) + REST (commandes).
// Les URLs sont configurables via variables d'environnement Vite (VITE_*),
// avec un repli sur localhost pour le développement local.

import { useEffect, useRef, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000/ws";

export function useRobotSocket(wsUrl = WS_URL) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "state") setState(msg.payload);
    };

    return () => socket.close();
  }, [wsUrl]);

  const sendCommand = useCallback(async (command) => {
    await fetch(`${API_BASE}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
  }, []);

  const sendJoints = useCallback(async (partialJoints) => {
    await fetch(`${API_BASE}/joints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partialJoints),
    });
  }, []);

  return { state, connected, sendCommand, sendJoints };
}
