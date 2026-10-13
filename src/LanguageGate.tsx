import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { LANGUAGES, translations, type Lang } from "./i18n";
import { FONT_BODY, FONT_DISPLAY } from "./fonts";

const PX = FONT_DISPLAY;
const MONO = FONT_BODY;
const ACCENT = "#00b9be";

const GLITCH_CSS = `
@keyframes lg-glitch {
  0%   { transform: translateX(0) skewX(0deg);   filter: none;                                  opacity: 1;    }
  15%  { transform: translateX(-8px) skewX(-5deg); filter: hue-rotate(90deg) saturate(4) brightness(1.5); opacity: 0.7;  }
  35%  { transform: translateX(8px)  skewX(5deg);  filter: hue-rotate(270deg) saturate(3);       opacity: 0.85; }
  55%  { transform: translateX(-4px) skewX(-2deg); filter: hue-rotate(180deg) brightness(1.3);  opacity: 0.6;  }
  75%  { transform: translateX(4px);               filter: none;                                  opacity: 0.9;  }
  100% { transform: translateX(0);                 filter: none;                                  opacity: 1;    }
}
.lg-glitching {
  animation: lg-glitch 0.22s steps(5) forwards;
}
`;

const CYCLE_LANGS: Lang[] = ["en", "es", "ca"];

export default function LanguageGate({ onDone }: { onDone: (lang: Lang) => void }) {
  const { progress } = useProgress();
  const [chosen, setChosen] = useState<Lang | null>(null);

  // Cycling state — only active before a language is chosen
  const [cycleIdx, setCycleIdx] = useState(0);
  const [glitching, setGlitching] = useState(false);
  const glitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (chosen) return; // stop cycling once user picks
    const iv = setInterval(() => {
      setGlitching(true);
      glitchTimer.current = setTimeout(() => {
        setCycleIdx(prev => (prev + 1) % 3);
        setGlitching(false);
      }, 220);
    }, 2200);
    return () => {
      clearInterval(iv);
      if (glitchTimer.current) clearTimeout(glitchTimer.current);
    };
  }, [chosen]);

  useEffect(() => {
    if (chosen && progress >= 100) onDone(chosen);
  }, [chosen, progress, onDone]);

  const cycledLang = CYCLE_LANGS[cycleIdx];
  const topLabel = chosen
    ? translations[chosen].loading
    : translations[cycledLang].chooseLanguage;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#020a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        zIndex: 10,
      }}
    >
      {/* Inject glitch keyframe */}
      <style>{GLITCH_CSS}</style>

      {/* Top label — cycles with glitch; frozen once language chosen */}
      <div
        className={glitching ? "lg-glitching" : undefined}
        style={{ fontFamily: PX, fontSize: 14, color: ACCENT, letterSpacing: 1 }}
      >
        {topLabel}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 260 }}>
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => { localStorage.setItem("vertigo-lang", code); setChosen(code); }}
            style={{
              width: "100%",
              background: chosen === code ? ACCENT : "transparent",
              color: chosen === code ? "#020a0a" : ACCENT,
              border: `1px solid ${ACCENT}`,
              fontFamily: PX,
              fontSize: 11,
              letterSpacing: 1,
              padding: "12px 0",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 12, color: `${ACCENT}99`, letterSpacing: 1 }}>
        {Math.round(progress)}%
      </div>
    </div>
  );
}
