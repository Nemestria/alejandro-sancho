import { useEffect, useRef } from "react";
import { CRT_GLSL } from "./glsl";
import { CRT_PRESETS, type CrtPresetName } from "./params";
import { useFx } from "./fx";

// The one CRT "glass" layer for everything that is DOM rather than 3D: the
// cross-origin iframes (ScreenGlass), the language gate and the ASCII console.
//
// WebGL cannot sample DOM, and a cross-origin iframe can never become a
// texture, so the picture itself can't be warped here. What can be drawn is the
// part of a tube that sits IN FRONT of the picture: scanlines, RGB triads, the
// phosphor-mask texture, corner shading, a roll bar and a phosphor cast — as a
// per-channel multiplier (mix-blend-mode: multiply) — plus separate static.
// All strengths come from CRT_PRESETS; all maths from crt/glsl.ts.

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uResolution;   // device pixels
uniform float uTime;
uniform vec3 uTint;
uniform float uTintAmount;
uniform float uScan;
uniform float uTriad;
uniform float uVignette;
uniform float uRoll;
uniform sampler2D uMask;    // public/crt-phosphor.webp, tiled 1:1 in device px
uniform float uMaskAmount;
uniform vec2 uMaskSize;
uniform vec3 uMaskNorm;     // gain / mean colour, so the mask keeps overall brightness

out vec4 fragColor;

${CRT_GLSL}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // Everything produces a MULTIPLIER: 1.0 lets the content through, lower
  // values remove light. That keeps the darkening physical — an alpha-blended
  // black overlay would haze the picture grey instead.
  vec3 gain = vec3(1.0);
  gain *= 1.0 - uScan * crtScan(gl_FragCoord.y);
  gain *= crtTriad(gl_FragCoord.x, uTriad);
  gain *= crtVignette(uv, uVignette);
  gain *= crtRoll(uv.y, uTime, uRoll);
  gain *= mix(vec3(1.0), uTint, uTintAmount);

  if (uMaskAmount > 0.0) {
    vec3 m = texture(uMask, fract(gl_FragCoord.xy / uMaskSize)).rgb;
    gain *= mix(vec3(1.0), clamp(m * uMaskNorm, 0.0, 1.0), uMaskAmount);
  }

  fragColor = vec4(gain, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // A shader that does not compile has to say so (the arcade screen once
    // drew nothing, silently — see git history).
    console.error("CRT glass shader failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((ch) => ch + ch).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const MASK_URL = "/crt-phosphor.webp";
// Average gain the mask is normalised to, so enabling it dims text only a little.
const MASK_MEAN_GAIN = 0.8;

interface GlassProps {
  preset: Extract<CrtPresetName, "glass" | "ui">;
  /** Phosphor colour (theme tint). */
  tint: string;
  /** Cover the whole viewport instead of the nearest positioned ancestor. */
  fixed?: boolean;
}

function Multiply({ preset, tint, fixed }: GlassProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Read in the loop, not captured, so a theme change doesn't rebuild the GL context.
  const tintRef = useRef(tint);
  tintRef.current = tint;
  const params = CRT_PRESETS[preset];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // The canvas is made per mount, not rendered by React: cleanup calls
    // loseContext(), and a re-mount on the SAME element (StrictMode in dev)
    // would be handed that dead context back.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power",
    });
    if (!gl) { canvas.remove(); return; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.remove(); return; }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("CRT glass link failed:", gl.getProgramInfoLog(program));
      canvas.remove();
      return;
    }
    gl.useProgram(program);

    // One oversized triangle: cheaper than a quad, and no diagonal seam.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const loc = (n: string) => gl.getUniformLocation(program, n);
    const uResolution = loc("uResolution");
    const uTime = loc("uTime");
    const uTint = loc("uTint");
    const uMaskAmount = loc("uMaskAmount");
    gl.uniform1f(loc("uTintAmount"), params.tint);
    gl.uniform1f(loc("uScan"), params.scan);
    gl.uniform1f(loc("uTriad"), params.triad);
    gl.uniform1f(loc("uVignette"), params.vignette);
    gl.uniform1f(loc("uRoll"), params.roll);
    gl.uniform1f(uMaskAmount, 0); // stays off until the texture has loaded
    gl.uniform1i(loc("uMask"), 0);

    // Phosphor-mask texture. Its mean colour is measured so the shader can
    // normalise it to MASK_MEAN_GAIN.
    const tex = gl.createTexture();
    let disposed = false;
    if (params.mask > 0) {
      const img = new Image();
      img.onload = () => {
        if (disposed) return;
        const probe = document.createElement("canvas");
        probe.width = probe.height = 32;
        const pctx = probe.getContext("2d")!;
        pctx.drawImage(img, 0, 0, 32, 32);
        const d = pctx.getImageData(0, 0, 32, 32).data;
        const mean = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) mean[c] += d[i + c] / 255;
        const px = d.length / 4;
        const norm = mean.map((m) => MASK_MEAN_GAIN / Math.max(m / px, 0.01));
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.uniform2f(loc("uMaskSize"), img.naturalWidth, img.naturalHeight);
        gl.uniform3f(loc("uMaskNorm"), norm[0], norm[1], norm[2]);
        gl.uniform1f(uMaskAmount, params.mask);
      };
      img.src = MASK_URL;
    }

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Post-transform size, on purpose: the glass must be rasterised at the
      // size it is shown, or the device-pixel pitch the shader assumes is a lie.
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      gl.uniform2f(uResolution, width, height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      const [r, g, b] = hexToRgb(tintRef.current);
      gl.uniform3f(uTint, r, g, b);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteTexture(tex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // Contexts are a scarce per-document resource; stations are re-entered.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [params]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: fixed ? "fixed" : "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", mixBlendMode: "multiply", zIndex: fixed ? 20 : undefined,
      }}
    />
  );
}

/** Flickering static: a small canvas redrawn ~12x/s, stretched with hard pixels. */
function Noise({ amount, fixed }: { amount: number; fixed?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(cv.width, cv.height);
    const draw = () => {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = d[i + 1] = d[i + 2] = Math.random() < 0.5 ? 0 : 255;
        d[i + 3] = Math.random() * 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    draw();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(draw, 80);
    return () => clearInterval(id);
  }, []);
  return (
    <canvas
      ref={ref} width={320} height={200} aria-hidden
      style={{
        position: fixed ? "fixed" : "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", imageRendering: "pixelated", opacity: amount,
        mixBlendMode: "screen", zIndex: fixed ? 21 : undefined,
      }}
    />
  );
}

/** The CRT glass. Renders nothing when the site-wide CRT toggle is off. */
export default function Glass(props: GlassProps) {
  const [fx] = useFx();
  if (!fx) return null;
  return (
    <>
      <Multiply {...props} />
      <Noise amount={CRT_PRESETS[props.preset].grain} fixed={props.fixed} />
    </>
  );
}
