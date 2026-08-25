import { useEffect, useRef, type ReactNode } from "react";

// CRT glass for the screens whose content is a cross-origin iframe.
//
// The constraint is real and permanent: WebGL cannot sample DOM, and a
// cross-origin iframe cannot become a texture by any route (the same
// tainting rule that blocks drawImage on a foreign frame). So
// arcadeScreenMaterial.ts's shader can never run over the portfolio or the
// labs the way it runs over the arcade's render target.
//
// What CAN be done is draw the glass itself — the part of a CRT that sits in
// front of the picture rather than being made of it — and composite it over
// the iframe. That is what this does: a small WebGL canvas running the same
// vocabulary as the mesh shader (scanlines, phosphor triads, curvature
// falloff, a sweeping roll bar, a tint cast), blended in multiply.
//
// The previous version approximated all of that with stacked CSS
// repeating-linear-gradients, and had to measure the ancestor transform
// chain with getBoundingClientRect in a layout effect to stop the scanline
// pitch growing with drei's distanceFactor. That is gone: the canvas backing
// store is sized in DEVICE pixels, so the shader works in device pixels
// directly and the pitch is correct by construction, at any scale.
//
// Every layer is pointer-events:none, so the wrapped iframe stays interactive.

// Scanline pitch in device pixels. Three is the floor — a two-pixel period
// sits exactly at Nyquist and beats against the display grid.
const SCAN_PITCH_DEVICE_PX = 3;
const SCAN_FREQ = (Math.PI * 2) / SCAN_PITCH_DEVICE_PX;

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision mediump float;

uniform vec2 uResolution;   // device pixels
uniform float uTime;
uniform vec3 uTint;
uniform float uIntensity;
uniform float uScanFreq;

out vec4 fragColor;

#define SCAN_DEPTH   0.34
#define TRIAD_DEPTH  0.10
#define EDGE_FALLOFF 0.55
#define ROLL_DEPTH   0.10
#define TINT_AMOUNT  0.22

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // Everything below produces a MULTIPLIER: 1.0 lets the iframe through
  // untouched, lower values subtract light. Working this way keeps the
  // darkening physical instead of hazing the picture grey, which is what an
  // alpha-blended black overlay would do.
  vec3 gain = vec3(1.0);

  // Scanlines, at a fixed device-pixel pitch. Cosine rather than a hard
  // step, so that when the screen is small on-camera this fades toward flat
  // grey instead of aliasing into a moire pattern.
  float scan = 0.5 + 0.5 * cos(gl_FragCoord.y * uScanFreq);
  gain *= 1.0 - SCAN_DEPTH * scan;

  // Phosphor triads: three device pixels wide, one per channel. This is the
  // aperture-grille half of the mesh shader's mask — the half that survives
  // being applied to content it cannot resample.
  float cell = mod(floor(gl_FragCoord.x), 3.0);
  vec3 triad = vec3(1.0 - TRIAD_DEPTH);
  if (cell == 0.0) triad.r = 1.0;
  else if (cell == 1.0) triad.g = 1.0;
  else triad.b = 1.0;
  gain *= triad;

  // Curvature falloff. The picture itself cannot be warped, but the corner
  // shading a curved tube produces can be, and that is most of what reads as
  // curvature at a glance.
  vec2 c = uv - 0.5;
  float edge = dot(c, c) * 4.0;
  gain *= 1.0 - EDGE_FALLOFF * smoothstep(0.35, 1.30, edge);

  // Roll bar — the mesh shader's sweeping scan band, in the only direction
  // multiply can express it (a soft darkening rather than a brightening).
  float rollPos = fract(uTime * 0.055);
  float d = uv.y - rollPos;
  d -= floor(d + 0.5); // wrap to [-0.5, 0.5] so it does not pop at the seam
  gain *= 1.0 - ROLL_DEPTH * exp(-d * d * 900.0);

  // Phosphor cast: multiplying by a tinted white pulls the picture toward
  // the station's colour without flattening its own hues.
  gain *= mix(vec3(1.0), uTint, TINT_AMOUNT);

  // uIntensity fades the whole glass back toward "no glass at all".
  gain = mix(vec3(1.0), gain, uIntensity);

  fragColor = vec4(gain, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Failing silently here would repeat the class of bug that once left the
    // arcade screen drawing nothing at all (see git history) — a shader that
    // does not compile has to say so.
    console.error("ScreenGlass shader failed:", gl.getShaderInfoLog(shader));
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

function hexToRgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

export default function ScreenGlass({
  children,
  intensity = 1,
  tint = "#bfe9ff",
}: {
  children: ReactNode;
  // 0 disables the glass entirely; 1 is the tuned default.
  intensity?: number;
  // Phosphor colour. Cyan for the computer monitor, magenta for the arcade,
  // matching each station's lighting.
  tint?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read inside the render loop rather than captured in a closure, so
  // changing either prop takes effect without tearing down the GL context.
  const propsRef = useRef({ intensity, tint });
  propsRef.current = { intensity, tint };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("ScreenGlass link failed:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // One oversized triangle covering clip space — cheaper than a quad, and
    // no diagonal seam for the rasteriser to expose.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uTintLoc = gl.getUniformLocation(program, "uTint");
    const uIntensity = gl.getUniformLocation(program, "uIntensity");
    gl.uniform1f(gl.getUniformLocation(program, "uScanFreq"), SCAN_FREQ);

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // getBoundingClientRect is post-transform, which is exactly what is
      // wanted: the glass must be rasterised at the size it is actually
      // shown, or the device-pixel pitch the shader assumes would be a lie.
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
      // The roll bar is the only animated term; with the tab hidden there is
      // nothing to advance and no reason to hold the GPU awake.
      if (document.hidden) return;
      gl.uniform2f(uResolution, width, height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      const [r, g, b] = hexToRgb(propsRef.current.tint);
      gl.uniform3f(uTintLoc, r, g, b);
      gl.uniform1f(uIntensity, Math.max(0, Math.min(1, propsRef.current.intensity)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // Contexts are a scarce per-document resource, and a station can be
      // entered and left repeatedly in one session.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>
      {children}

      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          mixBlendMode: "multiply",
        }}
      />

      {/* Glare and bezel shadow. Static, so they stay as CSS: a gradient that
          never changes costs one rasterisation, where moving them into the
          shader would mean carrying an additive second pass just for them. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(115deg, ${hexToRgba(tint, 0.07 * intensity)} 0%, transparent 38%, transparent 62%, ${hexToRgba(tint, 0.04 * intensity)} 100%)`,
          boxShadow: `inset 0 0 18px rgba(0,0,0,${0.75 * intensity})`,
        }}
      />
    </div>
  );
}
