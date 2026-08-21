import { GLSL3, ShaderMaterial, Vector2 } from "three";

// The arcade screen's display shader — a port of "CRT Shader by Harrison
// Allen (V4)" (Godot canvas_item shader, supplied by Alejandro) onto the
// live RenderTexture. It replaces the earlier pixelate/Bayer-dither pass
// entirely: this one simulates the actual CRT electron beam instead of
// faking the artifacts.
//
// Per fragment:
//   1. warp       — barrel-curves the UVs like curved glass (black outside)
//   2. scanlines  — samples the two nearest virtual scanline rows at 5
//                   horizontal taps each, weighted by distance to the
//                   "beam" (sharpness), with per-channel beam offset
//                   (colorOffset) for slightly-misconverged CRT color;
//                   row brightness modulates each scanline's thickness
//   3. mask       — phosphor pattern (dots/grilles/slot) in *physical*
//                   screen pixels via gl_FragCoord, with highlight bleed
//                   into neighboring subpixels so brights stay bright
//   4. vignette   — kept from the previous shader (explicitly requested;
//                   not part of the Godot original)
//
// Port notes vs the Godot original:
// - Godot reads a genuinely low-res input texture and derives scanline
//   count from textureSize(). Our RenderTexture is 1024px, so `texSize` is
//   a *virtual* resolution instead: all sampling happens at virtual-pixel
//   centers through texture(), equivalent to texelFetch on a real low-res
//   texture (the FBO's linear filter does the downsample).
// - The const-array mask patterns became ternary chains — dynamically
//   indexing local const arrays is the construct ANGLE (Windows GL→D3D)
//   miscompiles most often.
// - canvas_item's vertex-stage wobble is computed in the fragment instead
//   (one cos() — not worth a varying).
// - Needs GLSL3 (bvec mix(), texture()) — hence glslVersion below.
export function createArcadeScreenMaterial() {
  return new ShaderMaterial({
    glslVersion: GLSL3,
    uniforms: {
      map: { value: null },
      time: { value: 0 },
      // Virtual CRT resolution — sets the scanline count (height) and the
      // horizontal beam-tap spacing. Aspect ~matches the glass (1.17:1).
      texSize: { value: new Vector2(240, 205) },
      // 1 Dots, 2 Grille, 3 Wide Grille, 4 Soft Wide Grille, 5 Slot, 0 none
      maskType: { value: 1 },
      curve: { value: 0.08 },
      sharpness: { value: 0.6667 }, // 0.5 soft .. 1.0 crisp
      colorOffset: { value: 0.15 }, // per-channel beam misconvergence
      maskBrightness: { value: 1.0 },
      scanlineBrightness: { value: 1.0 },
      minScanlineThickness: { value: 0.5 }, // raise to fight moiré, 1 = none
      aspect: { value: 205 / 240 }, // input height/width, used by the warp
      wobbleStrength: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      // GLSL ES 3.00 removed gl_FragColor — the output must be declared.
      // Without this the program fails to link ("useProgram: program not
      // valid") and the screen draws nothing at all.
      out vec4 fragColor;
      in vec2 vUv;
      uniform sampler2D map;
      uniform float time;
      uniform vec2 texSize;
      uniform int maskType;
      uniform float curve;
      uniform float sharpness;
      uniform float colorOffset;
      uniform float maskBrightness;
      uniform float scanlineBrightness;
      uniform float minScanlineThickness;
      uniform float aspect;
      uniform float wobbleStrength;

      vec2 warp(vec2 uv) {
        uv -= 0.5;
        uv.x /= aspect;
        float warping = dot(uv, uv) * curve;
        warping -= curve * 0.25; // compensate for shrinking
        uv /= 1.0 - warping;
        uv.x *= aspect;
        return uv + 0.5;
      }

      vec3 linearToSrgb(vec3 col) {
        return mix(
          (pow(col, vec3(1.0 / 2.4)) * 1.055) - 0.055,
          col * 12.92,
          lessThan(col, vec3(0.0031318))
        );
      }

      vec3 srgbToLinear(vec3 col) {
        return mix(
          pow((col + 0.055) / 1.055, vec3(2.4)),
          col / 12.92,
          lessThan(col, vec3(0.04045))
        );
      }

      // texelFetch stand-in: sample the (high-res) render target at a
      // virtual-pixel center, in linear color. Clamp-to-edge wrap covers
      // the out-of-range taps the original relied on texelFetch clamping.
      vec3 fetchVirtual(float x, float y) {
        return srgbToLinear(texture(map, (vec2(x, y) + 0.5) / texSize).rgb);
      }

      vec3 scanlines(vec2 uv) {
        uv *= texSize;

        // Upper of the two scanline rows straddling this fragment
        float y = floor(uv.y + 0.5) - 1.0;
        float x = floor(uv.x);

        // Five horizontal beam taps
        float ax = x - 2.0;
        float bx = x - 1.0;
        float cx = x;
        float dx = x + 1.0;
        float ex = x + 2.0;

        vec3 upperA = fetchVirtual(ax, y);
        vec3 upperB = fetchVirtual(bx, y);
        vec3 upperC = fetchVirtual(cx, y);
        vec3 upperD = fetchVirtual(dx, y);
        vec3 upperE = fetchVirtual(ex, y);

        y += 1.0;
        vec3 lowerA = fetchVirtual(ax, y);
        vec3 lowerB = fetchVirtual(bx, y);
        vec3 lowerC = fetchVirtual(cx, y);
        vec3 lowerD = fetchVirtual(dx, y);
        vec3 lowerE = fetchVirtual(ex, y);

        // Electron beam x per channel — colorOffset misconverges R/B
        vec3 beam = vec3(uv.x - 0.5);
        beam.r -= colorOffset;
        beam.b += colorOffset;

        vec3 weightA = smoothstep(1.0, 0.0, (beam - ax) * sharpness);
        vec3 weightB = smoothstep(1.0, 0.0, (beam - bx) * sharpness);
        vec3 weightC = smoothstep(1.0, 0.0, abs(beam - cx) * sharpness);
        vec3 weightD = smoothstep(1.0, 0.0, (dx - beam) * sharpness);
        vec3 weightE = smoothstep(1.0, 0.0, (ex - beam) * sharpness);

        vec3 upperCol = upperA * weightA + upperB * weightB + upperC * weightC
                      + upperD * weightD + upperE * weightE;
        vec3 lowerCol = lowerA * weightA + lowerB * weightB + lowerC * weightC
                      + lowerD * weightD + lowerE * weightE;

        vec3 weightScaler = vec3(1.0) / (weightA + weightB + weightC + weightD + weightE);
        upperCol *= weightScaler * scanlineBrightness;
        lowerCol *= weightScaler * scanlineBrightness;

        // Brighter rows draw fatter scanlines
        vec3 upperThickness = mix(vec3(minScanlineThickness), vec3(1.0), upperCol);
        vec3 lowerThickness = mix(vec3(minScanlineThickness), vec3(1.0), lowerCol);

        // Vertical sawtooth between the two rows
        float sawtooth = (uv.y + 0.5) - y;

        vec3 upperLine = smoothstep(1.0, 0.0, vec3(sawtooth) / upperThickness);
        vec3 lowerLine = smoothstep(1.0, 0.0, vec3(1.0 - sawtooth) / lowerThickness);

        // Correct brightness below minScanlineThickness
        upperLine *= upperCol / upperThickness;
        lowerLine *= lowerCol / lowerThickness;

        return upperLine + lowerLine;
      }

      // Phosphor patterns, in physical screen pixels. .w = the pattern's
      // average brightness, used by applyMask to re-normalize.
      vec4 generateMask(vec2 fragcoord) {
        if (maskType == 1) { // Dots
          ivec2 ic = ivec2(fragcoord);
          int i = (ic.y * 2 + ic.x) % 4;
          vec3 p = i == 0 ? vec3(1, 0, 0)
                 : i == 1 ? vec3(0, 1, 0)
                 : i == 2 ? vec3(0, 0, 1)
                 : vec3(0.0);
          return vec4(p, 0.25);
        }
        if (maskType == 2) { // Aperture grille
          return vec4(int(fragcoord.x) % 2 == 0 ? vec3(0, 1, 0) : vec3(1, 0, 1), 0.5);
        }
        if (maskType == 3) { // Wide grille
          int i = int(fragcoord.x) % 4;
          vec3 p = i == 0 ? vec3(1, 0, 0)
                 : i == 1 ? vec3(0, 1, 0)
                 : i == 2 ? vec3(0, 0, 1)
                 : vec3(0.0);
          return vec4(p, 0.25);
        }
        if (maskType == 4) { // Wide soft grille
          int i = int(fragcoord.x) % 4;
          vec3 p = i == 0 ? vec3(1.0, 0.125, 0.0)
                 : i == 1 ? vec3(0.125, 1.0, 0.125)
                 : i == 2 ? vec3(0.0, 0.125, 1.0)
                 : vec3(0.125, 0.0, 0.125);
          return vec4(p, 0.3125);
        }
        if (maskType == 5) { // Slot mask
          ivec2 ic = ivec2(fragcoord) % 4;
          int i = ic.y * 4 + ic.x;
          vec3 p = i == 0  ? vec3(1, 0, 1) : i == 1  ? vec3(0, 1, 0)
                 : i == 2  ? vec3(1, 0, 1) : i == 3  ? vec3(0, 1, 0)
                 : i == 4  ? vec3(0, 0, 1) : i == 5  ? vec3(0, 1, 0)
                 : i == 6  ? vec3(1, 0, 0) : i == 7  ? vec3(0, 0, 0)
                 : i == 8  ? vec3(1, 0, 1) : i == 9  ? vec3(0, 1, 0)
                 : i == 10 ? vec3(1, 0, 1) : i == 11 ? vec3(0, 1, 0)
                 : i == 12 ? vec3(1, 0, 0) : i == 13 ? vec3(0, 0, 0)
                 : i == 14 ? vec3(0, 0, 1) : vec3(0, 1, 0);
          return vec4(p, 0.375);
        }
        return vec4(0.5);
      }

      vec3 applyMask(vec3 linearColor, vec2 fragcoord) {
        vec4 m = generateMask(fragcoord);
        linearColor *= mix(m.w, 1.0, maskBrightness);
        // Brightness the subpixels need to keep 100% output while masked
        vec3 target = linearColor / m.w;
        vec3 primary = clamp(target, 0.0, 1.0);
        // Overflow bleeds into the other subpixels so highlights stay bright
        vec3 highlights = (target - primary) / (1.0 / m.w - 1.0);
        primary *= m.rgb;
        primary += highlights * (1.0 - m.rgb);
        return primary;
      }

      void main() {
        vec2 uv = warp(vUv);
        uv.x += cos(time * 6.28318530718 * 15.0) * wobbleStrength / 8192.0;

        vec3 col;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          col = vec3(0.0); // outside the curved glass
        } else {
          col = scanlines(uv);
          col = applyMask(col, gl_FragCoord.xy);
        }
        col = linearToSrgb(clamp(col, 0.0, 1.0));

        // Vignette carried over from the previous shader
        float vig = smoothstep(0.85, 0.35, length(vUv - 0.5));
        col *= mix(0.22, 1.0, vig);

        fragColor = vec4(col, 1.0);
      }
    `,
  });
}
