import { useEffect, useState } from "react";
import { CRT_PRESETS } from "./params";

// Lens for DOM-only pages (ASCII console, language gate): an SVG displacement
// filter driven by a map baked once per viewport size. Barrel plus a
// horizontal-only "panini" squeeze toward the sides, from CRT_PRESETS.ui.
// Never applied over iframes or the WebGL canvas: re-filtering those every
// frame is what the old page-wide SVG filter did, and why it was removed.
//
// Usage: render <LensDefs/> once, then give the page root
// `filter: url(#console-lens)` (LENS_FILTER_ID).
export const LENS_FILTER_ID = "console-lens";

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
  const { lens, panini } = CRT_PRESETS.ui;
  const N = 160; // low-res map, bilinearly stretched by feImage
  const maxX = (w / 2) * (lens * 2 + panini);
  const maxY = (h / 2) * lens * 2;
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
      const sx = ux * (1 + lens * r2 + panini * ux * ux);
      const sy = uy * (1 + lens * r2);
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
      {/* sRGB, not linearRGB: the map encodes offsets, not colours. */}
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
