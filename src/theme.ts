import { useSyncExternalStore } from "react";

// One colour system for the whole site. A theme is just ink on paper (plus a
// tint for the 3D grade); every DOM surface reads --ink / --paper from CSS
// variables (theme.css), and JS-side consumers (WebGL tints, canvas screens)
// read the same values through useTheme(). "white" is the standard.
export interface Theme {
  id: string;
  label: string;
  ink: string;
  paper: string;
  /** Cast applied to the 3D scene by render/Renderer.tsx. */
  tint: string;
}

export const THEMES: Theme[] = [
  { id: "white", label: "WHITE", ink: "#ffffff", paper: "#000000", tint: "#e8f4f8" },
  { id: "green", label: "GREEN PHOSPHOR", ink: "#4cff6a", paper: "#010a03", tint: "#7dffa0" },
  { id: "amber", label: "AMBER", ink: "#ffb000", paper: "#0a0500", tint: "#ffc04d" },
  { id: "cyan", label: "CYAN", ink: "#bfe9ff", paper: "#020a0a", tint: "#8fd8e8" },
  { id: "pink", label: "ARCADE PINK", ink: "#f2bfe9", paper: "#0f000c", tint: "#f2bfe9" },
  { id: "eink", label: "E-INK", ink: "#0a0a0a", paper: "#ecebe4", tint: "#f4f1e6" },
];

const KEY = "vertigo-theme";
const DEFAULT = THEMES[0];

function load(): Theme {
  try {
    return THEMES.find((t) => t.id === localStorage.getItem(KEY)) ?? DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function apply(t: Theme) {
  const root = document.documentElement.style;
  root.setProperty("--ink", t.ink);
  root.setProperty("--paper", t.paper);
}

let current = load();
apply(current); // at import time, so the first paint is already themed
const listeners = new Set<() => void>();

export function setTheme(id: string) {
  const next = THEMES.find((t) => t.id === id);
  if (!next || next === current) return;
  current = next;
  apply(next);
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked: session-only */ }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => current,
  );
}
