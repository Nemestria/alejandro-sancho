import { useEffect, useState } from "react";
import { ATTRIBUTIONS } from "./attributions";
import type { translations } from "./i18n";

type T = (typeof translations)["en"];

// The in-app half of the attribution obligation. CC BY requires credit to
// accompany the work, and for a website the work IS the page — a file in the
// repository reaches nobody who merely visits. One click away, always
// reachable, is the usual reading of "reasonable to the medium".
//
// Styled to match the CRT chrome around it rather than as a system dialog:
// this sits inside the fiction, so it gets the same monospace and phosphor
// blue as the effects toggle beside it.
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
      <button
        onClick={() => setOpen(true)}
        style={BUTTON}
      >
        {t.credits}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            cursor: "pointer",
          }}
        >
          <div
            // Clicks inside the panel must not dismiss it — the links have to
            // stay clickable.
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: "auto",
              maxWidth: 620,
              width: "min(90vw, 620px)",
              maxHeight: "80vh",
              overflowY: "auto",
              border: "1px solid #bfe9ff",
              background: "rgba(0,0,0,0.92)",
              color: "#bfe9ff",
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: 1.7,
              padding: "24px 28px",
            }}
          >
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, marginBottom: 20 }}>
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
          </div>
        </div>
      )}
    </>
  );
}

const BUTTON: React.CSSProperties = {
  fontFamily: "monospace",
  background: "rgba(0,0,0,0.6)",
  color: "#bfe9ff",
  border: "1px solid #bfe9ff",
  padding: "8px 14px",
  cursor: "pointer",
};

const LINK: React.CSSProperties = {
  color: "#f2bfe9",
  textDecorationThickness: 1,
};
