import { SCAN_PITCH_PX } from "./params";

// The CRT vocabulary, written once. Every shader that draws a tube —
// render/postMaterial.ts (3D scene), arcadeScreenMaterial.ts (cabinet tube),
// crt/Glass.tsx (iframes + DOM pages) — splices this in and calls the same
// functions, so a scanline or vignette is the same scanline or vignette
// everywhere and its strength comes from a CrtParams preset.
//
// Portable GLSL only (no texture(), no precision qualifiers inside) so it
// compiles under both three's GLSL1-style ShaderMaterial and the raw
// `#version 300 es` program in Glass.tsx.
export const CRT_GLSL = /* glsl */ `
#define CRT_PITCH ${SCAN_PITCH_PX.toFixed(1)}

float crtHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Barrel warp. k > 0 pushes the image out at the edges (fisheye).
vec2 crtWarp(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  return c * (1.0 + k * dot(c, c)) + 0.5;
}

// 0..1 scanline wave, one full cycle per unit. A cosine, never a hard step: a
// step aliases into moire when the screen is small on camera, a cosine fades
// to flat grey instead.
float crtScanPhase(float cycles) {
  return 0.5 + 0.5 * cos(cycles * 6.28318530718);
}
// Same wave on the device-pixel grid, at the shared pitch.
float crtScan(float yPx) {
  return crtScanPhase(yPx / CRT_PITCH);
}

// RGB aperture grille, three device pixels wide, one per channel.
vec3 crtTriad(float xPx, float depth) {
  float cell = mod(floor(xPx), 3.0);
  vec3 t = vec3(1.0 - depth);
  if (cell < 0.5) t.r = 1.0;
  else if (cell < 1.5) t.g = 1.0;
  else t.b = 1.0;
  return t;
}

// Radial corner darkening, on the unwarped uv so it stays circular.
float crtVignette(vec2 uv, float depth) {
  return 1.0 - depth * smoothstep(0.35, 0.80, length(uv - 0.5));
}

// Zero-mean static in [-0.5, 0.5], re-rolled each frame.
float crtGrain(vec2 fragPx, float t) {
  return crtHash(fragPx + fract(t) * 137.0) - 0.5;
}

// Slow soft dark band sweeping down the screen; multiplier, 1.0 = no effect.
float crtRoll(float y, float t, float depth) {
  float d = y - fract(t * 0.055);
  d -= floor(d + 0.5); // wrap so it does not pop at the seam
  return 1.0 - depth * exp(-d * d * 900.0);
}
`;
