import { useState } from "react";

const PASSWORD = "1234";
const PX = "'Press Start 2P', monospace";
const MONO = "'Share Tech Mono', monospace";
const ACCENT = "#00b9be";
const ERROR = "#ff4d4d";

export default function PasswordTerminal({
  onSuccess,
}: {
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
        background: "#020a0a",
        animation: "term-fade-in 0.6s ease both",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "82%",
          background: "rgba(5, 12, 12, 0.92)",
          border: `1px solid ${ACCENT}`,
          boxShadow: `0 0 24px ${ACCENT}55`,
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
          ENTER PASSWORD:
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
            color: `${ACCENT}99`,
            marginTop: 10,
            letterSpacing: 1,
          }}
        >
          HINT: 1234
        </div>
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
            ACCESS DENIED
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
