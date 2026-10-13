import { useSyncExternalStore } from "react";

// One CRT on/off switch for the whole site (3D post pass, iframe glass, gate,
// console). Replaces the two per-view keys it grew from.
const KEY = "vertigo-fx";
const LEGACY_KEYS = ["3d-gateway-fx-enabled", "console-fx"]; // read once for migration

function load(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v !== null) return v !== "off";
    // Honour an earlier explicit "off" from either old toggle.
    return !LEGACY_KEYS.some((k) => ["false", "off"].includes(localStorage.getItem(k) ?? ""));
  } catch {
    return true;
  }
}

let enabled = load();
const listeners = new Set<() => void>();

export function setFx(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* session-only */ }
  listeners.forEach((l) => l());
}

export function useFx(): [boolean, () => void] {
  const on = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => enabled,
  );
  return [on, () => setFx(!enabled)];
}
