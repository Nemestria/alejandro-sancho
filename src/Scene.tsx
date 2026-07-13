import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGLTF, Html, Text, Billboard, RenderTexture } from "@react-three/drei";
import {
  Box3, CanvasTexture, DataTexture, Euler, MathUtils, MeshToonMaterial,
  NearestFilter, Object3D, RedFormat, RepeatWrapping, Vector3,
  type Group, type Material, type Mesh,
} from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { FlightPhase } from "./CameraRig";
import {
  SCREEN_WORLD_POSITION,
  SCREEN_WORLD_ROTATION_Y,
  SCREEN_WORLD_SIZE,
} from "./screenAnchor";
import { createArcadeScreenMaterial } from "./arcadeScreenMaterial";

// CSS width of the billboard-mode Html div; distanceFactor (computed in
// ScreenPlane, per canvas size) scales it to the plane's actual world size.
const HTML_WIDTH_PX = 300;

// Wireframe was used to hand-fit SCREEN_WORLD_SIZE/POSITION against the
// monitor's actual bezel (see screenAnchor.ts) — dialed in now, off.
const SCREEN_DEBUG = false;

// In-scene hint for the password — a sticky note near the desk, not just
// backstory. See ARCHITECTURE.md "In-scene note prop".
function Note() {
  return (
    <group position={[0.2, 1.6, 0.1]} rotation={[0, 0, 0.25]}>
      <mesh receiveShadow>
        <planeGeometry args={[0.16, 0.12]} />
        <meshStandardMaterial color="#f2e8c9" roughness={0.9} />
      </mesh>
      <Text
        position={[0, 0, 0.001]}
        fontSize={0.045}
        color="#2a2a2a"
        anchorX="center"
        anchorY="middle"
      >
        1234
      </Text>
    </group>
  );
}

// Google Fonts "Boldonse" — a genuinely heavy display weight. troika's SDF
// <Text> needs an actual font *file* loaded via XHR inside a worker, and
// that silently never resolved here (no error, no visible network request,
// tried both a remote .woff and a self-hosted same-origin .ttf) — rather
// than keep fighting troika's worker font loader, render this one as a
// regular DOM overlay instead: drei's <Html> billboard mode (no `transform`,
// same technique ScreenPlane already uses reliably) with a plain CSS
// @import (see index.css), exactly how the rest of this app's text
// (PasswordTerminal, LanguageGate) already gets its fonts.
function WelcomeSign({ text }: { text: string }) {
  // World position picked so it projects onto the RIGHT side of the
  // establishing shot (camera (4,3,6) → (0,1.2,0)) at roughly the same
  // camera distance as its old spot (apparent size unchanged) — the old
  // left-side position now collides visually with the arcade cabinet.
  return (
    <Billboard position={[2.3, 1.9, -1.2]}>
      <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div
          style={{
            width: 340,
            fontFamily: "'Boldonse', sans-serif",
            fontSize: 22,
            lineHeight: 1.4,
            textAlign: "center",
            color: "#ffffff",
          }}
        >
          {text.toUpperCase()}
        </div>
      </Html>
    </Billboard>
  );
}

// Office tile floor — a single mesh with a procedural repeating-tile
// texture, replacing the old solid-floor-plane + drei <Grid> combo. Those
// were two separate planes ~0.002 units apart, which z-fought (flickered)
// at distance since depth-buffer precision drops off with distance in a
// perspective projection; one textured mesh has no second plane to fight.
function OfficeFloor() {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    // Grout color fills the whole tile; the inset tile face leaves a
    // uniform grout line visible on every edge when repeated.
    ctx.fillStyle = "#23272b";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#3a4046";
    const inset = 5;
    ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2);

    const tex = new CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    // High repeat count on the 200x200 floor plane = small tiles (~1.4
    // world units each), office-tile scale rather than a warehouse grid.
    tex.repeat.set(140, 140);
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial map={texture} roughness={0.95} />
    </mesh>
  );
}

function Desk() {
  const { scene } = useGLTF("/Adjustable Desk.glb");
  return <primitive object={scene} position={[0, 0, 0]} scale={1.4} rotation={[0, Math.PI/2, 0]} />;
}

function Computer({
  onClick,
  onHoverChange,
  interactive,
}: {
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onHoverChange: (hovered: boolean) => void;
  interactive: boolean;
}) {
  const { scene } = useGLTF("/Computer.glb");

  // Desk top is roughly y=0.75 (placeholder Adjustable Desk.glb) — auto-fit
  // the computer's own bounding box onto that surface instead of guessing
  // a hardcoded scale/position per model.
  const deskTopY = 0.75 * 1.4 + 0.27; // matches Desk's scale={1.4}, nudged up onto the surface

  const rotationY = 0;

  const { scale, position } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    const targetHeight = 0.9;
    const s = size.y > 0 ? targetHeight / size.y : 1;
    const center = new Vector3();
    box.getCenter(center);
    // Center offset must be rotated to match the model's applied Y rotation,
    // since position is applied in world axes after rotation swaps x/z.
    const rotatedCenter = center
      .clone()
      .applyAxisAngle(new Vector3(0, 1, 0), rotationY);
    return {
      scale: s,
      position: [
        -rotatedCenter.x * s,
        deskTopY - box.min.y * s,
        -rotatedCenter.z * s,
      ] as [number, number, number],
    };
  }, [scene, deskTopY, rotationY]);

  return (
    <primitive
      object={scene}
      scale={scale}
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick(e);
      }}
      onPointerOver={() => {
        if (!interactive) return;
        document.body.style.cursor = "pointer";
        onHoverChange(true);
      }}
      onPointerOut={() => {
        if (!interactive) return;
        document.body.style.cursor = "auto";
        onHoverChange(false);
      }}
    />
  );
}

interface ArcadeNodes {
  scene: Group;
  nodes: {
    Arcade: Mesh;
    CoinInserter: Mesh;
    Joystick: Mesh;
    A_button: Mesh;
    B_button: Mesh;
    X_button: Mesh;
    Y_button: Mesh;
    ArcadeScreen: Mesh;
  };
}

// Second station, alongside Computer/ScreenPlane — a coin-op cabinet whose
// screen will (Phase 5 of the arcade plan, not yet wired here) use a
// genuine WebGL render-to-texture instead of the computer's DOM/iframe
// screen. Placement below is a first guess — tune once visible, same spirit
// as Computer's own hand-picked deskTopY.
const ARCADE_POSITION: [number, number, number] = [-2.6, 0, 0.6];
// The model's front is its local -Z (confirmed live: at rotY=0.6 the camera
// saw its back), so facing the establishing camera needs the extra half-turn.
const ARCADE_ROTATION_Y = 0.6 + Math.PI;
const ARCADE_TARGET_HEIGHT = 2.2; // meters — bumped 30% from 1.7 per feedback

// The arcade's own pool of light — without it the cabinet is black on black
// (near-zero ambient + fog) and effectively invisible. The GLB even ships a
// "Fake Light" empty above the cabinet hinting the model expects this.
// Magenta-tinted to read as a distinct station from the desk's cool blue.
//
// The target must be an explicit Object3D rendered into the scene graph:
// the `target-position` shorthand alone leaves the default target orphaned
// (its matrixWorld never updates), so the light would silently keep aiming
// at the world origin — i.e. the desk, not the arcade. The desk's own spot
// gets away with that because it points near the origin anyway.
function ArcadeSpot() {
  const target = useMemo(() => {
    const o = new Object3D();
    o.position.set(ARCADE_POSITION[0], 0.9, ARCADE_POSITION[2]);
    return o;
  }, []);
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[ARCADE_POSITION[0], 6, ARCADE_POSITION[2] + 0.5]}
        angle={0.35}
        penumbra={0.6}
        intensity={110}
        distance={12}
        decay={2}
        color="#f2bfe9"
        castShadow
        target={target}
      />
    </>
  );
}

// Duration of the coin's flight into the slot, seconds.
const COIN_FLIGHT = 0.9;

// Physical-controls cosmetics: how far the joystick tips (radians) and which
// key each face button answers to. The controls mirror the same keys that
// drive the menu (DesktopApp owns the actual input) — this is feedback only.
const JOY_TILT = 0.3;
const BUTTON_NODES = ["A_button", "B_button", "X_button", "Y_button"] as const;
const BUTTON_KEY = {
  A_button: "a", B_button: "b", X_button: "x", Y_button: "y",
} as const;

function easeCoin(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Arcade({
  onClick,
  onHoverChange,
  interactive,
  atStation,
  screenOn,
  onCoinInserted,
  screenChildren,
}: {
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onHoverChange: (hovered: boolean) => void;
  interactive: boolean;
  // True while the camera is parked at this station ("arrived" + arcade) —
  // gates the coin-slot interaction the same way `interactive` gates the
  // station-select click.
  atStation: boolean;
  screenOn: boolean;
  onCoinInserted: () => void;
  // Rendered inside the screen's RenderTexture portal (the menu scene) —
  // content lives in DesktopApp so selection state can drive navigation.
  screenChildren?: ReactNode;
}) {
  const { scene, nodes } = useGLTF("/ArcadeFolio.glb") as unknown as ArcadeNodes;

  // Toon look for the whole cabinet, per direction. A 3-step gradient map
  // gives the classic hard-banded cel shading (without one, MeshToonMaterial
  // is a flat two-tone). The model's coloring lives in vertex colors (the
  // GLB's shared material is otherwise default), so vertexColors carries
  // straight over.
  const gradientMap = useMemo(() => {
    const tex = new DataTexture(new Uint8Array([90, 165, 235]), 3, 1, RedFormat);
    tex.minFilter = NearestFilter;
    tex.magFilter = NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // The coin slot's own toon material instance, for the "click me" pulse —
  // emissive on the material itself, NOT a light in front of it (a light
  // washed the whole control panel out, see git history).
  const slotMatRef = useRef<MeshToonMaterial | null>(null);

  useEffect(() => {
    const swapped: Array<[Mesh, Material | Material[]]> = [];
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      swapped.push([m, m.material]);
      const toon = new MeshToonMaterial({ vertexColors: true, gradientMap });
      if (m.name === "CoinInserter") {
        toon.emissive.set("#f2bfe9");
        toon.emissiveIntensity = 0;
        slotMatRef.current = toon;
      }
      m.material = toon;
    });
    return () => {
      slotMatRef.current = null;
      swapped.forEach(([m, original]) => {
        (m.material as Material).dispose();
        m.material = original;
      });
    };
  }, [scene, gradientMap]);

  // Same auto-fit-by-bounding-box approach as Computer() below — scale to a
  // target height, then position so the model's own base sits on the floor
  // at ARCADE_POSITION rather than guessing a hardcoded scale per model.
  const { scale, position } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    const s = size.y > 0 ? ARCADE_TARGET_HEIGHT / size.y : 1;
    const center = new Vector3();
    box.getCenter(center);
    const rotatedCenter = center.clone().applyAxisAngle(new Vector3(0, 1, 0), ARCADE_ROTATION_Y);
    return {
      scale: s,
      position: [
        ARCADE_POSITION[0] - rotatedCenter.x * s,
        ARCADE_POSITION[1] - box.min.y * s,
        ARCADE_POSITION[2] - rotatedCenter.z * s,
      ] as [number, number, number],
    };
  }, [scene]);

  // Coin-slot center in group-local space (= the loader scene's root
  // space, since CoinInserter is a direct child of it) — computed from the
  // geometry's own bounds run through the node's local matrix, no hand-done
  // rotation math. The cabinet's front is group-local -Z (see
  // ARCADE_ROTATION_Y), so the coin approaches from -Z.
  const coinPath = useMemo(() => {
    const m = nodes.CoinInserter;
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox!.clone();
    m.updateMatrix();
    bb.applyMatrix4(m.matrix);
    const slot = new Vector3();
    bb.getCenter(slot);
    return {
      slot,
      start: slot.clone().add(new Vector3(0, 0.4, -0.8)),
      end: slot.clone().add(new Vector3(0, 0.02, -0.02)),
    };
  }, [nodes]);

  // Physical controls (joystick + face buttons) reacting to the same keys
  // the menu listens for. Key state lives in a ref fed by plain window
  // listeners (active only while parked here); the meshes' cached
  // transforms are damped toward it per-frame — same convention as
  // CameraRig, no tween library. Mutating the cached nodes is safe for the
  // same reason ArcadeScreen.visible is: the scene renders as one
  // primitive, and the base transforms are restored on unmount.
  const keysDown = useRef({
    up: false, down: false, left: false, right: false,
    a: false, b: false, x: false, y: false,
  });
  const joyTilt = useRef({ x: 0, z: 0 });
  const joyEuler = useMemo(() => new Euler(), []);
  const btnPress = useRef({ A_button: 0, B_button: 0, X_button: 0, Y_button: 0 });

  const controlsBase = useMemo(() => {
    // Press travel derived from each button's own bounds (in the group's
    // space, via the node matrix) so it scales with the model instead of a
    // hand-picked world constant.
    const travel = (m: Mesh) => {
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox!.clone();
      m.updateMatrix();
      bb.applyMatrix4(m.matrix);
      return (bb.max.y - bb.min.y) * 0.45;
    };
    return {
      joyQuat: nodes.Joystick.quaternion.clone(),
      buttons: BUTTON_NODES.map((name) => ({
        name,
        baseY: nodes[name].position.y,
        travel: travel(nodes[name]),
      })),
    };
  }, [nodes]);

  useEffect(() => {
    if (!atStation) return;
    const map: Record<string, keyof typeof keysDown.current> = {
      arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right",
      a: "a", b: "b", x: "x", y: "y",
    };
    const set = (e: KeyboardEvent, v: boolean) => {
      const k = map[e.key.toLowerCase()];
      if (k) keysDown.current[k] = v;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      // Release everything so the stick/buttons ease back to rest.
      (Object.keys(keysDown.current) as Array<keyof typeof keysDown.current>)
        .forEach((k) => { keysDown.current[k] = false; });
    };
  }, [atStation]);

  useEffect(() => () => {
    nodes.Joystick.quaternion.copy(controlsBase.joyQuat);
    controlsBase.buttons.forEach(({ name, baseY }) => {
      nodes[name].position.y = baseY;
    });
  }, [nodes, controlsBase]);

  // The live screen's geometry, with UVs REWRITTEN from the vertex
  // positions instead of the authored ones. The GLB's UV island for this
  // face is rotated, mirrored AND smaller than the full 0..1 square, which
  // showed the menu sideways/backwards/cropped — and counter-transforming
  // the texture matrix (tried first) still left it wrong. A flat planar
  // projection along the face is deterministic: viewer-right on the
  // cabinet is mesh-local -X and viewer-up is mesh-local -Z (the node's
  // 90° X-rotation maps world +Y to local -Z), so u/v run exactly 0..1
  // across the visible face. The box's thin side faces get edge-smeared
  // texels — invisible at the bezel, acceptable.
  const screenGeom = useMemo(() => {
    const g = nodes.ArcadeScreen.geometry.clone();
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const xRange = bb.max.x - bb.min.x;
    const zRange = bb.max.z - bb.min.z;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(
        i,
        (bb.max.x - pos.getX(i)) / xRange,
        (bb.max.z - pos.getZ(i)) / zRange,
      );
    }
    uv.needsUpdate = true;
    return g;
  }, [nodes]);

  // The display shader for the live screen (pixelation/dither/vignette/
  // scanlines — see arcadeScreenMaterial.ts). One instance for the
  // component's lifetime; the RenderTexture attaches into uniforms.map.
  const screenMat = useMemo(() => createArcadeScreenMaterial(), []);
  useEffect(() => () => screenMat.dispose(), [screenMat]);

  const [coinFlying, setCoinFlying] = useState(false);
  const coinT = useRef(0);
  const coinRef = useRef<Mesh>(null);

  // "Click here" affordances while waiting for the coin: a bobbing arrow
  // over the slot + a soft emissive pulse on the slot's own material (see
  // slotMatRef), plus a hover glow on the screen mirroring the computer's
  // ScreenPlane treatment. Animated via refs, not state — they tick every
  // frame.
  const [slotHover, setSlotHover] = useState(false);
  const [idleHover, setIdleHover] = useState(false);
  const arrowRef = useRef<Mesh>(null);
  const awaitingCoin = atStation && !screenOn && !coinFlying;

  useFrame((state, delta) => {
    const tm = state.clock.elapsedTime;
    screenMat.uniforms.time.value = tm;
    if (arrowRef.current) {
      arrowRef.current.position.y = coinPath.slot.y + 0.55 + Math.sin(tm * 3) * 0.07;
    }
    if (slotMatRef.current) {
      slotMatRef.current.emissiveIntensity = awaitingCoin
        ? (slotHover ? 0.5 : 0.16 + Math.sin(tm * 3) * 0.1)
        : 0;
    }
    // Joystick + face buttons chase the held keys. Tilt is a group-space
    // rotation premultiplied onto the node's authored orientation: the
    // cabinet front is group -Z (player side) and viewer-right is group -X,
    // so +X rotation tips the stick away from the player (up arrow) and
    // +Z rotation tips it to the player's right (right arrow).
    const k = keysDown.current;
    joyTilt.current.x = MathUtils.damp(
      joyTilt.current.x, (k.up ? JOY_TILT : 0) + (k.down ? -JOY_TILT : 0), 14, delta);
    joyTilt.current.z = MathUtils.damp(
      joyTilt.current.z, (k.right ? JOY_TILT : 0) + (k.left ? -JOY_TILT : 0), 14, delta);
    nodes.Joystick.quaternion
      .setFromEuler(joyEuler.set(joyTilt.current.x, 0, joyTilt.current.z))
      .multiply(controlsBase.joyQuat);
    controlsBase.buttons.forEach(({ name, baseY, travel }) => {
      btnPress.current[name] = MathUtils.damp(
        btnPress.current[name], k[BUTTON_KEY[name]] ? 1 : 0, 22, delta);
      nodes[name].position.y = baseY - btnPress.current[name] * travel;
    });
    if (!coinFlying || !coinRef.current) return;
    coinT.current = Math.min(1, coinT.current + delta / COIN_FLIGHT);
    const t = easeCoin(coinT.current);
    const p = new Vector3().lerpVectors(coinPath.start, coinPath.end, t);
    p.y += Math.sin(t * Math.PI) * 0.18; // small arc, like a tossed token
    coinRef.current.position.copy(p);
    coinRef.current.rotation.set(t * Math.PI * 3, 0, Math.PI / 2);
    if (coinT.current >= 1) {
      setCoinFlying(false);
      onCoinInserted();
    }
  });

  // While the screen is on, the modeled (dark) screen mesh hides so the
  // RenderTexture overlay below is the only surface at that spot — shared
  // geometry at identical transform would z-fight otherwise. Mutating
  // `visible` on the cached node is deliberate and reverted on power-off.
  useEffect(() => {
    nodes.ArcadeScreen.visible = !screenOn;
    return () => { nodes.ArcadeScreen.visible = true; };
  }, [screenOn, nodes]);

  return (
    <group
      scale={scale}
      position={position}
      rotation={[0, ARCADE_ROTATION_Y, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (atStation) {
          // Parked at the cabinet: only the coin slot reacts (r3f events
          // bubble from the hit submesh; e.object.name discriminates).
          if (e.object.name === "CoinInserter" && !screenOn && !coinFlying) {
            coinT.current = 0;
            setCoinFlying(true);
          }
          return;
        }
        if (interactive) onClick(e);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (atStation) {
          if (e.object.name === "CoinInserter" && !screenOn) {
            document.body.style.cursor = "pointer";
            setSlotHover(true);
          }
          return;
        }
        if (!interactive) return;
        document.body.style.cursor = "pointer";
        setIdleHover(true);
        onHoverChange(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
        setSlotHover(false);
        setIdleHover(false);
        if (interactive) onHoverChange(false);
      }}
    >
      {/* The whole loader scene as ONE primitive, like Computer() — never
          destructure nodes into separate <primitive>s here: that reparents
          them out of drei's cached loader scene, so any remount (HMR,
          suspense retry) measures an empty scene → NaN placement →
          invisible cabinet. Per-submesh interactions use r3f event
          bubbling on this group + e.object.name instead. */}
      <primitive object={scene} />

      {/* The coin, only while mid-flight */}
      {coinFlying && (
        <mesh ref={coinRef} position={coinPath.start}>
          <cylinderGeometry args={[0.11, 0.11, 0.03, 24]} />
          <meshStandardMaterial color="#d9b13b" metalness={0.85} roughness={0.25} emissive="#5a4410" emissiveIntensity={0.4} />
        </mesh>
      )}

      {/* Coin-slot affordance: bobbing "insert here" arrow (the slot itself
          pulses via its material's emissive, see slotMatRef), only while
          parked at the cabinet waiting for the coin */}
      {awaitingCoin && (
        <mesh
          ref={arrowRef}
          position={[coinPath.slot.x, coinPath.slot.y + 0.55, coinPath.slot.z - 0.12]}
          rotation={[Math.PI, 0, 0]}
        >
          <coneGeometry args={[0.09, 0.2, 12]} />
          <meshBasicMaterial color="#f2bfe9" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      )}

      {/* Powered-off screen tint — faint always so the glass reads as a
          screen, brighter on hover while the cabinet is selectable (same
          affordance the computer's ScreenPlane gives). polygonOffset pulls
          it in front of the identically-placed modeled screen so the two
          coplanar surfaces don't z-fight. */}
      {!screenOn && (
        <mesh
          geometry={nodes.ArcadeScreen.geometry}
          position={nodes.ArcadeScreen.position}
          quaternion={nodes.ArcadeScreen.quaternion}
        >
          <meshBasicMaterial
            color="#f2bfe9"
            transparent
            opacity={idleHover && interactive ? 0.3 : 0.07}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}

      {/* The live screen — same geometry as the modeled ArcadeScreen at the
          same transform, wearing the RenderTexture (a genuine second scene
          rendered to an off-screen target every frame — the technique from
          the basement.studio reference, via drei's built-in). Mounted only
          while powered on, so the extra render pass costs nothing until a
          coin goes in. */}
      {screenOn && screenChildren && (
        <mesh
          geometry={screenGeom}
          position={nodes.ArcadeScreen.position}
          quaternion={nodes.ArcadeScreen.quaternion}
        >
          {/* Custom display shader instead of a stock material — the
              RenderTexture's live output wires into its map uniform via
              r3f's dashed attach path (the declarative equivalent of the
              reference computer.tsx's onMapTexture + useEffect). */}
          <primitive object={screenMat} attach="material">
            <RenderTexture attach="uniforms-map-value" width={1024} height={1024} samples={4}>
              {screenChildren}
            </RenderTexture>
          </primitive>
        </mesh>
      )}
    </group>
  );
}

// The visible screen surface, kept as its own top-level world-space object
// (not nested inside Computer's auto-fit group — see screenAnchor.ts for why
// and how its world position/normal were derived). Doubles as the hover-glow
// target and the anchor for the password terminal / embedded portfolio.
function ScreenPlane({
  onClick,
  hovered,
  onHoverChange,
  screenContent,
  interactive,
}: {
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  screenContent?: ReactNode;
  interactive: boolean;
}) {
  // drei's billboard-mode Html sizes itself as
  // (objectScale(camera) * distanceFactor), where objectScale already
  // cancels out fov/distance to give a true world-size billboard — the only
  // free variable left is canvas height in css px. Solving for "on-screen
  // width == SCREEN_WORLD_SIZE[0] projected" gives distanceFactor purely as
  // (worldWidth * canvasHeightPx) / htmlWidthPx, independent of camera
  // distance/fov/zoom. A fixed constant here (previously 0.9) only matched
  // one specific window size — this keeps the embed pinned to the plane's
  // actual world size regardless of viewport or zoom.
  const canvasHeight = useThree((state) => state.size.height);
  const distanceFactor = (SCREEN_WORLD_SIZE[0] * canvasHeight) / HTML_WIDTH_PX;

  return (
    <group position={SCREEN_WORLD_POSITION} rotation={[0, SCREEN_WORLD_ROTATION_Y, 0]}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick(e);
        }}
        onPointerOver={() => {
          if (!interactive) return;
          document.body.style.cursor = "pointer";
          onHoverChange(true);
        }}
        onPointerOut={() => {
          if (!interactive) return;
          document.body.style.cursor = "auto";
          onHoverChange(false);
        }}
      >
        <planeGeometry args={SCREEN_WORLD_SIZE} />
        <meshStandardMaterial
          color="#001414"
          emissive={hovered ? "#00e5ec" : "#00373a"}
          emissiveIntensity={hovered ? 1.4 : 0.25}
          wireframe={SCREEN_DEBUG}
          side={2}
        />
        {screenContent && (
          // Billboard mode (no `transform`), not perspective-matched — fine
          // here since the locked-POV camera (CameraRig) always looks
          // nearly straight at this plane by design, so there's no real
          // skew to correct for. Much more robust than <Html transform>,
          // which produced broken off-screen CSS matrices in testing.
          <Html
            position={[0, 0, 0.01]}
            center
            occlude
            distanceFactor={distanceFactor}
            style={{
              width: HTML_WIDTH_PX,
              height: HTML_WIDTH_PX * (SCREEN_WORLD_SIZE[1] / SCREEN_WORLD_SIZE[0]),
              pointerEvents: "auto",
            }}
          >
            {screenContent}
          </Html>
        )}
      </mesh>
    </group>
  );
}

export default function Scene({
  phase,
  onComputerClick,
  onArcadeClick,
  screenContent,
  welcomeText,
  showWelcome,
  arcadeArrived,
  arcadeScreenOn,
  onCoinInserted,
  arcadeScreenContent,
}: {
  phase: FlightPhase;
  onComputerClick: () => void;
  onArcadeClick: () => void;
  screenContent?: ReactNode;
  welcomeText: string;
  // False while the language-select gate is still up (App.tsx) — the sign
  // shouldn't appear until the visitor has actually entered the room.
  showWelcome: boolean;
  arcadeArrived: boolean;
  arcadeScreenOn: boolean;
  onCoinInserted: () => void;
  arcadeScreenContent?: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  // Hover-glow only makes sense while picking a station from the general
  // camera — once flying/arrived/returning ("in the computer"), the screen
  // is either mid-transition or already the active focus, not a hoverable
  // menu item.
  const interactive = phase === "idle";

  // WelcomeSign is a one-shot greeting: gone after 15s, or immediately once
  // the visitor enters a station for the first time (whichever comes first).
  // The 15s clock only starts once showWelcome flips true (i.e. once the
  // language gate is dismissed) — otherwise it could burn down while the
  // visitor is still picking a language.
  const [signDismissed, setSignDismissed] = useState(false);
  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(() => setSignDismissed(true), 15000);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  const handleClick = () => {
    if (!interactive) return;
    setSignDismissed(true);
    onComputerClick();
  };
  const handleHoverChange = (h: boolean) => setHovered(interactive && h);

  const handleArcadeClick = () => {
    if (!interactive) return;
    setSignDismissed(true);
    onArcadeClick();
  };

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 8, 30]} />

      <ambientLight intensity={0.08} />
      <spotLight
        position={[0, 6, 0.5]}
        angle={0.35}
        penumbra={0.6}
        intensity={120}
        distance={12}
        decay={2}
        color="#bfe9ff"
        castShadow
        target-position={[0, 0.9, 0]}
      />
      <ArcadeSpot />

      <OfficeFloor />

      <Desk />
      <Note />
      {showWelcome && !signDismissed && <WelcomeSign text={welcomeText} />}
      <Computer onClick={handleClick} onHoverChange={handleHoverChange} interactive={interactive} />
      <ScreenPlane
        onClick={handleClick}
        hovered={hovered}
        onHoverChange={handleHoverChange}
        screenContent={screenContent}
        interactive={interactive}
      />
      <Arcade
        onClick={handleArcadeClick}
        onHoverChange={() => {}}
        interactive={interactive}
        atStation={arcadeArrived}
        screenOn={arcadeScreenOn}
        onCoinInserted={onCoinInserted}
        screenChildren={arcadeScreenContent}
      />
    </>
  );
}

useGLTF.preload("/Adjustable Desk.glb");
useGLTF.preload("/Computer.glb");
useGLTF.preload("/ArcadeFolio.glb");
