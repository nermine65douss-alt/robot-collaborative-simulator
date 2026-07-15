import { Router } from "express";

const VALID_COMMANDS = ["start", "pause", "stop", "home"];

// Limites physiques de chaque joint, cohérentes avec le frontend.
// Le backend ne doit jamais faire confiance aveuglément aux valeurs reçues.
const JOINT_LIMITS = {
  j1: [-180, 180],
  j2: [-180, 180],
  j3: [-170, 170],
  j4: [-180, 180],
  j5: [-180, 180],
  j6: [-360, 360],
};

export function createRoutes(engine) {
  const router = Router();

  router.get("/state", (req, res) => {
    res.json(engine.getState());
  });

  router.post("/command", (req, res) => {
    const { command } = req.body;
    if (!VALID_COMMANDS.includes(command)) {
      return res.status(400).json({ error: `Commande invalide. Attendu: ${VALID_COMMANDS.join(", ")}` });
    }
    engine.setCommand(command);
    res.json({ ok: true, state: engine.getState() });
  });

  router.post("/joints", (req, res) => {
    const target = {};
    for (const key of Object.keys(JOINT_LIMITS)) {
      if (req.body[key] === undefined) continue;

      const value = req.body[key];
      if (typeof value !== "number" || Number.isNaN(value)) {
        return res.status(400).json({ error: `${key} doit être un nombre` });
      }

      const [min, max] = JOINT_LIMITS[key];
      if (value < min || value > max) {
        return res.status(400).json({ error: `${key} hors limites : doit être entre ${min}° et ${max}°` });
      }

      target[key] = value;
    }

    if (Object.keys(target).length === 0) {
      return res.status(400).json({ error: "Aucun angle de joint valide fourni" });
    }

    engine.setTarget(target);
    res.json({ ok: true, state: engine.getState() });
  });

  return router;
}
