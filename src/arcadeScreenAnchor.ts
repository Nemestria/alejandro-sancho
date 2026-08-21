import { Vector3 } from "three";

// The arcade cabinet's screen face, in world space. Derived (not guessed)
// against the running scene, same process screenAnchor.ts documents for the
// computer monitor:
// 1. Bucket ArcadeScreen's NORMAL accessor by rounded local normal. The mesh
//    is a low-poly box with bevelled/smoothed corners, so no bucket is clean —
//    but every bucket carrying a -Y component together outnumbers the rest,
//    making local -Y the front face. (That matches Scene.tsx's UV rewrite,
//    which maps u to local -X and v to local -Z; u x v = -Y.)
// 2. Take the bounding box, and read the face at its -Y extreme rather than
//    the box centre — the box is 1.24 deep in local Z, so its centre floats
//    well behind the glass.
// 3. Push that face's centre and its three corners through the live
//    matrixWorld to get world position, normal and metric size.
//
// Re-derive (steps above) any time the arcade group's position/rotation/scale
// changes — these are not kept in sync automatically.
//
// Measured 2026-08-21 against ARCADE_POSITION (-2.6, 0, 0.6) /
// ARCADE_ROTATION_Y (0.6 + PI) with the group's auto-fit scale at 0.516.
// Face corners came out at (-2.140, 1.688, 0.618), (-2.757, 1.688, 1.040)
// and (-2.140, 1.049, 0.618), giving 0.748 x 0.639 m.
//
// POSITION is the box CENTRE, not that front face. The mesh is a 0.51m-deep
// box, so its front face sits ~0.26m proud of centre — level with the
// joystick/button plane (those measure z~0.79-0.92). Anchoring there aims
// the camera at the control deck instead of the glass, and floats any Html
// overlay in front of the cabinet. The live RenderTexture screen uses the
// same geometry at the same transform, so centre is what both should share.
export const ARCADE_SCREEN_WORLD_POSITION = new Vector3(-2.59, 1.369, 0.62);
// Local -Y through the mesh's world rotation. Lands on (sin 0.6, 0, cos 0.6),
// which is what the earlier placeholder guessed — the normal was the one
// constant it got right; position and size were both off.
export const ARCADE_SCREEN_WORLD_NORMAL = new Vector3(Math.sin(0.6), 0, Math.cos(0.6));
export const ARCADE_SCREEN_WORLD_ROTATION_Y = 0.6;
export const ARCADE_SCREEN_WORLD_SIZE: [number, number] = [0.748, 0.639];
