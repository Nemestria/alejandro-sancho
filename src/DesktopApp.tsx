import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import Scene from "./Scene";
import CameraRig, { type FlightPhase } from "./CameraRig";
import PasswordTerminal from "./PasswordTerminal";
import ScreenFlash from "./ScreenFlash";
import LanguageGate from "./LanguageGate";
import PostFX from "./PostFX";
import CrtOverlay from "./CrtOverlay";
import { translations, type Lang } from "./i18n";
import { PORTFOLIO_BASE_URL } from "./portfolioUrl";
import type { StationId } from "./stations";
import { ARCADE_LABS } from "./arcadeLabs";
import ArcadeMenuScene from "./ArcadeMenuScene";

const FX_STORAGE_KEY = "3d-gateway-fx-enabled";

// ?embed=1 signals the portfolio to activate its embed-mode font/spacing
// adjustments (see mainRepo/src/main.tsx). Never used for security — the
// portfolio reads this to know it's inside the 3d-gateway, not a real user.
// ?lang= carries the visitor's language choice across the iframe boundary —
// localStorage doesn't cross origins, so a URL param is the only way to hand
// this off (mainRepo/src/app/App.tsx reads it as URL_LANG).
function portfolioUrl(lang: Lang) {
  return `${PORTFOLIO_BASE_URL}?embed=1&lang=${lang}`;
}

// The portfolio's own layout targets ~1024x768 desktop (see its CLAUDE.md).
// The monitor's screen is only a few hundred CSS px wide, so a plain
// width:100%/height:100% iframe would trigger ITS mobile breakpoints
// instead of showing the real desktop site shrunk down — which is what
// "the site lives inside the screen" is supposed to look like. Fix: render
// the iframe at its real desktop resolution, then CSS-scale the whole thing
// down to fit whatever size the screen-plane's container actually is.
const PORTFOLIO_DESKTOP_WIDTH = 1280;
const PORTFOLIO_DESKTOP_HEIGHT = 800;

function PortfolioFrame({ lang }: { lang: Lang }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / PORTFOLIO_DESKTOP_WIDTH, height / PORTFOLIO_DESKTOP_HEIGHT));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
      }}
    >
      <iframe
        title="portfolio"
        src={portfolioUrl(lang)}
        style={{
          width: PORTFOLIO_DESKTOP_WIDTH,
          height: PORTFOLIO_DESKTOP_HEIGHT,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "center",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

export default function DesktopApp() {
  const [phase, setPhase] = useState<FlightPhase>("idle");
  // Which station the camera is flying toward/at/back from — stays set
  // through "returning" (CameraRig needs it to lerp back from the right
  // close shot) and only clears once back at "idle", see onReturned below.
  const [activeStation, setActiveStation] = useState<StationId | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  // null until LanguageGate resolves — gates the whole experience the same
  // way the portfolio's own splash screen does (see ARCHITECTURE.md), and
  // doubles as the loading screen for the GLB models (useProgress in
  // LanguageGate tracks the same THREE.DefaultLoadingManager useGLTF uses).
  const [lang, setLang] = useState<Lang | null>(() => {
    const saved = localStorage.getItem("vertigo-lang") as Lang | null;
    return (saved === "es" || saved === "en" || saved === "ca") ? saved : null;
  });
  const [showHelp, setShowHelp] = useState(false);
  const [camResetKey, setCamResetKey] = useState(0);
  // Checkpoint 4's "exit transition on success" — see ScreenFlash.tsx.
  const [flashActive, setFlashActive] = useState(false);
  // Arcade station state: screen powers on when the coin lands (Scene.tsx's
  // Arcade drives the animation and calls onCoinInserted), labIndex is the
  // menu selection, activeLab the confirmed lab (renders the placeholder
  // overlay). labIndexRef mirrors labIndex so the keydown handler can read
  // the current value without re-subscribing every keypress.
  const [arcadeScreenOn, setArcadeScreenOn] = useState(false);
  const [labIndex, setLabIndex] = useState(0);
  const labIndexRef = useRef(0);
  useEffect(() => { labIndexRef.current = labIndex; }, [labIndex]);
  const [activeLab, setActiveLab] = useState<string | null>(null);

  // Leaving a station resets it — next visit starts coin-first/password-
  // first again. arcadeScreenOn deliberately survives until onReturned:
  // resetting it here would switch the camera's target shot (close →
  // approach) at the very moment the return tween starts, causing a snap.
  const leaveStation = () => {
    setUnlocked(false);
    setActiveLab(null);
    setPhase("returning");
  };
  // Vintage CRT/wide-lens post-processing (PostFX.tsx), toggleable from a
  // settings button — persisted so the choice survives a reload.
  const [fxEnabled, setFxEnabled] = useState(
    () => localStorage.getItem(FX_STORAGE_KEY) !== "false",
  );
  useEffect(() => {
    localStorage.setItem(FX_STORAGE_KEY, String(fxEnabled));
  }, [fxEnabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showHelp) { setShowHelp(false); return; }
        // Peel back one layer at a time: lab overlay first, then station.
        if (activeLab) { setActiveLab(null); return; }
        if (phase === "arrived" || phase === "flying") {
          leaveStation();
        } else {
          setShowHelp(v => !v);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, showHelp, activeLab]);

  // Arcade menu navigation — only while parked at the powered-on arcade
  // with no lab overlay open, so the arrows never leak into other states.
  const arcadeMenuActive =
    phase === "arrived" && activeStation === "arcade" && arcadeScreenOn && !activeLab;

  useEffect(() => {
    if (!arcadeMenuActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setLabIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setLabIndex((i) => Math.min(ARCADE_LABS.length - 1, i + 1));
      } else if (e.key === "Enter") {
        setActiveLab(ARCADE_LABS[labIndexRef.current].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arcadeMenuActive]);

  const t = translations[lang ?? "en"];

  // Rendered glued to the monitor's screen-plane (see Scene.tsx/CameraRig's
  // "Screen-plane" note) via drei's <Html transform>, not as a full-page
  // overlay — the portfolio lives inside the screen, camera/desk stay
  // visible around it. See ARCHITECTURE.md "How they connect".
  const screenContent =
    phase === "arrived" && activeStation === "computer" && !unlocked ? (
      <PasswordTerminal t={t} onSuccess={() => { setUnlocked(true); setFlashActive(true); }} />
    ) : unlocked ? (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <PortfolioFrame lang={lang!} />
        {flashActive && <ScreenFlash onDone={() => setFlashActive(false)} />}
      </div>
    ) : null;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative" }}>
      {/* Chromatic aberration (via CrtOverlay's SVG filter) applies to
          literally everything painted inside this wrapper — the 3D canvas,
          the plain DOM buttons, LanguageGate, and (once unlocked) the
          embedded portfolio iframe. CSS `filter` operates at the
          compositing stage, so cross-origin content is affected visually
          same as anything else, unlike e.g. drawing the iframe into a
          <canvas> (which CORS would block). */}
      <div
        style={{
          width: "100%",
          height: "100%",
          filter: fxEnabled ? "url(#crt-aberration)" : undefined,
        }}
      >
        <Canvas shadows camera={{ position: [4, 3, 6], fov: 50 }}>
          <Suspense fallback={null}>
            <Scene
              phase={phase}
              onComputerClick={() => { setActiveStation("computer"); setPhase("flying"); }}
              onArcadeClick={() => { setActiveStation("arcade"); setPhase("flying"); }}
              screenContent={screenContent}
              welcomeText={t.welcome}
              showWelcome={lang !== null}
              arcadeArrived={phase === "arrived" && activeStation === "arcade"}
              arcadeScreenOn={arcadeScreenOn}
              onCoinInserted={() => setArcadeScreenOn(true)}
              arcadeScreenContent={
                <ArcadeMenuScene labs={ARCADE_LABS} selectedIndex={labIndex} menuHint={t.arcade.menuHint} />
              }
            />
            <CameraRig
              phase={phase}
              station={activeStation}
              stationZoomed={activeStation === "arcade" ? arcadeScreenOn : true}
              onArrived={() => setPhase("arrived")}
              onReturned={() => {
                setPhase("idle");
                setActiveStation(null);
                setArcadeScreenOn(false);
                setLabIndex(0);
              }}
              resetKey={camResetKey}
            />
          </Suspense>
          <PostFX
            enabled={fxEnabled}
            atScreen={phase === "arrived"}
            flat={phase === "arrived" && activeStation === "arcade"}
          />
        </Canvas>

        {phase !== "idle" && phase !== "returning" && (
          <button
            onClick={leaveStation}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              fontFamily: "monospace",
              background: "rgba(0,0,0,0.6)",
              color: "#bfe9ff",
              border: "1px solid #bfe9ff",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            {t.back}
          </button>
        )}

        <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
          {phase === "idle" && (
            <button
              onClick={() => setCamResetKey(k => k + 1)}
              style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.6)", color: "#bfe9ff", border: "1px solid #bfe9ff", padding: "8px 14px", cursor: "pointer" }}
            >
              {t.resetCamera}
            </button>
          )}
          <button
            onClick={() => setFxEnabled((v) => !v)}
            style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.6)", color: "#bfe9ff", border: "1px solid #bfe9ff", padding: "8px 14px", cursor: "pointer" }}
          >
            {fxEnabled ? t.effectsOn : t.effectsOff}
          </button>
        </div>

        {!lang && <LanguageGate onDone={setLang} />}

        {/* INSERT COIN prompt — parked at the arcade, screen still off */}
        {phase === "arrived" && activeStation === "arcade" && !arcadeScreenOn && (
          <div
            style={{
              position: "absolute",
              bottom: 48,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 15,
              color: "#f2bfe9",
              letterSpacing: 3,
              pointerEvents: "none",
              userSelect: "none",
              animation: "insert-coin-blink 1.1s steps(1, end) infinite",
            }}
          >
            {t.arcade.insertCoin}
            <style>{`@keyframes insert-coin-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.15; } }`}</style>
          </div>
        )}

        {/* Lab placeholder overlay — a confirmed menu selection lands here
            until real per-lab pages exist. Same state-gated pattern as the
            controls overlay below. */}
        {activeLab && (
          <div
            onClick={() => setActiveLab(null)}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", zIndex: 60 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ fontFamily: "monospace", color: "#f2bfe9", border: "1px solid rgba(242,191,233,0.4)", background: "rgba(15,0,12,0.9)", padding: "42px 56px", maxWidth: 480, textAlign: "center", letterSpacing: 1 }}
            >
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 15, marginBottom: 20, letterSpacing: 2 }}>
                {ARCADE_LABS.find((l) => l.id === activeLab)?.title ?? activeLab}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.9, color: "rgba(242,191,233,0.75)", marginBottom: 24 }}>
                {ARCADE_LABS.find((l) => l.id === activeLab)?.description}
              </div>
              <div style={{ fontSize: 14, letterSpacing: 3, marginBottom: 18 }}>— {t.arcade.labComingSoon} —</div>
              <div style={{ fontSize: 11, color: "rgba(242,191,233,0.4)" }}>{t.arcade.labBackHint}</div>
            </div>
          </div>
        )}

        {/* Subtle ESC hint — always visible in idle, fades when not needed */}
        {lang && phase === "idle" && !showHelp && (
          <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", fontFamily: "monospace", fontSize: 11, color: "rgba(191,233,255,0.35)", letterSpacing: 2, pointerEvents: "none", userSelect: "none" }}>
            [ESC] {t.controls.hint}
          </div>
        )}

        {/* Controls overlay — shown on ESC */}
        {showHelp && (
          <div
            onClick={() => setShowHelp(false)}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", zIndex: 50 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: "monospace", color: "#bfe9ff", border: "1px solid rgba(191,233,255,0.3)", background: "rgba(0,10,15,0.85)", padding: "36px 48px", maxWidth: 440, lineHeight: 2.1, letterSpacing: 1 }}
            >
              <div style={{ fontSize: 13, marginBottom: 18, color: "#7ecfef", letterSpacing: 3 }}>— {t.controls.title} —</div>
              <div style={{ fontSize: 13 }}>
                <div><span style={{ color: "#7ecfef" }}>CLICK</span> {" "}{t.controls.clickComputer}</div>
                <div><span style={{ color: "#7ecfef" }}>PASSWORD</span> {" "}{t.controls.password}</div>
                <div><span style={{ color: "#7ecfef" }}>← / ESC</span> {" "}{t.controls.back}</div>
                <div><span style={{ color: "#7ecfef" }}>CRT</span> {" "}{t.controls.crt}</div>
              </div>
              <div style={{ fontSize: 11, marginTop: 20, color: "rgba(191,233,255,0.35)" }}>{t.controls.dismiss}</div>
            </div>
          </div>
        )}
      </div>

      {fxEnabled && <CrtOverlay atScreen={phase === "arrived"} />}
    </div>
  );
}
