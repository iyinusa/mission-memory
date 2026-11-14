import { Html, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Artifact, BeatImage, Status } from "../lib/types";
import ZoomPhoto from "./ZoomBubble";

const TEXTURES = { moon: "/media/textures/moon.jpg", mars: "/media/textures/mars.jpg" };
const STATUS_COLOR: Record<Status, string> = { active: "#7cf2c8", dormant: "#ffd166", silent: "#c3c9dc" };

/** Lat/lon (deg, east-positive) to a point on a sphere textured with three's default equirectangular UVs. */
function toVec(lat: number, lon: number, r: number): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

/** Rotation that brings (lat, lon) to face the camera on +Z. */
function facing(lat: number, lon: number): THREE.Quaternion {
  const e = new THREE.Euler(THREE.MathUtils.degToRad(lat) * 0.85, -THREE.MathUtils.degToRad(lon) - Math.PI / 2, 0, "XYZ");
  return new THREE.Quaternion().setFromEuler(e);
}

let glowTexture: THREE.Texture | null = null;
function glow(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

interface Pin {
  id: string;
  label: string;
  lat: number;
  lon: number;
  status: Status;
  tier: Artifact["tier"];
}

function pinsFor(ghosts: Artifact[]): Pin[] {
  return ghosts.flatMap((g) => {
    // A ghost resting at several places gets one pin per site, labelled by site.
    if (g.sites.length) return g.sites.map((s) => ({ id: g.id, label: s.label, lat: s.lat, lon: s.lon, status: g.status, tier: g.tier }));
    return g.lat != null && g.lon != null ? [{ id: g.id, label: g.name, lat: g.lat, lon: g.lon, status: g.status, tier: g.tier }] : [];
  });
}

function GhostPin({
  pin,
  selected,
  onSelect,
  planet,
  photo,
}: {
  pin: Pin;
  selected: boolean;
  onSelect: (id: string) => void;
  planet: React.RefObject<THREE.Mesh | null>;
  /** The explorer's hardware photo, shown in its label so learners can picture it. */
  photo?: BeatImage;
}) {
  const sprite = useRef<THREE.Sprite>(null);
  const pos = useMemo(() => toVec(pin.lat, pin.lon, 1.005), [pin.lat, pin.lon]);
  // Lift the label straight out from the surface so it never sinks behind the planet's curve.
  const labelAt = useMemo(() => toVec(pin.lat, pin.lon, 1.1).sub(pos), [pin.lat, pin.lon, pos]);
  const color = STATUS_COLOR[pin.status];
  const strong = pin.tier !== "map";

  useFrame(({ clock }) => {
    if (!sprite.current) return;
    const pulse = selected ? 1 + 0.25 * Math.sin(clock.elapsedTime * 3) : 1;
    sprite.current.scale.setScalar((strong ? 0.13 : 0.08) * (selected ? 1.6 : 1) * pulse);
  });

  return (
    <group position={pos}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta < 6) onSelect(pin.id); // a drag that ends on a pin is still a drag
        }}
      >
        <sphereGeometry args={[strong ? 0.016 : 0.011, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <sprite ref={sprite}>
        <spriteMaterial map={glow()} color={color} transparent opacity={strong ? 0.9 : 0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {selected && (
        // Hide the label only when the planet itself is in the way (not the pin's own glow).
        <Html center occlude={[planet as React.RefObject<THREE.Object3D>]} position={labelAt} className="globe-label" zIndexRange={[10, 0]}>
          {/* Hover the photo to see it bigger; the panel has the focusable version. */}
          {photo && <ZoomPhoto photo={photo} label={false} />}
          {pin.label}
        </Html>
      )}
    </group>
  );
}

function Planet({ world, ghosts, needle, lockedId, onSelect, portraits, reduceMotion }: GlobeProps & { reduceMotion: boolean }) {
  const map = useTexture(TEXTURES[world]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const group = useRef<THREE.Group>(null);
  const planet = useRef<THREE.Mesh>(null);
  const pins = useMemo(() => pinsFor(ghosts), [ghosts]);
  const selectedId = lockedId;
  // The tuner's needle is the longitude facing you; tilt toward the locked explorer's latitude.
  const lockedLat = ghosts.find((g) => g.id === lockedId)?.lat ?? 0;
  const target = useMemo(() => facing(lockedLat, needle), [lockedLat, needle]);

  useFrame((_, dt) => {
    if (!group.current) return;
    if (reduceMotion) group.current.quaternion.copy(target);
    else group.current.quaternion.slerp(target, 1 - Math.exp(-dt * 6));
  });

  return (
    <group ref={group}>
      <mesh ref={planet}>
        <sphereGeometry args={[1, 128, 64]} />
        <meshStandardMaterial map={map} roughness={1} metalness={0} />
      </mesh>
      {pins.map((p, i) => (
        <GhostPin key={`${p.id}-${i}`} pin={p} selected={p.id === selectedId} onSelect={onSelect} planet={planet} photo={portraits?.[p.id]} />
      ))}
    </group>
  );
}

export interface GlobeProps {
  world: "moon" | "mars";
  ghosts: Artifact[];
  /** Longitude (deg E) currently tuned; faces the camera. */
  needle: number;
  lockedId: string | null;
  /** Hardware photo per explorer id. */
  portraits?: Record<string, BeatImage>;
  onSelect: (id: string) => void;
  onTune: (lon: number) => void;
  onRelease: (lon: number) => void;
}

const wrapLon = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;

export default function Globe(props: GlobeProps) {
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);
  const lonAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current!;
    // Dragging right brings western longitudes into view, like spinning a real globe.
    return wrapLon(d.from - ((e.clientX - d.x) * 180) / e.currentTarget.clientWidth);
  };

  return (
    <div
      className="globe"
      onPointerDown={(e) => (drag.current = { x: e.clientX, from: props.needle, moved: false })}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || (!d.moved && Math.abs(e.clientX - d.x) < 6)) return;
        d.moved = true;
        props.onTune(lonAt(e));
      }}
      onPointerUp={(e) => {
        if (drag.current?.moved) props.onRelease(lonAt(e));
        drag.current = null;
      }}
      onPointerLeave={() => (drag.current = null)}
    >
      <Canvas camera={{ position: [0, 0, 3.1], fov: 40 }} dpr={[1, 2]} aria-hidden="true">
        <color attach="background" args={["#05070f"]} />
        <Stars radius={60} depth={30} count={2500} factor={3} fade speed={reduceMotion ? 0 : 0.6} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[-3, 2, 4]} intensity={2.4} />
        {/* Keep the starfield on screen while the NASA texture loads. */}
        <Suspense fallback={null}>
          <Planet {...props} reduceMotion={reduceMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
