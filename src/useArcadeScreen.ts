import { useEffect, useMemo, useState } from "react";
import type { Texture } from "three";
import { createTextScreen, whenFontReady } from "./textScreen";
import { paintArcadeMenu } from "./arcadeMenuScreen";
import type { ArcadeLab } from "./arcadeLabs";

// Owns the arcade cabinet's picture: one character-cell canvas, repainted
// when the menu changes and on the cursor blink, handed to Scene as a plain
// Texture.
//
// Deliberately NOT a per-frame render. The previous version was an R3F
// <RenderTexture> portal drawing a second scene at 1024x1024 sixty times a
// second to show a five-item list that changes on a keypress.
const BLINK_MS = 530;

export function useArcadeScreen({
  active,
  labs,
  selectedIndex,
  hint,
}: {
  // False when the cabinet is off or a lab iframe has taken the glass — the
  // blink timer stops with it, so a dark screen costs nothing at all.
  active: boolean;
  labs: ArcadeLab[];
  selectedIndex: number;
  hint: string;
}): Texture {
  const screen = useMemo(() => createTextScreen(), []);
  useEffect(() => () => screen.dispose(), [screen]);

  const [blink, setBlink] = useState(true);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    whenFontReady().then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setBlink((b) => !b), BLINK_MS);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    screen.render((s) => paintArcadeMenu(s, { labs, selectedIndex, hint, blink }));
    // fontReady is not read in the body on purpose: it is here so the first
    // paint is repeated once Press Start 2P has actually loaded. Without that
    // repeat the screen keeps whatever the fallback monospace drew, since
    // nothing else would trigger a repaint.
  }, [screen, active, labs, selectedIndex, hint, blink, fontReady]);

  return screen.texture;
}
