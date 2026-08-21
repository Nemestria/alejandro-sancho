import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

// A CSS stand-in for arcadeScreenMaterial.ts's CRT shader, for screens whose
// content is a cross-origin iframe.
//
// The shader path is unavailable here on purpose, not by omission: it samples
// a WebGL texture, and DOM — cross-origin iframes especially — can never
// become one. So the phosphor/scanline/glare cues get drawn as DOM layers
// stacked over the content instead. `filter`-class effects are fine on
// cross-origin content (compositing stage, no pixel access), which is the
// same reason CrtOverlay.tsx can cover the whole page.
//
// Every layer is pointer-events:none so the wrapped iframe stays interactive.

// Target scanline pitch in real on-screen pixels. Held constant no matter how
// drei scales the host: scanlines belong to the glass, so they must not grow
// with the content the way a naive percentage/px pattern would.
const SCAN_PITCH_SCREEN_PX = 3;

export default function ScreenGlass({
  children,
  intensity = 1,
  tint = "#bfe9ff",
}: {
  children: ReactNode;
  // 0 disables every layer; 1 is the tuned default. Scales the effects
  // together so a screen can be dialled back without re-tuning each one.
  intensity?: number;
  // Phosphor/glare colour. Cyan for the computer monitor, magenta for the
  // arcade, matching each station's lighting.
  tint?: string;
}) {
  const i = Math.max(0, Math.min(1, intensity));
  const rootRef = useRef<HTMLDivElement>(null);
  // Cumulative CSS scale applied by every ancestor (drei's <Html> multiplies
  // by distanceFactor, which itself moves with viewport size). Measured
  // rather than passed in, so this works under any host without the caller
  // having to know the transform chain.
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      // getBoundingClientRect is post-transform; offsetWidth is pre-transform.
      const rendered = el.getBoundingClientRect().width;
      const layout = el.offsetWidth;
      if (layout > 0 && rendered > 0) setScale(rendered / layout);
    };
    measure();
    // The scale changes when the canvas resizes (distanceFactor depends on
    // canvas height) — a ResizeObserver on the host catches that, since the
    // host's own layout box tracks the Html div drei resizes.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // Convert the on-screen targets into this element's local units, so they
  // survive the ancestor scale-up at whatever value it currently has.
  const pitch = SCAN_PITCH_SCREEN_PX / scale;
  const lineW = pitch / 2;
  const triad = pitch;
  const blur = 18 / scale;

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>
      {children}

      {/* Scanlines + phosphor triads. Multiply keeps the darkening physical
          (lines subtract light) instead of hazing the image grey. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: [
            `repeating-linear-gradient(to bottom, rgba(0,0,0,${0.26 * i}) 0px, rgba(0,0,0,${0.26 * i}) ${lineW}px, transparent ${lineW}px, transparent ${pitch}px)`,
            `repeating-linear-gradient(to right, rgba(255,0,0,${0.06 * i}) 0px, rgba(0,255,0,${0.06 * i}) ${triad / 3}px, rgba(0,0,255,${0.06 * i}) ${(triad / 3) * 2}px, transparent ${triad}px)`,
          ].join(", "),
          mixBlendMode: "multiply",
        }}
      />

      {/* Glass: corner falloff, a diagonal glare, and an inset shadow that
          reads as the bezel recessing the panel. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: [
            `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,${0.55 * i}) 100%)`,
            `linear-gradient(115deg, ${hexToRgba(tint, 0.07 * i)} 0%, transparent 38%, transparent 62%, ${hexToRgba(tint, 0.04 * i)} 100%)`,
          ].join(", "),
          boxShadow: `inset 0 0 ${blur}px rgba(0,0,0,${0.75 * i})`,
        }}
      />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
