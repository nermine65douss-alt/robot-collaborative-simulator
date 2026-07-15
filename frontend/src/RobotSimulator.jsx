import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Play, Pause, Square, Home, Wifi, WifiOff, Cpu } from "lucide-react";
import { useRobotSocket } from "./useRobotSocket";

const LINKS = {
  base: 90,
  shoulder: 40,
  upperArm: 320,
  forearm: 280,
  wrist1: 90,
  wrist2: 90,
  wrist3: 70,
};

const JOINT_LIMITS = [
  { key: "j1", label: "J1", min: -180, max: 180 },
  { key: "j2", label: "J2", min: -180, max: 180 },
  { key: "j3", label: "J3", min: -170, max: 170 },
  { key: "j4", label: "J4", min: -180, max: 180 },
  { key: "j5", label: "J5", min: -180, max: 180 },
  { key: "j6", label: "J6", min: -360, max: 360 },
];

const HOME_POSE = { j1: 0, j2: -50, j3: 70, j4: -40, j5: 45, j6: 0 };

export default function RobotSimulator() {
  const mountRef = useRef(null);
  const sceneRef = useRef({});
  const [robotModel, setRobotModel] = useState("UR5");
  const dragRef = useRef({ active: false, px: 0, py: 0 });
  const camAngleRef = useRef({ theta: 0.9, phi: 1.15, radius: 1300 });

  const { state, connected, sendCommand, sendJoints } = useRobotSocket("ws://localhost:4000/ws");
  const joints = state?.joints || HOME_POSE;
  const status = state?.status || "idle";

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    scene.fog = new THREE.Fog(0x0d1117, 1400, 3200);

    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8899aa, 0.55));
    const key = new THREE.DirectionalLight(0x66e0ff, 0.9);
    key.position.set(600, 900, 700);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a3d, 0.35);
    rim.position.set(-700, 300, -500);
    scene.add(rim);

    const grid = new THREE.GridHelper(2000, 40, 0x1f6f8b, 0x172029);
    grid.position.y = 0;
    scene.add(grid);

    const floorGeo = new THREE.CircleGeometry(1000, 64);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0e13, roughness: 1, metalness: 0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    scene.add(floor);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8ecef, metalness: 0.35, roughness: 0.4 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x18a0c9, metalness: 0.5, roughness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.4, roughness: 0.5 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff8a3d, metalness: 0.3, roughness: 0.4, emissive: 0x552200, emissiveIntensity: 0.3 });

    function makeJointSphere(r) {
      const g = new THREE.SphereGeometry(r, 24, 16);
      return new THREE.Mesh(g, jointMat);
    }
    function makeLinkBox(len, w) {
      const g = new THREE.BoxGeometry(w, len, w);
      const m = new THREE.Mesh(g, bodyMat);
      m.position.y = len / 2;
      return m;
    }

    const base = new THREE.Group();
    scene.add(base);

    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(75, 85, LINKS.base, 32), darkMat);
    baseMesh.position.y = LINKS.base / 2;
    base.add(baseMesh);
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(78, 6, 12, 32), accentMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = LINKS.base;
    base.add(baseRing);

    const j1 = new THREE.Group();
    j1.position.y = LINKS.base;
    base.add(j1);
    j1.add(makeJointSphere(55));

    const shoulderLink = new THREE.Group();
    j1.add(shoulderLink);
    shoulderLink.add(makeLinkBox(LINKS.shoulder, 90));

    const j2 = new THREE.Group();
    j2.position.y = LINKS.shoulder;
    shoulderLink.add(j2);
    j2.add(makeJointSphere(50));

    const upperArmLink = new THREE.Group();
    j2.add(upperArmLink);
    upperArmLink.add(makeLinkBox(LINKS.upperArm, 65));

    const j3 = new THREE.Group();
    j3.position.y = LINKS.upperArm;
    upperArmLink.add(j3);
    j3.add(makeJointSphere(42));

    const forearmLink = new THREE.Group();
    j3.add(forearmLink);
    forearmLink.add(makeLinkBox(LINKS.forearm, 50));

    const j4 = new THREE.Group();
    j4.position.y = LINKS.forearm;
    forearmLink.add(j4);
    j4.add(makeJointSphere(34));

    const wrist1Link = new THREE.Group();
    j4.add(wrist1Link);
    wrist1Link.add(makeLinkBox(LINKS.wrist1, 36));

    const j5 = new THREE.Group();
    j5.position.y = LINKS.wrist1;
    wrist1Link.add(j5);
    j5.add(makeJointSphere(30));

    const wrist2Link = new THREE.Group();
    j5.add(wrist2Link);
    wrist2Link.add(makeLinkBox(LINKS.wrist2, 32));

    const j6 = new THREE.Group();
    j6.position.y = LINKS.wrist2;
    wrist2Link.add(j6);
    j6.add(makeJointSphere(26));

    const toolLink = new THREE.Group();
    j6.add(toolLink);
    const gripperBase = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, LINKS.wrist3 * 0.5, 16), darkMat);
    gripperBase.position.y = LINKS.wrist3 * 0.25;
    toolLink.add(gripperBase);
    const fingerGeo = new THREE.BoxGeometry(10, 40, 14);
    const f1 = new THREE.Mesh(fingerGeo, accentMat);
    f1.position.set(16, LINKS.wrist3 * 0.5 + 20, 0);
    const f2 = new THREE.Mesh(fingerGeo, accentMat);
    f2.position.set(-16, LINKS.wrist3 * 0.5 + 20, 0);
    toolLink.add(f1, f2);

    const tcpMarker = new THREE.Object3D();
    tcpMarker.position.y = LINKS.wrist3 * 0.5 + 45;
    toolLink.add(tcpMarker);

    sceneRef.current = { scene, camera, renderer, j1, j2, j3, j4, j5, j6, tcpMarker, mount };

    function updateCamera() {
      const { theta, phi, radius } = camAngleRef.current;
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) + 150,
        radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(0, 300, 0);
    }
    updateCamera();
    sceneRef.current.updateCamera = updateCamera;

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s.j1) return;
    const d2r = Math.PI / 180;
    s.j1.rotation.y = joints.j1 * d2r;
    s.j2.rotation.z = joints.j2 * d2r;
    s.j3.rotation.z = joints.j3 * d2r;
    s.j4.rotation.z = joints.j4 * d2r;
    s.j5.rotation.y = joints.j5 * d2r;
    s.j6.rotation.z = joints.j6 * d2r;
  }, [joints]);

  useEffect(() => {
    const mount = mountRef.current;
    function onDown(e) {
      dragRef.current = { active: true, px: e.clientX, py: e.clientY };
    }
    function onMove(e) {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.px;
      const dy = e.clientY - dragRef.current.py;
      dragRef.current.px = e.clientX;
      dragRef.current.py = e.clientY;
      const cam = camAngleRef.current;
      cam.theta -= dx * 0.006;
      cam.phi = Math.min(Math.max(cam.phi - dy * 0.006, 0.25), 1.5);
      sceneRef.current.updateCamera && sceneRef.current.updateCamera();
    }
    function onUp() {
      dragRef.current.active = false;
    }
    function onWheel(e) {
      e.preventDefault();
      const cam = camAngleRef.current;
      cam.radius = Math.min(Math.max(cam.radius + e.deltaY * 0.6, 500), 2600);
      sceneRef.current.updateCamera && sceneRef.current.updateCamera();
    }
    mount.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    mount.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      mount.removeEventListener("wheel", onWheel);
    };
  }, []);

  const handleSlider = useCallback((key, val) => {
    sendJoints({ [key]: val });
  }, [sendJoints]);

  const pos = state?.tcp || { x: 0, y: 0, z: 0 };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: "#0a0d12",
      color: "#e8ecef",
      display: "flex",
      minHeight: "640px",
      borderRadius: "14px",
      overflow: "hidden",
      border: "1px solid #1c2430",
    }}>
      <div style={{
        width: "280px",
        flexShrink: 0,
        background: "#0d1117",
        borderRight: "1px solid #1c2430",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Cpu size={18} color="#18a0c9" />
          <span style={{ fontSize: "12px", letterSpacing: "0.12em", color: "#6b7684", fontWeight: 600, textTransform: "uppercase" }}>
            Simulateur Robot
          </span>
        </div>

        <Section label="Robot">
          <select
            value={robotModel}
            onChange={(e) => setRobotModel(e.target.value)}
            style={selectStyle}
          >
            <option>UR5</option>
            <option>UR10</option>
            <option>JAKA Zu 7</option>
          </select>
        </Section>

        <Section label="État">
          <div
            style={{
              ...pillButtonStyle,
              background: connected ? "rgba(24,160,201,0.15)" : "rgba(255,80,80,0.12)",
              color: connected ? "#4fd1e8" : "#ff8080",
              border: `1px solid ${connected ? "#18a0c9" : "#ff5050"}`,
            }}
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? `Connecté (${status})` : "Backend injoignable"}
          </div>
        </Section>

        <Section label="Joints (°)">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {JOINT_LIMITS.map(({ key, label, min, max }) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#8b95a3", marginBottom: "3px" }}>
                  <span>{label}</span>
                  <span style={{ fontFamily: "monospace", color: "#18a0c9" }}>{joints[key].toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={joints[key]}
                  onChange={(e) => handleSlider(key, Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#18a0c9" }}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section label="Commandes">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <CmdButton color="#2ecc71" onClick={() => sendCommand("start")} icon={<Play size={14} />} label="Start" />
            <CmdButton color="#f1c40f" onClick={() => sendCommand("pause")} icon={<Pause size={14} />} label="Pause" dark />
            <CmdButton color="#e74c3c" onClick={() => sendCommand("stop")} icon={<Square size={14} />} label="Stop" />
            <CmdButton color="#3498db" onClick={() => sendCommand("home")} icon={<Home size={14} />} label="Home" />
          </div>
        </Section>

        <Section label="Position (TCP)">
          <div style={{
            fontFamily: "monospace",
            fontSize: "12px",
            background: "#11161d",
            border: "1px solid #1c2430",
            borderRadius: "8px",
            padding: "10px 12px",
            lineHeight: 1.7,
            color: "#b6c0cc",
          }}>
            <div>X&nbsp;&nbsp;{pos.x.toFixed(1)} mm</div>
            <div>Y&nbsp;&nbsp;{pos.y.toFixed(1)} mm</div>
            <div>Z&nbsp;&nbsp;{pos.z.toFixed(1)} mm</div>
          </div>
        </Section>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab", touchAction: "none" }} />
        <div style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          fontSize: "11px",
          color: "#556",
          background: "rgba(10,13,18,0.7)",
          padding: "4px 10px",
          borderRadius: "6px",
        }}>
          glisser pour orbiter · molette pour zoomer
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "#556", textTransform: "uppercase", marginBottom: "8px", fontWeight: 600 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CmdButton({ color, onClick, icon, label, dark }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: "9px 0",
        borderRadius: "8px",
        border: "none",
        background: color,
        color: dark ? "#1a1a1a" : "#fff",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "filter 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
      onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1)")}
    >
      {icon}
      {label}
    </button>
  );
}

const selectStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  background: "#11161d",
  border: "1px solid #1c2430",
  color: "#e8ecef",
  fontSize: "13px",
};

const pillButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};
