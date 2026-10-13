// The project's two typefaces — nothing else may appear in a font stack.
// Both are self-hosted via @fontsource (imported in main.tsx), not Google Fonts.
//
// DISPLAY (Press Start 2P): titles, labels, buttons. Short, uppercase strings
//   only — it has no accents, arrows or middots.
// BODY (Space Mono): everything longer, and anything with Spanish/Catalan
//   accents. Latin-1 only too: no arrows (← ↑ ↓) or ⟳, use ASCII instead.
//
// Mirrored by --font-display / --font-body in theme.css (CSS can't read these
// and canvas 2D can't read CSS variables, hence both).
export const FONT_DISPLAY = "'Press Start 2P', monospace";
export const FONT_BODY = "'Space Mono', monospace";
