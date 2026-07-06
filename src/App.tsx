import { lazy, Suspense, useEffect, useState } from "react";
import { PORTFOLIO_BASE_URL } from "./portfolioUrl";

// Lazy so Scene.tsx's module-level `useGLTF.preload(...)` (see Scene.tsx)
// never fires for a mobile visitor — a static top-level import would still
// evaluate that module (and start the GLB downloads) even if DesktopApp
// itself never renders.
const DesktopApp = lazy(() => import("./DesktopApp"));

// Mobile fallback (ARCHITECTURE.md open decision #3, resolved): the 3D
// scene/camera-drag/password-terminal experience isn't worth building a
// touch-friendly version of — the portfolio itself is the more mobile-
// friendly destination, so phones skip the gimmick entirely and land there
// directly (real navigation, not the in-screen iframe embed — there's no
// monitor screen-plane to embed into if the 3D scene never mounts). This
// also means no GLB/texture downloads on a phone that will never render them.
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const query = `(max-width: ${MOBILE_BREAKPOINT}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return isMobile;
}

function App() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) window.location.replace(PORTFOLIO_BASE_URL);
  }, [isMobile]);

  if (isMobile) {
    return (
      <div style={{
        width: "100vw", height: "100vh", background: "#000", color: "#bfe9ff",
        fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center",
        letterSpacing: 2, fontSize: 13,
      }}>
        REDIRECTING...
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <DesktopApp />
    </Suspense>
  );
}

export default App;
