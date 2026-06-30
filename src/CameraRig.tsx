import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { PerspectiveCamera } from "three";

export type FlightPhase = "idle" | "flying" | "arrived" | "returning";

// Tunable shot constants. ESTABLISHED is the wide intro framing (matches the
// camera prop passed to <Canvas>, and where "returning" always lands so the
// orbit controls resume from a known-good state). CLOSE is "pressed up
// against the screen" — tune these alongside the desk/computer
// rotation/position constants in Scene.tsx since they all assume the same
// model orientation.
const ESTABLISHED = {
  position: new Vector3(4, 3, 6),
  target: new Vector3(0, 1.2, 0),
  fov: 50,
};
const CLOSE = {
  position: new Vector3(0, 1.5, 1.1),
  target: new Vector3(0, 1.45, -1),
  fov: 95,
};

const FLIGHT_DURATION = 2.4; // seconds
const RETURN_DURATION = 1.8; // seconds — a little snappier than the fly-in

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function CameraRig({
  phase,
  onArrived,
  onReturned,
  onAberrationChange,
}: {
  phase: FlightPhase;
  onArrived: () => void;
  onReturned: () => void;
  onAberrationChange: (offset: number) => void;
}) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const prevPhase = useRef<FlightPhase>(phase);

  // Snapshot of where the camera actually is/looks/fov'd when a flight
  // starts, so it eases from the live view instead of snapping to a fixed
  // constant (which is what caused the "sudden cut" — the user had usually
  // orbited away from ESTABLISHED by the time they clicked).
  const start = useRef({
    position: new Vector3(),
    target: new Vector3(),
    fov: 50,
  });
  const liveTarget = useRef(ESTABLISHED.target.clone());

  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    if (phase === "flying" && prevPhase.current !== "flying") {
      elapsed.current = 0;
      start.current.position.copy(cam.position);
      start.current.target.copy(liveTarget.current);
      start.current.fov = cam.fov;
    }
    if (phase === "returning" && prevPhase.current !== "returning") {
      elapsed.current = 0;
      start.current.position.copy(cam.position);
      start.current.target.copy(liveTarget.current);
      start.current.fov = cam.fov;
    }
    prevPhase.current = phase;
  }, [phase, camera]);

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera;

    if (phase === "idle") {
      liveTarget.current.copy(ESTABLISHED.target);
      onAberrationChange(0);
      return;
    }

    if (phase === "flying" || phase === "returning") {
      const duration = phase === "flying" ? FLIGHT_DURATION : RETURN_DURATION;
      const endState = phase === "flying" ? CLOSE : ESTABLISHED;

      elapsed.current += delta;
      const t = Math.min(elapsed.current / duration, 1);
      const eased = easeInOutCubic(t);

      cam.position.lerpVectors(start.current.position, endState.position, eased);
      liveTarget.current.lerpVectors(start.current.target, endState.target, eased);
      cam.lookAt(liveTarget.current);
      cam.fov = start.current.fov + (endState.fov - start.current.fov) * eased;
      cam.updateProjectionMatrix();

      if (phase === "flying") {
        // Aberration ramps in fast, peaks mid-flight, settles to a low
        // ambient amount once arrived rather than going back to zero.
        const peak = Math.sin(eased * Math.PI);
        const settle = 0.08;
        onAberrationChange(Math.max(peak * 0.9, settle * eased));
      } else {
        onAberrationChange(0.08 * (1 - eased));
      }

      if (t >= 1) {
        if (phase === "flying") {
          onAberrationChange(0.08);
          onArrived();
        } else {
          onAberrationChange(0);
          onReturned();
        }
      }
    }

    if (phase === "arrived") {
      onAberrationChange(0.08);
    }
  });

  return null;
}
