// Every CRT effect in the project is described by the same few numbers.
//
// Surfaces that look different (the 3D scene, an iframe behind glass, the
// arcade tube, flat DOM pages) differ only in the VALUES below; the maths that
// consumes them lives once in crt/glsl.ts. To retune the look, edit a preset
// here — don't add a literal to a shader or a component.
export interface CrtParams {
  /** Barrel/lens warp (k in c·(1 + k·|c|²)). 0 = flat. */
  lens: number;
  /** Extra horizontal-only squeeze toward the sides (DOM lens only). */
  panini: number;
  /** Per-channel lens split: R/G/B warped by lens·(1±aberration). */
  aberration: number;
  /** Scanline darkening, 0–1. Pitch is always SCAN_PITCH_PX. */
  scan: number;
  /** RGB aperture-grille mask depth, 0–1. */
  triad: number;
  /** Corner darkening, 0–1. */
  vignette: number;
  /** Static/grain amplitude, 0–1. */
  grain: number;
  /** How far the picture is pulled toward the theme tint, 0–1. */
  tint: number;
  /** Depth of the slow roll bar, 0–1. */
  roll: number;
  /** Strength of the phosphor-mask texture (public/crt-phosphor.webp), 0–1. */
  mask: number;
}

/**
 * Scanline pitch in DEVICE pixels, shared by every shader. Three is the floor:
 * a 2px period sits exactly at Nyquist and beats against the display grid.
 */
export const SCAN_PITCH_PX = 3;

const NONE: CrtParams = {
  lens: 0, panini: 0, aberration: 0, scan: 0, triad: 0, vignette: 0, grain: 0, tint: 0, roll: 0, mask: 0,
};

export const CRT_PRESETS = {
  // Post pass over the 3D canvas (render/Renderer.tsx), one per camera state.
  // Establishing shot: full wide-lens look.
  sceneIdle: { ...NONE, lens: 0.12, aberration: 0.55, scan: 0.16, vignette: 0.45, grain: 0.03, tint: 0.10 },
  // At the monitor: pulled back so the terminal/portfolio reads.
  sceneScreen: { ...NONE, lens: 0.03, aberration: 0.40, scan: 0.06, vignette: 0.28, grain: 0.015, tint: 0.04 },
  // At the arcade: the cabinet's own tube supplies the curvature, and
  // stacking two warps read as fisheye.
  sceneArcade: { ...NONE, lens: 0, aberration: 0.30, scan: 0.05, vignette: 0.22, grain: 0.012, tint: 0.06 },

  // Glass over a cross-origin iframe (crt/Glass.tsx): can't be warped, so it
  // carries the parts of a tube that sit in front of the picture.
  glass: { ...NONE, scan: 0.34, triad: 0.10, vignette: 0.55, roll: 0.10, tint: 0.22, grain: 0.06, mask: 0.0 },

  // The arcade screen mesh's own tube (arcadeScreenMaterial.ts).
  tube: { ...NONE, lens: 0.03, scan: 0.30, vignette: 0.50, grain: 0.014 },

  // Flat DOM pages (ASCII console, language gate): lens via SVG displacement.
  ui: { ...NONE, lens: 0.035, panini: 0.03, scan: 0.14, vignette: 0.55, grain: 0.10, mask: 0.55 },
} satisfies Record<string, CrtParams>;

export type CrtPresetName = keyof typeof CRT_PRESETS;
