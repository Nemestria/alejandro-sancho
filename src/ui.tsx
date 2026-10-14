import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { THEMES, setTheme, useTheme } from "./theme";

// Shared widgets — all styling lives in theme.css (.ui-*), so a change there
// restyles every button/panel in the 3D UI, the gate and the console at once.

export function Button({
  active, className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button {...rest} className={`ui-btn${active ? " is-active" : ""} ${className}`} />;
}

export function LinkButton({ className = "", ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} className={`ui-btn ${className}`} />;
}

export function Panel({
  title, children, style, className = "",
}: { title?: ReactNode; children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={`ui-panel ${className}`} style={style}>
      {title && <div className="ui-panel__title">{title}</div>}
      {children}
    </div>
  );
}

/** Row of colour swatches: the standard white theme plus five alternates. */
export function ThemePicker({ label = "THEME", className = "" }: { label?: string; className?: string }) {
  const theme = useTheme();
  return (
    <span role="group" aria-label={label} className={`ui-themes ${className}`}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          className="ui-swatch"
          aria-pressed={t.id === theme.id}
          aria-label={t.label}
          title={t.label}
          onClick={() => setTheme(t.id)}
          // Each swatch previews its own palette, not the active theme's.
          style={{ background: t.paper, borderColor: t.ink }}
        >
          <span style={{ width: 8, height: 8, background: t.ink, display: "block" }} />
        </button>
      ))}
    </span>
  );
}
