import { useEffect, useState } from "react";
import { ATTRIBUTIONS } from "./attributions";
import type { translations } from "./i18n";
import { FONT_DISPLAY } from "./fonts";
import { Button, Panel } from "./ui";

type T = (typeof translations)["en"];

// The in-app half of the attribution obligation. CC BY requires credit to
// accompany the work, and for a website the work IS the page — a file in the
// repository reaches nobody who merely visits. One click away, always
// reachable, is the usual reading of "reasonable to the medium".
//
// Styled to match the CRT chrome around it rather than as a system dialog:
// this sits inside the fiction, so it uses the same Button/Panel as the rest of the UI.
export function Credits({ t }: { t: T }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t.credits}</Button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            padding: "88px 16px 24px", // clear the top-right button row
            background: "var(--scrim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            cursor: "pointer",
          }}
        >
          <Panel
            // Clicks inside the panel must not dismiss it — the links have to
            // stay clickable.
            style={{
              cursor: "auto",
              maxWidth: 620,
              width: "min(90vw, 620px)",
              maxHeight: "calc(100vh - 128px)",
              overflowY: "auto",
              fontSize: 13,
              lineHeight: 1.7,
              padding: "24px 28px",
            }}
          >
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 12, marginBottom: 20 }}>
              {t.creditsTitle}
            </div>

            {ATTRIBUTIONS.map((a) => (
              <div key={a.url} style={{ marginBottom: 20 }}>
                <div>
                  &quot;
                  <a href={a.url} target="_blank" rel="noreferrer" style={LINK}>
                    {a.title}
                  </a>
                  &quot; by {a.author} — licensed under{" "}
                  <a href={a.licenceUrl} target="_blank" rel="noreferrer" style={LINK}>
                    {a.licence}
                  </a>
                  .
                </div>
                <div style={{ opacity: 0.6 }}>{a.usage}</div>
              </div>
            ))}

            <div style={{ opacity: 0.5, marginTop: 24 }}>{t.controls.dismiss}</div>
          </Panel>
        </div>
      )}
    </>
  );
}

const LINK: React.CSSProperties = {
  color: "var(--ink)",
  textDecorationThickness: 2,
};
