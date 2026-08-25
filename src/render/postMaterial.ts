import { Color, NoBlending, ShaderMaterial, Vector2 } from "three";

// The single fullscreen pass that everything the 3D canvas draws goes
// through. It replaces the old three-layer stack:
//
//   before: EffectComposer(LensDistortion) -> copy pass -> page-wide SVG
//           filter (3x feColorMatrix + 2x feOffset + 2x feBlend) re-evaluated
//           by the compositor every frame over the whole document
//   after:  one textured quad
//
// Structure copied from the basement.studio reference's
// `shaders/material-postprocessing/fragment.glsl`: render the scene into a
// linear HalfFloat target with tone mapping off, then do ALL of the grading,
// bloom-less glow, vignette and CRT artefacts here in one place, converting
// to sRGB exactly once on the way out.
//
// Two things are fused on purpose, because both are radial functions of the
// same vector and sharing it makes them nearly free:
//   * barrel/fisheye warp (what LensDistortionEffect used to do)
//   * chromatic aberration (what the SVG filter used to do)
// A real lens produces the second *because of* the first — different
// wavelengths refract by different amounts — so sampling R/G/B at three
// slightly different warp strengths is both cheaper and more correct than
// running them as separate stages.
export function createPostMaterial() {
  return new ShaderMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uMain: { value: null },
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },

      // Lens
      uDistortion: { value: 0.0 },
      uAberration: { value: 0.0 },

      // Grade
      uExposure: { value: 1.0 },
      uContrast: { value: 1.0 },
      uBrightness: { value: 1.0 },
      uGamma: { value: 1.0 },
      // 0 bypasses ACES entirely, so switching the CRT off returns the exact
      // linear->sRGB the app had before this pipeline existed.
      uTonemap: { value: 0.0 },
      // Colour-depth reduction. uPosterize is the number of levels per
      // channel (0 disables); uDither is how much of a 4x4 ordered pattern
      // is mixed into the quantisation threshold.
      uPosterize: { value: 0.0 },
      uDither: { value: 1.0 },

      // CRT artefacts
      uScanline: { value: 0.0 },
      uNoise: { value: 0.0 },
      uVignette: { value: 0.0 },
      uTint: { value: new Color("#8fd8e8") },
      uTintAmount: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D uMain;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uDistortion;
      uniform float uAberration;
      uniform float uExposure;
      uniform float uContrast;
      uniform float uBrightness;
      uniform float uGamma;
      uniform float uTonemap;
      uniform float uPosterize;
      uniform float uDither;
      uniform float uScanline;
      uniform float uNoise;
      uniform float uVignette;
      uniform vec3 uTint;
      uniform float uTintAmount;

      varying vec2 vUv;

      const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

      // Barrel warp. k > 0 pushes the image out at the edges (fisheye).
      vec2 warp(vec2 uv, float k) {
        vec2 c = uv - 0.5;
        return c * (1.0 + k * dot(c, c)) + 0.5;
      }

      // One channel, warped by its own strength, black outside the frame.
      // The bounds test replaces clamp-to-edge smearing at the corners,
      // which the old LensDistortion pass left behind.
      float sampleChannel(vec2 uv, float k, int channel) {
        vec2 w = warp(uv, k);
        if (w.x < 0.0 || w.x > 1.0 || w.y < 0.0 || w.y > 1.0) return 0.0;
        vec3 c = texture2D(uMain, w).rgb;
        return channel == 0 ? c.r : channel == 1 ? c.g : c.b;
      }

      // ACES filmic, in the compact form the reference uses (fitted RRT+ODT
      // sandwiched between two colour-space matrices).
      vec3 RRTAndODTFit(vec3 v) {
        vec3 a = v * (v + 0.0245786) - 0.000090537;
        vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
        return a / b;
      }

      vec3 acesTonemap(vec3 color) {
        const mat3 IN = mat3(
          0.59719, 0.35458, 0.04823,
          0.07600, 0.90834, 0.01566,
          0.02840, 0.13383, 0.83777
        );
        const mat3 OUT = mat3(
           1.60475, -0.53108, -0.07367,
          -0.10208,  1.10813, -0.00605,
          -0.00327, -0.07276,  1.07602
        );
        color *= uExposure / 0.6;
        // These matrices are row-major as written; multiply on the right so
        // GLSL's column-major storage lines up without transposing.
        color = RRTAndODTFit(color * IN);
        return clamp(color * OUT, 0.0, 1.0);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      // 4x4 ordered (Bayer) threshold, built by nesting the 2x2 pattern
      // rather than indexing a matrix — no array, no branch, no texture.
      float bayer2(vec2 a) {
        a = floor(a);
        return fract(a.x * 0.5 + a.y * a.y * 0.75);
      }
      float bayer4(vec2 a) {
        return bayer2(a * 0.5) * 0.25 + bayer2(a);
      }

      void main() {
        // Chromatic aberration IS the lens warp, evaluated per wavelength.
        float k = uDistortion;
        float a = uDistortion * uAberration;
        vec3 color = vec3(
          sampleChannel(vUv, k + a, 0),
          sampleChannel(vUv, k,     1),
          sampleChannel(vUv, k - a, 2)
        );

        // Grade: brightness -> contrast -> gamma -> ACES, same order as the
        // reference so its tuned numbers transfer.
        color *= uBrightness;
        color = (color - 0.5) * uContrast + 0.5;
        color = pow(max(color, 0.0), vec3(uGamma));
        // ACES buys highlight rolloff (the monitor glow and lamp no longer
        // clip to flat white), at the cost of a toe that pulls midtones down
        // by roughly a fifth. The grades compensate with uExposure; with the
        // CRT switched off uTonemap is 0 and this is a straight passthrough.
        color = mix(color, acesTonemap(color), uTonemap);

        // Phosphor cast. Pulls the image toward the station's tint by luma,
        // which is how a real single-phosphor tube looks, without destroying
        // hue information the way a hard duotone would.
        color = mix(color, mix(color, dot(color, LUMA) * uTint, 0.85), uTintAmount);

        // Colour-depth reduction — the single biggest lever on the
        // late-90s/2000s look, and the reason it reads as low-poly even
        // though the geometry has not changed: banding and a visible dither
        // pattern are what a 16-bit framebuffer did to smooth shading.
        // Ordered dithering rather than plain quantisation, because a naked
        // floor() turns every soft falloff in the scene into hard contour
        // rings.
        if (uPosterize > 1.5) {
          float threshold = (bayer4(gl_FragCoord.xy) - 0.5) * uDither;
          color = floor(color * uPosterize + threshold + 0.5) / uPosterize;
          color = clamp(color, 0.0, 1.0);
        }

        // Scanlines. The pitch is locked to 3 device pixels: a cosine with a
        // 3px period is safely above the Nyquist limit of the 1px fragment
        // grid, so it cannot alias. The old CSS version used a hard 1px-on,
        // 2px-off gradient, which landed ON the pixel grid and crawled --
        // that shimmer was most of the "noisy" complaint.
        float line = 0.5 + 0.5 * cos(vUv.y * uResolution.y * 2.0943951);
        color *= 1.0 - uScanline * line;

        // Film grain, at the reference's restraint (it uses 0.01 opacity;
        // the old overlay had none and leaned on the SVG filter instead).
        float grain = hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5;
        color += grain * uNoise;

        // Vignette, radial on the unwarped uv so it stays circular.
        float d = length(vUv - 0.5);
        color *= 1.0 - uVignette * smoothstep(0.35, 0.80, d);

        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);

        #include <colorspace_fragment>
      }
    `,
  });
}
