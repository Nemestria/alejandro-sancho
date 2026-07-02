import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import { SCREEN_WORLD_POSITION, SCREEN_WORLD_NORMAL } from "./screenAnchor";

export type FlightPhase = "idle" | "flying" | "arrived" | "returning";

// Tunable shots. ESTABLISHED is the wide intro framing (matches the camera
// prop passed to <Canvas>, and where "returning" lands). CLOSE backs off
// from the screen-plane (screenAnchor.ts) along its outward normal and
// looks straight at it.
const ESTABLISHED_EYE = new Vector3(4, 3, 6);
const ESTABLISHED_TARGET = new Vector3(0, 1.2, 0);
const CLOSE_EYE = SCREEN_WORLD_POSITION.clone().addScaledVector(SCREEN_WORLD_NORMAL, 0.35);
const CLOSE_TARGET = SCREEN_WORLD_POSITION.clone();

const ESTABLISHED_FOV = 50;
const CLOSE_FOV = 95;

const FLIGHT_DURATION = 2.4; // seconds
const RETURN_DURATION = 1.8;

// Locked-POV look/zoom limits. This is a person's head turning in a fixed
// chair, not an orbit inspector: drag rotates gaze within a small cone,
// pushing the pointer near the viewport edge nudges gaze/position a touch
// further, zoom just dollies a little along the view direction. Range
// tightens once "arrived" — mostly forced to look at the screen there.
const BASE_YAW_CLAMP = MathUtils.degToRad(18);
const BASE_PITCH_CLAMP = MathUtils.degToRad(10);
const ARRIVED_CLAMP_SCALE = 0.35;
const DRAG_SENSITIVITY = 0.006; // radians per pixel
const EDGE_DEADZONE = 0.7; // fraction of half-viewport before edge-look kicks in
const EDGE_LOOK_MAX = MathUtils.degToRad(6);
const EDGE_POS_MAX = 0.12; // world units
const ZOOM_SENSITIVITY = 0.0006;
const ZOOM_RANGE = 0.5; // world units, +/- (scaled by clamp scale)
const LOOK_DISTANCE = 10;
// Exponential-damping rate (higher = snappier, lower = floatier) for easing
// drag/edge-look/zoom toward their raw targets — frame-rate independent via
// MathUtils.damp, so it feels the same at 30fps and 144fps.
const EASE_LAMBDA = 6;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function CameraRig({
  phase,
  onArrived,
  onReturned,
  resetKey = 0,
}: {
  phase: FlightPhase;
  onArrived: () => void;
  onReturned: () => void;
  resetKey?: number;
}) {
  const { camera, gl, scene } = useThree();
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => {
    (window as unknown as { __scene: typeof scene }).__scene = scene;
  }, [scene]);

  const elapsed = useRef(0);
  const startFov = useRef(ESTABLISHED_FOV);
  const prevPhase = useRef<FlightPhase>(phase);
  const firedCallback = useRef(false);

  const dragYaw = useRef(0);
  const dragPitch = useRef(0);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const pointerNorm = useRef({ x: 0, y: 0 });
  const zoomOffset = useRef(0);

  // Smoothed (eased) versions of the raw drag/zoom/edge targets above —
  // this is what actually drives the camera each frame.
  const yawSmooth = useRef(0);
  const pitchSmooth = useRef(0);
  const zoomSmooth = useRef(0);
  const edgeXSmooth = useRef(0);
  const edgeYSmooth = useRef(0);

  useEffect(() => {
    if (resetKey === 0) return;
    dragYaw.current = 0; dragPitch.current = 0; zoomOffset.current = 0;
    yawSmooth.current = 0; pitchSmooth.current = 0; zoomSmooth.current = 0;
    edgeXSmooth.current = 0; edgeYSmooth.current = 0;
  }, [resetKey]);

  useEffect(() => {
    const dom = gl.domElement;

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      if (phaseRef.current === "arrived") return;
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp() {
      isDragging.current = false;
    }
    function onPointerMove(e: PointerEvent) {
      const rect = dom.getBoundingClientRect();
      pointerNorm.current = {
        x: MathUtils.clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
        y: MathUtils.clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
      };
      if (!isDragging.current || phaseRef.current === "arrived") return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      dragYaw.current -= dx * DRAG_SENSITIVITY;
      dragPitch.current -= dy * DRAG_SENSITIVITY;
    }
    function onWheel(e: WheelEvent) {
      if (phaseRef.current === "arrived") return;
      e.preventDefault();
      zoomOffset.current += e.deltaY * ZOOM_SENSITIVITY;
    }

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    // window-level wheel so drei <Html> overlays don't swallow the event
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera;

    if (phase !== prevPhase.current) {
      if (phase === "flying" || phase === "returning") {
        elapsed.current = 0;
        startFov.current = cam.fov;
        firedCallback.current = false;
      }
      prevPhase.current = phase;
    }

    // --- base eye/target/fov + clamp scale for this instant ---
    let baseEye = ESTABLISHED_EYE;
    let baseTarget = ESTABLISHED_TARGET;
    let fov = ESTABLISHED_FOV;
    let clampScale = 1;

    if (phase === "arrived") {
      baseEye = CLOSE_EYE;
      baseTarget = CLOSE_TARGET;
      fov = CLOSE_FOV;
      clampScale = ARRIVED_CLAMP_SCALE;
    } else if (phase === "flying" || phase === "returning") {
      const duration = phase === "flying" ? FLIGHT_DURATION : RETURN_DURATION;
      elapsed.current += delta;
      const t = Math.min(elapsed.current / duration, 1);
      const eased = easeInOutCubic(t);
      const towardClose = phase === "flying" ? eased : 1 - eased;

      baseEye = new Vector3().lerpVectors(ESTABLISHED_EYE, CLOSE_EYE, towardClose);
      baseTarget = new Vector3().lerpVectors(ESTABLISHED_TARGET, CLOSE_TARGET, towardClose);
      fov = MathUtils.lerp(startFov.current, phase === "flying" ? CLOSE_FOV : ESTABLISHED_FOV, eased);
      clampScale = MathUtils.lerp(
        phase === "flying" ? 1 : ARRIVED_CLAMP_SCALE,
        phase === "flying" ? ARRIVED_CLAMP_SCALE : 1,
        eased,
      );

      if (t >= 1 && !firedCallback.current) {
        firedCallback.current = true;
        if (phase === "flying") onArrived();
        else onReturned();
      }
    }

    // --- clamp accumulated look offsets to current (possibly tightening) range ---
    const yawClamp = BASE_YAW_CLAMP * clampScale;
    const pitchClamp = BASE_PITCH_CLAMP * clampScale;
    dragYaw.current = MathUtils.clamp(dragYaw.current, -yawClamp, yawClamp);
    dragPitch.current = MathUtils.clamp(dragPitch.current, -pitchClamp, pitchClamp);

    // --- edge-of-viewport look/position nudge ---
    const edgeFactor = (n: number) => {
      const mag = Math.abs(n);
      if (mag <= EDGE_DEADZONE) return 0;
      const f = (mag - EDGE_DEADZONE) / (1 - EDGE_DEADZONE);
      return Math.sign(n) * f;
    };
    const edgeXRaw = edgeFactor(pointerNorm.current.x);
    const edgeYRaw = edgeFactor(pointerNorm.current.y);

    // --- ease everything toward its raw target, frame-rate independent ---
    yawSmooth.current = MathUtils.damp(yawSmooth.current, dragYaw.current, EASE_LAMBDA, delta);
    pitchSmooth.current = MathUtils.damp(pitchSmooth.current, dragPitch.current, EASE_LAMBDA, delta);
    zoomSmooth.current = MathUtils.damp(zoomSmooth.current, zoomOffset.current, EASE_LAMBDA, delta);
    edgeXSmooth.current = MathUtils.damp(edgeXSmooth.current, edgeXRaw, EASE_LAMBDA, delta);
    edgeYSmooth.current = MathUtils.damp(edgeYSmooth.current, edgeYRaw, EASE_LAMBDA, delta);

    const edgeX = edgeXSmooth.current;
    const edgeY = edgeYSmooth.current;

    // Horizontal and vertical each flipped once per user feedback, from the
    // original "look toward where you're pushing" convention.
    const yaw = yawSmooth.current - edgeX * EDGE_LOOK_MAX * clampScale;
    const pitch = pitchSmooth.current - edgeY * EDGE_LOOK_MAX * clampScale;

    // --- build view direction from base gaze rotated by yaw/pitch ---
    const baseDir = new Vector3().subVectors(baseTarget, baseEye).normalize();
    const worldUp = new Vector3(0, 1, 0);
    const right = new Vector3().crossVectors(baseDir, worldUp).normalize();

    const viewDir = baseDir.clone();
    viewDir.applyAxisAngle(worldUp, yaw);
    viewDir.applyAxisAngle(right, pitch);
    viewDir.normalize();

    const up = new Vector3().crossVectors(right, viewDir).normalize();

    // --- zoom (dolly along view direction) + edge position nudge ---
    const zoomClamp = ZOOM_RANGE * clampScale;
    zoomOffset.current = MathUtils.clamp(zoomOffset.current, -zoomClamp, zoomClamp);

    const posNudge = new Vector3()
      .addScaledVector(right, -edgeX * EDGE_POS_MAX * clampScale)
      .addScaledVector(up, -edgeY * EDGE_POS_MAX * clampScale);

    const eyePosition = baseEye
      .clone()
      .addScaledVector(viewDir, zoomSmooth.current)
      .add(posNudge);

    const lookAtPoint = eyePosition.clone().addScaledVector(viewDir, LOOK_DISTANCE);

    cam.position.copy(eyePosition);
    cam.lookAt(lookAtPoint);
    cam.fov = fov;
    cam.updateProjectionMatrix();
  });

  return null;
}
