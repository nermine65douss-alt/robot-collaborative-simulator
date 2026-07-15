const HOME_POSE = { j1: 0, j2: -50, j3: 70, j4: -40, j5: 45, j6: 0 };
const DEMO_POSE = { j1: 35, j2: -70, j3: 100, j4: -60, j5: 60, j6: 25 };
const JOINT_KEYS = ["j1", "j2", "j3", "j4", "j5", "j6"];
const LINKS = { base: 90, upperArm: 320, forearm: 280, wrist: 90 };
const SPEED_DEG_PER_TICK = 1.2; // vitesse angulaire constante (degrés par tick de 50ms)

export class RobotEngine {
  constructor() {
    this.joints = { ...HOME_POSE };
    this.target = { ...HOME_POSE };
    this.status = "idle";
    this.connected = true;
    this.listeners = [];
    this.interval = null;
  }

  onUpdate(cb) {
    this.listeners.push(cb);
  }

  emit() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  getState() {
    return {
      joints: { ...this.joints },
      target: { ...this.target },
      status: this.status,
      connected: this.connected,
      tcp: this.computeTcp(),
      timestamp: Date.now(),
    };
  }

  setTarget(partialTarget) {
    this.target = { ...this.target, ...partialTarget };
    this.status = "running";
  }

  setCommand(command) {
    switch (command) {
      case "start": {
        const stillAtTarget = JOINT_KEYS.every(
          (k) => Math.abs(this.target[k] - this.joints[k]) < 0.5
        );
        if (stillAtTarget) {
          const atHome = JOINT_KEYS.every(
            (k) => Math.abs(this.joints[k] - HOME_POSE[k]) < 1
          );
          this.target = atHome ? { ...DEMO_POSE } : { ...HOME_POSE };
        }
        this.status = "running";
        break;
      }
      case "pause":
        this.status = "paused";
        break;
      case "stop":
        this.status = "idle";
        this.target = { ...this.joints };
        break;
      case "home":
        this.target = { ...HOME_POSE };
        this.status = "running";
        break;
      default:
        throw new Error(`Commande inconnue: ${command}`);
    }
  }

  computeTcp() {
    const rad = (deg) => (deg * Math.PI) / 180;
    const { j1, j2, j3 } = this.joints;
    const reach =
      LINKS.upperArm * Math.cos(rad(j2)) + LINKS.forearm * Math.cos(rad(j2 + j3));
    const height =
      LINKS.base + LINKS.upperArm * Math.sin(rad(j2)) + LINKS.forearm * Math.sin(rad(j2 + j3));
    return {
      x: Number((reach * Math.sin(rad(j1))).toFixed(1)),
      y: Number((reach * Math.cos(rad(j1))).toFixed(1)),
      z: Number(height.toFixed(1)),
    };
  }

  // Mouvement à vitesse angulaire constante : chaque joint avance d'un pas fixe
  // vers sa cible, pas d'un pourcentage de la distance restante.
  tick() {
    if (this.status === "running") {
      let reached = true;
      const next = { ...this.joints };
      JOINT_KEYS.forEach((key) => {
        const diff = this.target[key] - this.joints[key];
        if (Math.abs(diff) > SPEED_DEG_PER_TICK) {
          next[key] += Math.sign(diff) * SPEED_DEG_PER_TICK;
          reached = false;
        } else {
          next[key] = this.target[key];
        }
      });
      this.joints = next;
      if (reached) this.status = "idle";
    }
    this.emit();
  }

  start(tickMs = 50) {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(), tickMs);
  }

  stopEngine() {
    clearInterval(this.interval);
    this.interval = null;
  }
}
