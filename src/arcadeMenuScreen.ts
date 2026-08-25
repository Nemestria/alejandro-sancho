import type { ArcadeLab } from "./arcadeLabs";
import { asciify, asciiField, BG, COLS, FG, ROWS, type Screen } from "./textScreen";

// The arcade cabinet's menu, laid out as characters on textScreen.ts's grid.
//
// The layout is a direct transcription of the basement.studio reference's
// arcade screen (src/components/arcade-screen/arcade-ui-components/*), whose
// idiom is worth naming because it is doing real work:
//
//   * Two colours. Foreground and black, nothing between them. Every sense
//     of depth comes from whether a cell is lit, not from shading.
//   * Rules with labels punched INTO them, background knocked out behind the
//     text so the line appears to pass behind it (ArcadeTitleTagsHeader).
//   * Tags straddling the frame edge rather than sitting inside it —
//     "CLOSE [ESC]" top-left, "LABS V1.0" bottom-right (ArcadeWrapperTags).
//   * A list left, preview and description right.
//   * The selected row is a solid fill with the text inverted to black.
//
// Where the reference loads a cover image, this draws a seeded ASCII field
// instead — there is no art for the labs yet, and a character-density block
// is a more honest placeholder on a text-mode screen than a grey rectangle.
//
// The reference's screen is dense because it lists twenty-odd experiments.
// With five labs the same layout leaves two thirds of the glass empty, so
// the space below each column carries a readout panel instead. Everything in
// those panels is derived from real state — nothing is invented filler.

// --- column geometry ---------------------------------------------------------
const LEFT_X = 2;
const LEFT_W = 27;
const RIGHT_X = 30;
const RIGHT_W = 20;

// --- row geometry ------------------------------------------------------------
const TITLE_Y = 2;
const RULE_Y = 4;
const PANEL_Y = 6;

const LIST_H = 12; // 10 inner rows = 5 entries at ROW_PITCH 2
// Inner 18x8 cells at 20x26px is 360x208 — the reference's 16/9 preview, to
// within a cell.
const PREVIEW_H = 10;

const DESC_Y = PANEL_Y + PREVIEW_H + 1;
const STATUS_Y = PANEL_Y + LIST_H + 1;
const STATUS_H = ROWS - STATUS_Y - 3;
const CONTROLS_H = 6;
const CONTROLS_Y = ROWS - 3 - CONTROLS_H;

const ROW_PITCH = 2;

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (!line.length) line = word;
    else if (line.length + 1 + word.length <= width) line += " " + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line.length) out.push(line);
  return out;
}

/** `LABEL ..... VALUE`, the readout style every BIOS and boot screen used. */
function readout(s: Screen, col: number, row: number, width: number, label: string, value: string) {
  const dots = Math.max(1, width - label.length - value.length - 2);
  s.text(col, row, `${label} ${".".repeat(dots)} ${value}`);
}

export interface ArcadeMenuState {
  labs: ArcadeLab[];
  selectedIndex: number;
  hint: string;
  /** Cursor phase, toggled by the caller on a timer. */
  blink: boolean;
}

export function paintArcadeMenu(s: Screen, state: ArcadeMenuState) {
  const { labs, selectedIndex, hint, blink } = state;
  const selected = labs[selectedIndex];

  // ---- frame + straddling tags ---------------------------------------------
  s.box(0, 0, COLS, ROWS);
  s.punch(2, 0, "CLOSE [ESC]");
  const version = "LABS V1.0";
  s.punch(COLS - version.length - 5, ROWS - 1, version);

  // ---- header ---------------------------------------------------------------
  s.text(LEFT_X + 1, TITLE_Y, "ALEJANDRO://LABS");
  // The translated hint still shows, but forced into the display's 7-bit
  // glyph set — Press Start 2P has no arrows, middots or accents, and an
  // unmapped codepoint draws as a blank cell that silently eats the word.
  const hintAscii = asciify(hint).toUpperCase();
  s.text(COLS - LEFT_X - 1 - hintAscii.length, TITLE_Y, hintAscii);

  s.hRule(LEFT_X, RULE_Y, COLS - LEFT_X * 2);
  s.punch(LEFT_X + 1, RULE_Y, "EXPERIMENTS");
  s.punch(RIGHT_X + 1, RULE_Y, "PREVIEW");

  // ---- left: the list -------------------------------------------------------
  s.box(LEFT_X, PANEL_Y, LEFT_W, LIST_H);

  const perScreen = Math.floor((LIST_H - 2) / ROW_PITCH);
  // Scroll by whole entries only, so a row never lands half in the frame.
  const first = Math.max(
    0,
    Math.min(labs.length - perScreen, selectedIndex - Math.floor(perScreen / 2)),
  );

  for (let i = first; i < Math.min(labs.length, first + perScreen); i++) {
    const lab = labs[i];
    const y = PANEL_Y + 1 + (i - first) * ROW_PITCH;
    if (i === selectedIndex) {
      s.fill(LEFT_X + 1, y, LEFT_W - 2, 1);
      s.text(LEFT_X + 2, y, `> ${asciify(lab.title)}`, BG);
    } else {
      s.text(LEFT_X + 2, y, `  ${asciify(lab.title)}`);
    }
  }
  if (first + perScreen < labs.length) {
    s.text(LEFT_X + LEFT_W - 4, PANEL_Y + LIST_H - 2, "...");
  }

  // ---- right: preview -------------------------------------------------------
  s.box(RIGHT_X, PANEL_Y, RIGHT_W, PREVIEW_H);
  if (selected) {
    // Density comes from the placeholder colour's luma, so the labs stay as
    // visually distinguishable from each other as they were when that colour
    // was painted as a flat swatch.
    asciiField(
      s,
      RIGHT_X + 1,
      PANEL_Y + 1,
      RIGHT_W - 2,
      PREVIEW_H - 2,
      selected.id,
      0.35 + lumaOf(selected.previewColor) * 0.9,
    );
    // Caption plate over the art — the reference stacks Text on Image.
    const caption = ` ${asciify(selected.id).toUpperCase()} `;
    s.fill(RIGHT_X + 1, PANEL_Y + PREVIEW_H - 2, caption.length, 1, BG);
    s.text(RIGHT_X + 1, PANEL_Y + PREVIEW_H - 2, caption);

    // ---- right: description -------------------------------------------------
    const lines = wrap(asciify(selected.description).toUpperCase(), RIGHT_W - 2);
    for (let i = 0; i < lines.length && DESC_Y + i < CONTROLS_Y - 1; i++) {
      s.text(RIGHT_X + 1, DESC_Y + i, lines[i]);
    }
  }

  // ---- left: readout --------------------------------------------------------
  s.box(LEFT_X, STATUS_Y, LEFT_W, STATUS_H);
  s.punch(LEFT_X + 2, STATUS_Y, "STATUS");
  if (selected) {
    const w = LEFT_W - 4;
    const x = LEFT_X + 2;
    let y = STATUS_Y + 2;
    const pad = (n: number) => String(n).padStart(2, "0");
    readout(s, x, y++, w, "ENTRY", `${pad(selectedIndex + 1)}/${pad(labs.length)}`);
    readout(s, x, y++, w, "ID", asciify(selected.id).toUpperCase());
    // Honest, not decorative: labs without a url are the ones that show the
    // coming-soon card instead of loading.
    readout(s, x, y++, w, "LINK", selected.url ? "ONLINE" : "PENDING");
    readout(s, x, y++, w, "MODE", "CRT/TEXT");
    readout(s, x, y++, w, "GRID", `${COLS}X${ROWS}`);
  }

  // ---- right: controls ------------------------------------------------------
  s.box(RIGHT_X, CONTROLS_Y, RIGHT_W, CONTROLS_H);
  s.punch(RIGHT_X + 2, CONTROLS_Y, "KEYS");
  s.text(RIGHT_X + 2, CONTROLS_Y + 2, "UP/DN  SELECT");
  s.text(RIGHT_X + 2, CONTROLS_Y + 3, "ENTER  RUN");
  s.text(RIGHT_X + 2, CONTROLS_Y + 4, "ESC    EXIT");

  // ---- prompt ---------------------------------------------------------------
  if (selected) {
    s.text(
      LEFT_X + 1,
      ROWS - 2,
      `RUN ${asciify(selected.id).toUpperCase()}${blink ? " _" : ""}`,
      FG,
    );
  }
}

function lumaOf(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return (
    (((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722) / 255
  );
}
