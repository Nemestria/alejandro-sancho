import { useEffect, useMemo, useState } from "react";
import { LANGUAGES, type Lang } from "./i18n";
import { FONT_BODY } from "./fonts";
import { consoleContent } from "./consoleContent";
import { useFx } from "./crt/fx";
import { Button, Panel, ThemePicker } from "./ui";
import HoloCard from "./HoloCard";
import { PROJECTS } from "./projects";
import Glass from "./crt/Glass";
import { LensDefs, LENS_FILTER_ID } from "./crt/Lens";
import { useTheme } from "./theme";

// The "simple" portfolio: monospace, hard edges, zero images. Two flat colours
// only — ink on paper, both from the active theme (white-on-black by default,
// see theme.ts) — so "dim" text is ASCII (dots, dashes) rather than grey and
// selection is inverse video.
const FG = "var(--ink)";
const BG = "var(--paper)";
const FONT = FONT_BODY;

// 5x5 bitmap font, just the letters the banner needs.
const GLYPHS: Record<string, string[]> = {
  A: [" ### ", "#   #", "#####", "#   #", "#   #"],
  C: [" ####", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#### ", "#    ", "#####"],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  J: ["  ###", "    #", "    #", "#   #", " ### "],
  L: ["#    ", "#    ", "#    ", "#    ", "#####"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
};

// Drawn as SVG rects, not block characters: glyph coverage for the full-block
// char varies by font and leaves seams; rects stay exact and strictly 1-bit.
function Banner({ word }: { word: string }) {
  const cells: React.ReactNode[] = [];
  let x = 0;
  for (const ch of word) {
    const g = GLYPHS[ch];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (g[r][c] === "#") cells.push(<rect key={`${x}-${r}-${c}`} x={x + c} y={r} width={1} height={1} />);
    x += 6;
  }
  return (
    <svg
      role="img" aria-label={word} viewBox={`0 0 ${x - 1} 5`}
      shapeRendering="crispEdges"
      style={{ fill: FG, display: "block", width: "100%", maxWidth: word.length * 6 * 14, marginBottom: 14 }}
    >
      {cells}
    </svg>
  );
}

interface Props {
  lang: Lang;
  onLang: (l: Lang) => void;
  onSwitch: () => void;
  // Phones only ever get this console: the 3D scene is not offered there.
  isMobile: boolean;
}

export default function ConsoleApp({ lang, onLang, onSwitch, isMobile }: Props) {
  const c = consoleContent[lang];
  const [idx, setIdx] = useState(0);
  const section = c.sections[idx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= c.sections.length) setIdx(n - 1);
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, c.sections.length - 1));
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
      else if (e.key.toLowerCase() === "l") {
        const i = LANGUAGES.findIndex((l) => l.code === lang);
        onLang(LANGUAGES[(i + 1) % LANGUAGES.length].code);
      } else if (e.key.toLowerCase() === "g" && !isMobile) {
        onSwitch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c.sections.length, lang, onLang, onSwitch, isMobile]);

  // Blinking block cursor — a hard on/off, no easing, to stay 1-bit.
  const [cursor, setCursor] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  // CRT glass/lens, off-switchable like everywhere else.
  const [fx, toggleFx] = useFx();
  const theme = useTheme();
  // The SVG lens re-filters the whole page on every repaint — too dear for a
  // phone — and a CSS filter would also trap the fixed tab bar inside the
  // scroller. Phones keep the glass (scanlines, mask, grain), not the warp.
  const lensOn = fx && !isMobile;

  const rule = useMemo(() => "=".repeat(200), []);
  const isProjects = section.id === "projects";

  // Phones: one card per screen while on PROJECTS.
  const snap = isMobile && isProjects ? "y proximity" : undefined;

  return (
    <>
    {lensOn && <LensDefs />}
    <Glass preset="ui" fixed tint={theme.tint} />
    <div
      style={{
        filter: lensOn ? `url(#${LENS_FILTER_ID})` : undefined,
        position: "fixed", inset: 0, overflowY: "auto", background: BG, color: FG,
        fontFamily: FONT, fontSize: isMobile ? 14 : 15, lineHeight: 1.55,
        scrollSnapType: snap,
        overscrollBehavior: "contain",
        // Kill antialiasing where the browser allows it — crisp 1-bit edges.
        WebkitFontSmoothing: "none", fontSmooth: "never",
      } as React.CSSProperties}
    >
      <style>{`
        .asc ::selection { background:var(--ink); color:var(--paper); }
        .asc .nav { display:grid; grid-template-columns: 1fr; gap:0; }
        @media (min-width: 820px) { .asc .body { grid-template-columns: 240px 1fr !important; } }
        .asc-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:40px 20px; padding:12px 0 4px; }
        .asc-cards > .holo { scroll-snap-align:center; scroll-margin-top:12px; }
        .asc-set { display:grid; gap:10px; margin-bottom:20px; }
        .asc-lang { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border:var(--line-heavy) solid var(--ink); }
        .asc-lang button { min-height:52px; padding:0 2px; border:0; cursor:pointer; background:var(--paper); color:var(--ink);
          font-family:var(--font-body); font-weight:700; font-size:13px; letter-spacing:0; }
        .asc-lang button + button { border-left:var(--line-heavy) solid var(--ink); }
        .asc-lang button[aria-pressed="true"] { background:var(--ink); color:var(--paper); }
        .asc-set__row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); gap:10px; align-items:stretch; }
        .asc-set__row .ui-btn { width:100%; }
        .asc-theme { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
        .asc-theme .ui-swatch { width:100%; height:100%; min-height:40px; }
        .asc-tabs { position:fixed; left:0; right:0; bottom:0; z-index:15; display:flex;
          padding:8px 8px calc(8px + env(safe-area-inset-bottom)); gap:6px;
          background:var(--paper); border-top:var(--line-heavy) solid var(--ink); }
        .asc-tabs button { flex:1 1 0; min-height:48px; padding:0; font-family:var(--font-display); font-size:12px;
          letter-spacing:0; border:var(--line) solid var(--ink); background:var(--paper); color:var(--ink); cursor:pointer; }
        .asc-tabs button[aria-current="page"] { background:var(--ink); color:var(--paper); }
      `}</style>
      <div
        className="asc"
        style={{
          maxWidth: 1080, margin: "0 auto",
          padding: isMobile ? "12px 12px calc(88px + env(safe-area-inset-bottom))" : "20px 16px 48px",
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
          {c.boot}
        </div>
        <div style={{ overflow: "hidden", whiteSpace: "nowrap", height: "1.55em" }}>{rule}</div>

        <div style={{ margin: isMobile ? "10px 0 4px" : "16px 0 8px" }}>
          <Banner word="ALEJANDRO" />
          <Banner word="SANCHO" />
        </div>
        <div style={{ fontWeight: 700, letterSpacing: isMobile ? 1 : 2, margin: "8px 0 16px", fontSize: isMobile ? 12 : undefined }}>
          {c.tagline}
        </div>

        {isMobile ? (
          // Phones: big, full-width, thumb-sized controls. A segmented language
          // switch (full names, 3 equal cells) over a CRT toggle + a 3x2 swatch
          // grid. Nothing is sized in px that can overflow a 320px screen.
          <div className="asc-set" role="group" aria-label="Settings">
            <div className="asc-lang" role="group" aria-label={c.lang}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  lang={l.code}
                  aria-pressed={l.code === lang}
                  onClick={() => onLang(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="asc-set__row">
              <Button active={fx} onClick={toggleFx} style={{ minHeight: 52 }}>CRT {fx ? "ON" : "OFF"}</Button>
              <ThemePicker className="asc-theme" />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
            <Button onClick={onSwitch}>{c.to3d}</Button>
            <span style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {LANGUAGES.map((l) => (
                <Button key={l.code} active={l.code === lang} onClick={() => onLang(l.code)}>
                  {l.code.toUpperCase()}
                </Button>
              ))}
              <Button active={fx} onClick={toggleFx}>CRT {fx ? "ON" : "OFF"}</Button>
              <ThemePicker />
            </span>
          </div>
        )}

        <div
          className="body"
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, alignItems: "start" }}
        >
          {!isMobile && (
            <Panel title={<span role="heading" aria-level={2}>{c.menu}</span>}>
              <nav aria-label={c.menu} className="nav">
                {c.sections.map((s, i) => (
                  <button
                    key={s.id}
                    className="ui-row"
                    onClick={() => setIdx(i)}
                    aria-current={i === idx ? "page" : undefined}
                  >
                    {i === idx ? ">" : " "} {String(i + 1).padStart(2, "0")} {s.label}
                  </button>
                ))}
              </nav>
            </Panel>
          )}

          <Panel
            title={`${String(idx + 1).padStart(2, "0")}/${String(c.sections.length).padStart(2, "0")} -- ${section.label}`}
            style={{ minWidth: 0 }}
          >
            <main>
            <div style={{ padding: isMobile ? "12px 12px 16px" : "16px 16px 20px" }}>
              {section.lines.map((ln, i) => (
                <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: "1.55em" }}>
                  {typeof ln === "string"
                    ? ln
                    : <a href={ln.href} target={ln.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ color: FG, textDecoration: "underline", textDecorationThickness: 2 }}>{ln.text}</a>}
                </div>
              ))}
              {isProjects && (
                <div className="asc-cards">
                  {PROJECTS.map((p, i) => (
                    <HoloCard key={p.id} project={p} lang={lang} ui={c.holo} index={i} />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                {c.footer}
                <span aria-hidden style={{ background: cursor ? FG : BG, color: cursor ? BG : FG }}> </span>
              </div>
            </div>
            </main>
          </Panel>
        </div>

        {!isMobile && (
          <>
            <div style={{ overflow: "hidden", whiteSpace: "nowrap", height: "1.55em", marginTop: 24 }}>{rule}</div>
            <div style={{ fontSize: 12, letterSpacing: 1 }}>{c.keys}</div>
          </>
        )}
      </div>

      {isMobile && (
        <nav className="asc-tabs" aria-label={c.menu}>
          {c.sections.map((s, i) => (
            <button
              key={s.id}
              aria-label={s.label}
              aria-current={i === idx ? "page" : undefined}
              onClick={() => { setIdx(i); document.querySelector(".asc")?.parentElement?.scrollTo({ top: 0 }); }}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </nav>
      )}
    </div>
    </>
  );
}
