import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

// A character-cell display, drawn with a 2D canvas and worn as a texture by
// a screen mesh.
//
// This replaces the previous approach for the arcade cabinet, which was a
// second R3F scene (ortho camera, troika <Text>, planes for dividers)
// rendered into a 1024x1024 RenderTexture every frame. That worked, but it
// was a full extra render pass per frame to draw what is, in the end, a menu
// — and it could never look like the thing it was imitating, because
// vector-perfect text at arbitrary sub-pixel positions is exactly what a
// period display could NOT do.
//
// A real text mode gets there by construction. Everything is snapped to a
// cell, the glyph set is 7-bit ASCII, rules are made of '-' and '|', and
// there is no anti-aliased curve anywhere on the screen. It is also far
// cheaper: the canvas is redrawn only when something changes (plus a 2Hz
// cursor blink), not sixty times a second.
//
// Colour is deliberately monochrome. arcadeScreenMaterial.ts maps luma
// across a teal-to-purple phosphor ramp, so anything drawn here in white
// comes out tinted by the tube, the way a real single-phosphor monitor
// works — paint it in colour and you would be fighting that.

// Press Start 2P is already loaded by index.css (Google Fonts, SIL OFL), and
// canvas 2D can use any font the document has. That is why the arcade screen
// needs no font asset of its own, and why it sidesteps the troika
// custom-font problem noted in Scene.tsx's WelcomeSign.
const FONT_FAMILY = '"Press Start 2P", monospace';

// Cells are TALLER than they are wide, as every real text mode's were (VGA's
// was 9x16). Square cells were the first attempt and they read as a grid of
// tiles rather than as lines of text.
//
// 52x34 at 20x26 gives a 1040x884 canvas — a 1.176:1 picture, matching the
// arcade glass's 1.17:1 face, so nothing is stretched on the way to the mesh.
export const CELL_W = 20;
export const CELL_H = 26;
export const COLS = 52;
export const ROWS = 34;

// Press Start 2P advances exactly 1em, so setting the size to the cell WIDTH
// makes the glyph grid and the cell grid the same grid.
const FONT_PX = CELL_W;
// Leftover height becomes leading, split above the glyph.
const BASELINE_OFFSET = Math.round((CELL_H - FONT_PX) / 2);

export const FG = "#dff4f4";
export const BG = "#000000";
// Ramp used for placeholder art, darkest to lightest. Pure ASCII on purpose:
// Press Start 2P has no box-drawing block, and '#'/'%' read better through
// the CRT shader's scanlines than a solid block would anyway.
export const RAMP = " .:-=+*#%@";

export interface Screen {
  /** Paint a solid rectangle, in cells. Used for inverted (selected) rows. */
  fill(col: number, row: number, w: number, h: number, color?: string): void;
  /** Draw a string starting at a cell. Clipped at the right edge. */
  text(col: number, row: number, str: string, color?: string): void;
  /** A horizontal rule of '-' from col to col+w-1. */
  hRule(col: number, row: number, w: number, color?: string): void;
  /** A vertical rule of '|'. */
  vRule(col: number, row: number, h: number, color?: string): void;
  /** A '+'-cornered box outline. */
  box(col: number, row: number, w: number, h: number, color?: string): void;
  /**
   * A label punched into a rule: the reference's signature move — the label
   * sits ON the line with the background knocked out behind it, so the rule
   * appears to pass behind the text.
   */
  punch(col: number, row: number, label: string, color?: string): void;
}

export interface TextScreen {
  texture: CanvasTexture;
  /** Redraw. The callback gets a fresh, cleared screen to paint into. */
  render(paint: (s: Screen) => void): void;
  dispose(): void;
}

export function createTextScreen(): TextScreen {
  const canvas = document.createElement("canvas");
  canvas.width = COLS * CELL_W;
  canvas.height = ROWS * CELL_H;
  const ctx = canvas.getContext("2d")!;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Linear, not Nearest: the CRT shader resamples through a curvature warp,
  // and point-sampling underneath that produces exactly the crawling edges
  // the whole pipeline is trying to avoid.
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;

  const api: Screen = {
    fill(col, row, w, h, color = FG) {
      ctx.fillStyle = color;
      ctx.fillRect(col * CELL_W, row * CELL_H, w * CELL_W, h * CELL_H);
    },
    text(col, row, str, color = FG) {
      ctx.fillStyle = color;
      const max = COLS - col;
      const s = str.length > max ? str.slice(0, max) : str;
      const y = row * CELL_H + BASELINE_OFFSET;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === " ") continue;
        // Drawn cell by cell rather than as one fillText call: a proportional
        // fallback (if the webfont has not loaded yet) would otherwise drift
        // out of the grid, and every layout below assumes the grid holds.
        ctx.fillText(ch, (col + i) * CELL_W, y);
      }
    },
    hRule(col, row, w, color = FG) {
      api.text(col, row, "-".repeat(Math.max(0, w)), color);
    },
    vRule(col, row, h, color = FG) {
      for (let i = 0; i < h; i++) api.text(col, row + i, "|", color);
    },
    box(col, row, w, h, color = FG) {
      if (w < 2 || h < 2) return;
      api.text(col, row, "+" + "-".repeat(w - 2) + "+", color);
      api.text(col, row + h - 1, "+" + "-".repeat(w - 2) + "+", color);
      api.vRule(col, row + 1, h - 2, color);
      api.vRule(col + w - 1, row + 1, h - 2, color);
    },
    punch(col, row, label, color = FG) {
      const padded = ` ${label} `;
      api.fill(col, row, padded.length, 1, BG);
      api.text(col, row, padded, color);
    },
  };

  const render = (paint: (s: Screen) => void) => {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${FONT_PX}px ${FONT_FAMILY}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    paint(api);
    texture.needsUpdate = true;
  };

  return {
    texture,
    render,
    dispose() {
      texture.dispose();
    },
  };
}

/**
 * Deterministic ASCII fill, used where the reference shows a cover image.
 * Seeded by a string so a given lab always draws the same "thumbnail",
 * and biased by `density` so each one reads differently.
 */
export function asciiField(
  s: Screen,
  col: number,
  row: number,
  w: number,
  h: number,
  seed: string,
  density: number,
  color = FG,
) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  for (let y = 0; y < h; y++) {
    let line = "";
    for (let x = 0; x < w; x++) {
      n = (n * 1664525 + 1013904223) >>> 0;
      const r = (n >>> 8) / 0xffffff;
      // Bias toward the dark end of the ramp; a uniform pick reads as static
      // rather than as an image.
      const v = Math.pow(r, 2.2) * density;
      line += RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
    }
    s.text(col, row + y, line, color);
  }
}

// Codepoints the app's own strings use that this display cannot draw.
// Press Start 2P covers 7-bit ASCII and little else, and canvas 2D renders a
// missing glyph as a blank cell — so an unmapped character does not look
// wrong, it silently deletes itself, which is worse.
const SUBSTITUTIONS: Record<string, string> = {
  "\u2191": "UP", "\u2193": "DN", "\u2190": "<-", "\u2192": "->",
  "\u00b7": "-", "\u2022": "-", "\u2013": "-", "\u2014": "-",
  "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
  "\u00e1": "A", "\u00e9": "E", "\u00ed": "I", "\u00f3": "O", "\u00fa": "U",
  "\u00c1": "A", "\u00c9": "E", "\u00cd": "I", "\u00d3": "O", "\u00da": "U",
  "\u00f1": "N", "\u00d1": "N", "\u00e7": "C", "\u00c7": "C",
  "\u00e0": "A", "\u00e8": "E", "\u00ec": "I", "\u00f2": "O", "\u00f9": "U",
  "\u00fc": "U", "\u00dc": "U", "\u00bf": "?", "\u00a1": "!",
};

/**
 * Force a string into the display's glyph set. Known characters are
 * transliterated; anything else still unprintable is dropped rather than
 * left to render as an invisible hole.
 */
export function asciify(input: string): string {
  let out = "";
  for (const ch of input) {
    const sub = SUBSTITUTIONS[ch];
    if (sub !== undefined) out += sub;
    else if (ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) <= 0x7e) out += ch;
  }
  return out;
}

/**
 * Resolves once Press Start 2P is actually available to canvas 2D. Without
 * this the first paint silently lands in the fallback monospace, and since
 * nothing re-renders on its own that wrong first frame is the one that
 * sticks.
 */
export function whenFontReady(): Promise<void> {
  if (!document.fonts) return Promise.resolve();
  return document.fonts
    .load(`${FONT_PX}px ${FONT_FAMILY}`)
    .then(() => undefined)
    .catch(() => undefined);
}
