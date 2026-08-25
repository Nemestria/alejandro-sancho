// Retro filter for the DOM-only screens — currently just LanguageGate, which
// is shown before the 3D canvas matters.
//
// This file used to apply an SVG chromatic-aberration filter (3x
// feColorMatrix + 2x feOffset + 2x feBlend) to a wrapper div containing the
// live WebGL canvas AND every DOM overlay. That made the browser re-run a
// seven-node filter graph over the whole document on every animated frame,
// which was the single most expensive thing in the app. Its 1px-on-3px
// scanline gradient also landed on the device pixel grid and crawled.
//
// Both jobs now belong to the render pipeline instead (render/postMaterial.ts
// does aberration as part of the lens warp, and scanlines at a 3px pitch that
// cannot alias), so what is left here is one static gradient layer over a
// static screen: no per-frame cost at all.
const SCAN = 0.14;
const VIG = 0.5;

export default function CrtOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        backgroundImage: [
          `repeating-linear-gradient(to bottom, rgba(0,0,0,${SCAN}) 0px, rgba(0,0,0,${SCAN}) 1.5px, transparent 1.5px, transparent 3px)`,
          `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${VIG}) 100%)`,
        ].join(", "),
        mixBlendMode: "multiply",
      }}
    />
  );
}
