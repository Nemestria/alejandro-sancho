import type { ReactNode } from "react";
import Glass from "./crt/Glass";
import { useFx } from "./crt/fx";

// CRT glass for the screens whose content is a cross-origin iframe.
//
// The constraint is real and permanent: WebGL cannot sample DOM, and a
// cross-origin iframe cannot become a texture by any route (the same tainting
// rule that blocks drawImage on a foreign frame). So the 3D post pass and the
// arcade shader can never run over the portfolio or the labs the way they run
// over the 3D scene.
//
// What CAN be done is draw the glass itself — the part of a CRT that sits in
// front of the picture — and composite it over the iframe. That is crt/Glass
// (the same layer the language gate and console use, preset "glass"), plus a
// static glare/bezel shadow here. Every layer is pointer-events:none, so the
// wrapped iframe stays interactive. Follows the site-wide CRT toggle.
export default function ScreenGlass({
  children,
  tint,
}: {
  children: ReactNode;
  /** Phosphor colour — the active theme's tint. */
  tint: string;
}) {
  const [fx] = useFx();
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--paper)" }}>
      {children}
      <Glass preset="glass" tint={tint} />
      {/* Glare and bezel shadow. Static, so it stays CSS: a gradient that never
          changes costs one rasterisation. */}
      {fx && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(115deg, color-mix(in srgb, var(--ink) 7%, transparent) 0%, transparent 38%, transparent 62%, color-mix(in srgb, var(--ink) 4%, transparent) 100%)",
            boxShadow: "inset 0 0 18px rgba(0,0,0,0.75)",
          }}
        />
      )}
    </div>
  );
}

