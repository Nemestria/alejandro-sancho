import { useEffect, useMemo, useState } from "react";
import { LANGUAGES, type Lang } from "./i18n";
import { FONT_BODY } from "./fonts";
import { consoleContent } from "./consoleContent";
import { useFx } from "./crt/fx";
import { Button, LinkButton, Panel, ThemePicker } from "./ui";
import { CrtGlass, LensDefs, LENS_FILTER_ID } from "./ConsoleCrt";

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
  // Phones can't run the 3D scene, so the switch button becomes a plain link
  // to the full portfolio instead.
  isMobile: boolean;
  portfolioUrl: string;
}

export default function ConsoleApp({ lang, onLang, onSwitch, isMobile, portfolioUrl }: Props) {
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
      } else if (e.key.toLowerCase() === "g") {
        if (isMobile) window.location.href = portfolioUrl;
        else onSwitch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c.sections.length, lang, onLang, onSwitch, isMobile, portfolioUrl]);

  // Blinking block cursor — a hard on/off, no easing, to stay 1-bit.
  const [cursor, setCursor] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  // CRT lens/phosphor/noise, off-switchable like the 3D view's CRT toggle.
  const [fx, toggleFx] = useFx();

  const rule = useMemo(() => "=".repeat(200), []);

  return (
    <>
    {fx && <LensDefs />}
    {fx && <CrtGlass />}
    <div
      style={{
        filter: fx ? `url(#${LENS_FILTER_ID})` : undefined,
        position: "fixed", inset: 0, overflowY: "auto", background: BG, color: FG,
        fontFamily: FONT, fontSize: 15, lineHeight: 1.55,
        // Kill antialiasing where the browser allows it — crisp 1-bit edges.
        WebkitFontSmoothing: "none", fontSmooth: "never",
      } as React.CSSProperties}
    >
      <style>{`
        .asc ::selection { background:var(--ink); color:var(--paper); }
        .asc .nav { display:grid; grid-template-columns: 1fr; gap:0; }
        @media (min-width: 820px) { .asc .body { grid-template-columns: 240px 1fr !important; } }
      `}</style>
      <div className="asc" style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 16px 48px" }}>
        <div style={{ fontSize: 12, letterSpacing: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
          {c.boot}
        </div>
        <div style={{ overflow: "hidden", whiteSpace: "nowrap", height: "1.55em" }}>{rule}</div>

        <div style={{ margin: "16px 0 8px" }}>
          <Banner word="ALEJANDRO" />
          <Banner word="SANCHO" />
        </div>
        <div style={{ fontWeight: 700, letterSpacing: 2, margin: "8px 0 16px" }}>{c.tagline}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20 }}>
          {isMobile
            ? <LinkButton href={portfolioUrl}>{c.toPortfolio}</LinkButton>
            : <Button onClick={onSwitch}>{c.to3d}</Button>}
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <Button active={fx} onClick={toggleFx}>CRT {fx ? "ON" : "OFF"}</Button>
            <ThemePicker />
            <span style={{ letterSpacing: 1 }}>{c.lang}:</span>
            {LANGUAGES.map((l) => (
              <Button key={l.code} active={l.code === lang} onClick={() => onLang(l.code)}>
                {l.code.toUpperCase()}
              </Button>
            ))}
          </span>
        </div>

        <div
          className="body"
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, alignItems: "start" }}
        >
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

          <Panel
            title={`${String(idx + 1).padStart(2, "0")}/${String(c.sections.length).padStart(2, "0")} -- ${section.label}`}
            style={{ minWidth: 0 }}
          >
            <main>
            <div style={{ padding: "16px 16px 20px" }}>
              {section.lines.map((ln, i) => {
                const text = typeof ln === "string" ? ln : ln.text;
                const row = (
                  <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: "1.55em" }}>
                    {typeof ln === "string"
                      ? text
                      : <a href={ln.href} target={ln.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ color: FG, textDecoration: "underline", textDecorationThickness: 2 }}>{text}</a>}
                  </div>
                );
                return row;
              })}
              <div style={{ marginTop: 16 }}>
                {c.footer}
                <span aria-hidden style={{ background: cursor ? FG : BG, color: cursor ? BG : FG }}> </span>
              </div>
            </div>
            </main>
          </Panel>
        </div>

        <div style={{ overflow: "hidden", whiteSpace: "nowrap", height: "1.55em", marginTop: 24 }}>{rule}</div>
        <div style={{ fontSize: 12, letterSpacing: 1 }}>{c.keys}</div>
      </div>
    </div>
    </>
  );
}
