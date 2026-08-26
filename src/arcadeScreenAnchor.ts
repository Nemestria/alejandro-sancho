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
// Re-derived 2026-08-26 after the model was re-exported from Blender. That
// export renamed the screen mesh (ArcadeScreen -> Arcade.001), reshaped it
// (59 verts to 12, bevels gone) and widened the face from 1.170:1 to 1.637:1.
// It also brought unrelated room props into the file; Scene.tsx's CABINET_ROOTS
// excludes them from the auto-fit, which is what keeps the scale at 0.5157 and
// these numbers meaningful — measuring over the whole file instead moves the
// screen to (-4.134, 1.340, 1.101), 1.5m off.
//
// Derivation was validated by replaying it against the PREVIOUS model, where
// it reproduced that version's committed constants exactly.
//
// Measured against ARCADE_POSITION (-2.6, 0, 0.6) / ARCADE_ROTATION_Y
// (0.6 + PI) with the cabinet-only auto-fit scale at 0.5157.
//
// POSITION is the box CENTRE, not that front face. The mesh is a box (0.51m
// deep before the re-export, 0.27m after), so its front face sits proud of
// centre — level with the joystick/button plane. Anchoring there aims the
// camera at the control deck instead of the glass, and floats any Html overlay
// in front of the cabinet. The live screen mesh uses the same geometry at the
// same transform, so centre is what both should share.
export const ARCADE_SCREEN_WORLD_POSITION = new Vector3(-2.562, 1.331, 0.658);
// Local -Y through the mesh's world rotation. Lands on (sin 0.6, 0, cos 0.6),
// which is what the earlier placeholder guessed — the normal was the one
// constant it got right; position and size were both off.
export const ARCADE_SCREEN_WORLD_NORMAL = new Vector3(Math.sin(0.6), 0, Math.cos(0.6));
export const ARCADE_SCREEN_WORLD_ROTATION_Y = 0.6;
// 1.637:1 since the re-export — the glass went from squarish to widescreen,
// which is why textScreen.ts's character grid was repacked to match.
export const ARCADE_SCREEN_WORLD_SIZE: [number, number] = [0.838, 0.512];
