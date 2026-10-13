import { useState } from "react";
import { translations } from "./i18n";
import { FONT_BODY, FONT_DISPLAY } from "./fonts";
import { Button } from "./ui";

const PASSWORD = "1234";
const PX = FONT_DISPLAY;
const MONO = FONT_BODY;
const ACCENT = "var(--ink)";
const ERROR = "var(--danger)";

export default function PasswordTerminal({
  t,
  onSuccess,
}: {
  t: (typeof translations)[keyof typeof translations];
  onSuccess: () => void;
}) {
  const [value, setValue] = useState("");
  const [denied, setDenied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PASSWORD) {
      onSuccess();
      return;
    }
    setDenied(true);
    setValue("");
    setTimeout(() => setDenied(false), 350);
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        animation: "term-fade-in 0.6s ease both",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "82%",
          background: "var(--panel)",
          border: `1px solid ${ACCENT}`,
          boxShadow: "var(--shadow-hard)",
          padding: "24px 20px",
          transform: "scale(0.6)",
          animation: denied ? "term-shake 0.3s ease" : undefined,
        }}
      >
        <div
          style={{
            fontFamily: PX,
            fontSize: 12,
            color: ACCENT,
            marginBottom: 18,
            letterSpacing: 1,
          }}
        >
          {t.enterPassword}
        </div>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${ACCENT}`,
            outline: "none",
            color: ACCENT,
            fontFamily: MONO,
            fontSize: 18,
            letterSpacing: 4,
            padding: "6px 2px",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: "var(--ink-dim)",
            marginTop: 10,
            letterSpacing: 1,
          }}
        >
          {t.hint}
        </div>
        <Button type="submit" style={{ width: "100%", marginTop: 16 }}>
          {t.confirm}
        </Button>
        {denied && (
          <div
            style={{
              fontFamily: PX,
              fontSize: 11,
              color: ERROR,
              marginTop: 14,
              letterSpacing: 1,
            }}
          >
            {t.accessDenied}
          </div>
        )}
      </form>

      <style>{`
        @keyframes term-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes term-shake {
          0%, 100% { transform: scale(0.6) translateX(0); }
          20% { transform: scale(0.6) translateX(-10px); }
          40% { transform: scale(0.6) translateX(8px); }
          60% { transform: scale(0.6) translateX(-6px); }
          80% { transform: scale(0.6) translateX(4px); }
        }
      `}</style>
    </div>
  );
}
