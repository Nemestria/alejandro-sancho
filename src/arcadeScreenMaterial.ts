import { Color, ShaderMaterial } from "three";
import { CRT_GLSL } from "./crt/glsl";
import { CRT_PRESETS } from "./crt/params";

const TUBE = CRT_PRESETS.tube;

// The arcade screen's display shader.
//
// This is a port of the basement.studio reference's
// `src/shaders/material-screen/fragment.glsl`, retinted from its orange
// phosphor to a teal-to-purple duotone.
//
// It replaces a port of "CRT Shader by Harrison Allen (V4)", which simulated
// the electron beam literally: five horizontal taps across two virtual
// scanline rows (ten texture() fetches), every one of them wrapped in an
// sRGB->linear conversion (three pow() each, ~30 pow per fragment), plus a
// branchy phosphor-mask lookup and ten smoothsteps. Accurate, and far too
// expensive for a screen that is on-camera the whole time you are at the
// cabinet. The visible symptom was noise as much as cost: beam
// misconvergence (colorOffset) and the subpixel mask both chew holes in
// small type, which is why the tuning notes on the old version read as a
// list of retreats from the reference values.
//
// The approach here is the one the reference actually ships, and it is
// cheaper by roughly an order of magnitude — ONE texture fetch and one pow:
//
//   1. interference  — per-row horizontal jitter, so the picture never sits
//                      perfectly still (random() keyed on the row + time)
//   2. crtWarp       — barrel curvature, black outside the glass
//   3. scan band     — a bright line sweeping down every ~12s, dragging a
//                      small horizontal displacement with it
//   4. duotone       — the sampled colour is reduced to luma and remapped
//                      across a teal->purple phosphor ramp. This is what
//                      makes it read as a tube rather than an LCD, and it
//                      costs two mixes instead of a subpixel mask
//   5. reveal        — line-by-line wipe on power-on, driven by uReveal
//   6. vignette + grain + scanlines
//
// Scanlines come from a cosine on uv, not a step(). A hard step is what
// aliases into moiré when the screen is small on-camera; a cosine at this
// pitch degrades to flat grey instead, which is the correct failure mode.
export function createArcadeScreenMaterial() {
  const material = new ShaderMaterial({
    uniforms: {
      map: { value: null },
      time: { value: 0 },
      // 0 = black screen, 1 = fully revealed. Scene.tsx can animate this on
      // coin-insert for the reference's line-by-line power-on wipe; it sits
      // at 1 by default so nothing breaks if it never does.
      uReveal: { value: 1 },
      // Phosphor ramp. Shadows land on teal, highlights on purple, which is
      // this project's palette where the reference used a single orange.
      uTintLow: { value: new Color("#0f8f9c") },
      uTintHigh: { value: new Color("#c9a2ff") },
      uBrightness: { value: 1.35 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;

      uniform sampler2D map;
      uniform float time;
      uniform float uReveal;
      uniform vec3 uTintLow;
      uniform vec3 uTintHigh;
      uniform float uBrightness;

      varying vec2 vUv;

      ${CRT_GLSL}

      // Strengths come from CRT_PRESETS.tube (crt/params.ts).
      #define LENS             ${TUBE.lens.toFixed(4)}
      #define SCANLINE_DEPTH   ${TUBE.scan.toFixed(4)}
      #define GRAIN            ${TUBE.grain.toFixed(4)}
      #define VIGNETTE         ${TUBE.vignette.toFixed(4)}
      // The cabinet's own, not shared: scanlines here ride the texture's uv
      // (a mesh viewed at any distance), not the device-pixel grid.
      #define SCANLINE_COUNT   240.0
      #define INTERFERENCE     0.35
      #define BLACK_LIFT       0.055
      #define REVEAL_LINE      0.02

      #define SCAN_SPEED       5.0
      #define SCAN_CYCLE       10.0
      #define SCAN_DISTORTION  0.003

      void main() {
        // --- 1. per-row interference -------------------------------------
        // Keying the noise on the rounded row (not the fragment) is what
        // makes it read as a tracking fault rather than as static.
        float row = floor(vUv.y * 1024.0);
        float r = crtHash(vec2(0.0, row) + time * 0.001);
        // Rare rows tear much further, the reference's r *= 3.0 spike.
        r *= r > 0.995 ? 3.0 : 1.0;

        vec2 uv = vUv;
        uv.x += INTERFERENCE * 2.0 / 1024.0 * r;

        // --- 2. curvature -------------------------------------------------
        uv = crtWarp(uv, LENS);

        // --- 3. the sweeping scan band ------------------------------------
        // Runs for SCAN_CYCLE then parks off-screen for the remainder of the
        // period, so it passes roughly every twelve seconds instead of
        // strobing continuously.
        float scanCycleTime = mod(time * SCAN_SPEED, SCAN_CYCLE + 50.0);
        float scanPos = scanCycleTime < SCAN_CYCLE ? scanCycleTime / SCAN_CYCLE : 1.0;
        // Rational stand-in for exp(-y*y): same bell, no transcendental.
        float y = (vUv.y - scanPos) * 160.0;
        float band = 1.0 / (1.0 + y * y * 0.5 + y * y * y * y * 0.125);
        uv.x += band * SCAN_DISTORTION;

        // --- 4. the one and only texture fetch ----------------------------
        vec3 src = vec3(0.0);
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
          // The render target stores sRGB-encoded values but the scene pass
          // this mesh draws into is linear (see render/Renderer.tsx), so it
          // has to be decoded exactly once. 2.2 rather than the exact
          // piecewise transfer: one pow, and the duotone below discards the
          // precision that would buy anyway.
          src = pow(texture2D(map, uv).rgb, vec3(2.2));
        }

        // --- 5. duotone phosphor ------------------------------------------
        // Weighted toward red/green the way the reference's luma is, so the
        // cyan UI on the menu scene keeps its punch instead of going muddy.
        float luma = dot(src, vec3(0.5, 0.4, 0.1));
        vec3 color = mix(uTintLow, uTintHigh, smoothstep(0.1, 0.75, luma))
                   * luma * uBrightness;

        // The scan band itself brightens what it crosses.
        color += band * 0.35 * uTintHigh;

        // --- 6. power-on wipe ---------------------------------------------
        float currentLine = floor(vUv.y / REVEAL_LINE);
        float revealLine = floor(uReveal / REVEAL_LINE);
        color *= step(currentLine, revealLine);

        // --- 7. vignette, grain, black lift, scanlines --------------------
        color *= crtVignette(vUv, VIGNETTE);

        color += crtGrain(gl_FragCoord.xy, time) * GRAIN;

        // Unlit phosphor is never truly black; a faint tint in the shadows
        // is most of what sells the tube.
        color += uTintLow * BLACK_LIFT * (1.0 - smoothstep(0.0, 0.15, luma));

        color *= 1.0 - SCANLINE_DEPTH * crtScanPhase(vUv.y * SCANLINE_COUNT);

        gl_FragColor = vec4(max(color, 0.0), 1.0);
      }
    `,
  });
  return material;
}

/**
 * Re-colour the tube from the active theme: highlights land on the theme's
 * phosphor tint, shadows on a darker cut of the same hue (a single-phosphor
 * tube has one hue, unlike the old fixed teal->purple ramp).
 */
export function setArcadePhosphor(material: ShaderMaterial, tint: string) {
  (material.uniforms.uTintHigh.value as Color).set(tint);
  (material.uniforms.uTintLow.value as Color).set(tint).multiplyScalar(0.4);
}
