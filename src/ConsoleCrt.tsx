import { useEffect, useRef, useState } from "react";

// CRT treatment for the DOM-only ASCII console. DOM can't go through the WebGL
// pipeline in src/render, so the lens is an SVG displacement filter driven by a
// map we bake once per viewport size; phosphor mask + noise are overlay layers.

export const LENS_FILTER_ID = "console-lens";

// Barrel distortion plus a horizontal-only "panini" term (extra squeeze toward
// the left/right edges, vertical lines near the sides stay vertical-ish).
const BARREL = 0.035;
const PANINI = 0.1;

function useViewport() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

function buildMap(w: number, h: number) {
  const N = 160; // low-res map, bilinearly stretched by feImage
  const maxX = (w / 2) * (BARREL * 2 + PANINI);
  const maxY = (h / 2) * BARREL * 2;
  const scale = Math.max(2 * maxX, 2 * maxY) + 2;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const ux = (x / (N - 1)) * 2 - 1;
      const uy = (y / (N - 1)) * 2 - 1;
      const r2 = ux * ux + uy * uy;
      const sx = ux * (1 + BARREL * r2 + PANINI * ux * ux);
      const sy = uy * (1 + BARREL * r2);
      const dx = ((sx - ux) * w) / 2; // px to shift the sample by
      const dy = ((sy - uy) * h) / 2;
      const i = (y * N + x) * 4;
      img.data[i] = Math.round(128 + (dx / scale) * 255);
      img.data[i + 1] = Math.round(128 + (dy / scale) * 255);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { url: cv.toDataURL("image/png"), scale };
}

/** Hidden SVG holding the lens filter; apply with `filter: url(#console-lens)`. */
export function LensDefs() {
  const { w, h } = useViewport();
  const [map, setMap] = useState<{ url: string; scale: number } | null>(null);
  useEffect(() => { setMap(buildMap(w, h)); }, [w, h]);
  if (!map) return null;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <filter
        id={LENS_FILTER_ID} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
        x={0} y={0} width={w} height={h} colorInterpolationFilters="sRGB"
      >
        <feImage href={map.url} x={0} y={0} width={w} height={h} preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={map.scale} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/** Flickering static: a small canvas redrawn ~12x/s, stretched with hard pixels. */
function Noise() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(cv.width, cv.height);
    const draw = () => {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() < 0.5 ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
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
        position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none",
        imageRendering: "pixelated", opacity: 0.04, mixBlendMode: "screen", zIndex: 21,
      }}
    />
  );
}

/** Glass layers: RGB phosphor mask, noise, vignette. Sits above the lensed content. */
export function CrtGlass() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 20,
          backgroundImage: "url(/crt-phosphor.webp)", backgroundRepeat: "repeat",
          mixBlendMode: "screen", opacity: 0.35,
        }}
      />
      <Noise />
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 22,
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </>
  );
}
