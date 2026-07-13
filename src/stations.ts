import { Vector3 } from "three";
import { SCREEN_WORLD_POSITION, SCREEN_WORLD_NORMAL } from "./screenAnchor";
import { ARCADE_SCREEN_WORLD_POSITION, ARCADE_SCREEN_WORLD_NORMAL } from "./arcadeScreenAnchor";

// Every clickable object the camera can fly in to. CameraRig looks up its
// "close" shot here instead of hardcoding a single target — see
// CameraRig.tsx's `station` prop. Add a new entry here (+ a screen-anchor
// module deriving its position/normal, same process as screenAnchor.ts) any
// time a new station is added.
export type StationId = "computer" | "arcade";

export interface StationShot {
  closeEye: Vector3;
  closeTarget: Vector3;
  closeFov: number;
  // Optional two-stage arrival: the fly-in lands on this wider shot first
  // (whole object in frame), and the close shot above only engages once the
  // station "activates" (CameraRig's stationZoomed prop — for the arcade,
  // that's the coin going in). Stations without it fly straight to close.
  approach?: { eye: Vector3; target: Vector3; fov: number };
}

const COMPUTER: StationShot = {
  closeEye: SCREEN_WORLD_POSITION.clone().addScaledVector(SCREEN_WORLD_NORMAL, 0.35),
  closeTarget: SCREEN_WORLD_POSITION.clone(),
  closeFov: 95,
};

// Stand-off is wider than the computer's 0.35 — the arcade's screen is
// physically bigger than the desk monitor's, so the same distance would
// clip inside the cabinet. The approach shot backs off far enough that the
// whole 2.2m cabinet (including the coin slot) fits in frame — the coin
// insert then dollies from approach to close (see CameraRig's
// stationZoomed).
//
// FOVs are deliberately narrow-ish (45/50, vs the computer's 95): the first
// pass used 58/80 and the perspective read as heavy fisheye at the cabinet.
// Each stand-off was re-derived to keep the exact same framing at the new
// fov (d_new = d_old * tan(fov_old/2) / tan(fov_new/2)), so only the
// distortion changes, not what's in frame.
const ARCADE: StationShot = {
  closeEye: ARCADE_SCREEN_WORLD_POSITION.clone().addScaledVector(ARCADE_SCREEN_WORLD_NORMAL, 1.6),
  closeTarget: ARCADE_SCREEN_WORLD_POSITION.clone(),
  closeFov: 50,
  approach: {
    eye: ARCADE_SCREEN_WORLD_POSITION.clone()
      .addScaledVector(ARCADE_SCREEN_WORLD_NORMAL, 3.2)
      .add(new Vector3(0, -0.3, 0)),
    target: new Vector3(ARCADE_SCREEN_WORLD_POSITION.x, 1.05, ARCADE_SCREEN_WORLD_POSITION.z),
    fov: 45,
  },
};

export const STATIONS: Record<StationId, StationShot> = {
  computer: COMPUTER,
  arcade: ARCADE,
};
