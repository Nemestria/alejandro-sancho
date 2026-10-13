import { lazy, Suspense, useEffect, useState } from "react";
import { PORTFOLIO_BASE_URL } from "./portfolioUrl";
import ConsoleApp from "./ConsoleApp";
import type { Lang } from "./i18n";

// Lazy so Scene.tsx's module-level `useGLTF.preload(...)` (see Scene.tsx)
// never fires for a visitor who stays in the console — a static top-level
// import would still evaluate that module (and start the GLB downloads).
const DesktopApp = lazy(() => import("./DesktopApp"));

// Mobile: the 3D scene/camera-drag/password-terminal experience isn't worth a
// touch-friendly version, so phones default to the ASCII console (the "simple"
// portfolio) and never download the GLBs. Their switch button links straight
// to the full portfolio instead of the 3D scene.
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

// Mode lives in the URL hash (#console / #3d) so each view is linkable and the
// browser back button flips between them. No hash = 3D on desktop, console on
// phones; phones never get 3D.
type Mode = "3d" | "console";
function readMode(isMobile: boolean): Mode {
  if (isMobile) return "console";
  return window.location.hash === "#console" ? "console" : "3d";
}

const LANG_KEY = "vertigo-lang"; // same key LanguageGate/DesktopApp use
function readLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "en" || saved === "es" || saved === "ca") return saved;
  const nav = navigator.language.slice(0, 2);
  return nav === "es" || nav === "ca" ? nav : "en";
}

function App() {
  const isMobile = useIsMobile();
  const [, bump] = useState(0);
  const [lang, setLangState] = useState<Lang>(readLang);

  useEffect(() => {
    const onHash = () => bump((n) => n + 1);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  };

  if (readMode(isMobile) === "console") {
    return (
      <ConsoleApp
        lang={lang}
        onLang={setLang}
        onSwitch={() => { window.location.hash = "#3d"; }}
        isMobile={isMobile}
        portfolioUrl={PORTFOLIO_BASE_URL}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <DesktopApp onSwitchToConsole={() => { window.location.hash = "#console"; }} />
    </Suspense>
  );
}

export default App;
