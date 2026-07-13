import { ShaderMaterial, Vector2 } from "three";

// The arcade screen's display shader — our equivalent of the
// screen-material.ts the basement.studio reference files import but never
// shipped. It post-processes the live RenderTexture (wired into
// uniforms.map by Scene.tsx via r3f's attach="uniforms-map-value") at the
// moment it's drawn onto the glass:
//
//   1. pixelation  — UVs quantized to a coarse virtual-pixel grid
//   2. dithering   — recursive 4x4 Bayer ordered dither, quantizing each
//                    channel to a few levels (the retro print-y look)
//   3. scanlines   — every other virtual row slightly darkened
//   4. vignette    — radial falloff toward the glass corners
//   5. flicker     — a very subtle CRT brightness wobble over time
//
// All of it runs per-fragment on the final surface, so it costs nothing
// extra in the inner scene and scales with whatever the menu renders.
export function createArcadeScreenMaterial() {
  return new ShaderMaterial({
    uniforms: {
      map: { value: null },
      // Virtual resolution of the "tube" — fewer = chunkier pixels.
      // Slightly wider than tall to keep dither cells square on the
      // physically wider-than-tall glass.
      pixels: { value: new Vector2(240, 205) },
      time: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform sampler2D map;
      uniform vec2 pixels;
      uniform float time;

      // Classic compact recursive Bayer matrix (no arrays — GLSL ES 1.0
      // can't index arrays dynamically).
      float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

      void main() {
        // 1. pixelate
        vec2 grid = floor(vUv * pixels);
        vec2 uvq = (grid + 0.5) / pixels;
        vec3 col = texture2D(map, uvq).rgb;

        // 2. ordered dither: quantize each channel with a Bayer offset
        float d = bayer4(grid) - 0.5;
        const float levels = 4.0;
        col = clamp(floor(col * levels + d + 0.5) / levels, 0.0, 1.0);

        // 3. scanlines on the virtual rows
        col *= mix(1.0, 0.82, step(mod(grid.y, 2.0), 0.5));

        // 4. vignette
        float vig = smoothstep(0.85, 0.35, length(vUv - 0.5));
        col *= mix(0.22, 1.0, vig);

        // 5. subtle flicker
        col *= 0.965 + 0.035 * sin(time * 9.0 + vUv.y * 4.0);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
