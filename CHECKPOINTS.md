# Checkpoints

Work through these in order. Each one should run (`pnpm dev`) and visibly demonstrate the new piece before moving on — don't combine checkpoints, don't skip ahead on the model dependency (use the placeholder, see Checkpoint 1).

## ✅ Checkpoint 0 — Scaffold (done)

- Vite + React 19 + TS project created
- `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing` installed
- Default Vite template content cleared (`App.tsx` is a placeholder)
- Builds clean (`pnpm build`)
- Docs written (this set)

**Not done yet:** git init / GitHub repo / Vercel project for this new app — do that whenever ready to go live with it (see "Deploy" in Checkpoint 5).

## ✅ Checkpoint 1 — Static scene (done)

- [x] `<Canvas>` mounted in `App.tsx`, lighting (ambient + spot)
- [x] Real GLB models in use (`Computer.glb`, `Adjustable Desk.glb`) — model-source decision resolved, see ARCHITECTURE.md
- [x] Floor/desk plane + grid, dark environment with fog
- [x] Visible 3D note prop near the desk with "1234" on it (`Note` in `src/Scene.tsx`) — in-scene justification for the password, see ARCHITECTURE.md "In-scene note prop"

## ✅ Checkpoint 2 — Click-to-fly + locked POV camera (done, incl. chromatic aberration)

**Goal:** clicking the computer flies the camera into a close-up "inside the screen" view with the wide-angle + chromatic aberration effect. Camera is a locked POV throughout, not a free orbit inspector — see ARCHITECTURE.md "Camera model."

- [x] Raycast click handler on the computer mesh
- [x] Camera animation: eased position/lookAt interpolation from establishing shot → screen close-up
- [x] FOV ramps wider during the flight (50° → 95°)
- [x] Locked-POV rig (`src/CameraRig.tsx`, replaces the old free-orbit `<CameraControls>`): drag rotates yaw/pitch within a clamped range, mouse-near-edge adds small parallax look-offset, zoom clamped tight; clamp tightens further once "arrived". Verified in-browser: drag visibly pans the view, wheel visibly dollies a little, both within a small range.
- [x] Hover the computer → screen-plane emissive glows on; hover out → off (`ScreenPlane` in `src/Scene.tsx`, since `Monitor.glb` has no separate screen material — see ARCHITECTURE.md). Verified via the live material's emissive color toggling on hover/unhover.
- [x] Chromatic aberration + barrel/fisheye lens distortion — implemented, but as a **page-wide toggleable CRT filter** (`src/PostFX.tsx` + `src/CrtOverlay.tsx`) rather than the originally-planned flight-progress-ramped effect scoped to the 3D canvas — see ARCHITECTURE.md "Post-processing" for why (it needed to cover the DOM/iframe too, not just the canvas)
- [x] Re-clicking during/after the flight doesn't restart or break the animation

**Definition of done:** click the computer, watch a deliberate, non-janky camera flight into a locked close POV; hovering the computer beforehand visibly glows the screen. Chromatic aberration/lens distortion present as a toggleable filter, not flight-progress-ramped (see ARCHITECTURE.md if that dynamic version is wanted later).

## ✅ Checkpoint 3 — Password terminal, anchored to the screen (done)

**Goal:** once the camera arrives, a password prompt appears glued to the monitor's screen — not a full-page overlay — styled like a retro terminal.

- [x] Prompt appears after the camera flight completes
- [x] Styled with the portfolio's font stack (`Press Start 2P` / `Share Tech Mono`) — already loaded via `src/index.css`'s Google Fonts `@import`
- [x] Controlled input, masked characters, "ACCESS DENIED" shake on wrong password, retry with no lockout
- [x] Anchored to the screen-plane via drei's `<Html>` (billboard mode, not `transform` — `<Html transform>` produced broken off-screen CSS matrices in testing; billboard is fine since the locked-POV camera always looks ~straight at the screen by design). Verified visually: terminal renders centered inside the monitor's screen.
- [x] Visible "HINT: 1234" line + an explicit CONFIRM button alongside Enter-to-submit
- [x] All terminal strings translated (EN/ES/CA) via `src/i18n.ts` — see Checkpoint 5
- [x] Right password → proceeds to Checkpoint 4

**Definition of done:** the terminal visually sits inside the monitor's screen, not floating over the whole page; wrong password shows a clear rejection; right password proceeds. Verified end-to-end in-browser.

## ✅ Checkpoint 4 — Success transition + portfolio embedded in the screen (done, exit transition still open)

**Goal:** correct password makes the live portfolio appear *inside the computer's screen*, camera/desk staying visible around it — not a full-page redirect or full-page iframe (see ARCHITECTURE.md, this supersedes the original real-navigation plan).

- [ ] Exit transition on success (brief screen flash/glitch on the screen-plane) — not yet implemented
- [x] `<iframe src={PORTFOLIO_URL}>` sized to the screen-plane's `<Html>` anchor (same anchor the password terminal uses), not full-page
- [x] URL is environment-driven (`VITE_PORTFOLIO_URL`, falls back to the live Vercel URL)
- [x] Confirmed: the portfolio's language-select splash screen renders legibly at the monitor-rectangle embed size — verified in-browser with the real password flow (typed 1234, saw the live portfolio's "ELIGE IDIOMA / SELECT LANGUAGE" screen render inside the monitor)

**Definition of done:** full flow works end-to-end — click computer → fly in → hover/click glow → type real password → portfolio renders live inside the monitor's screen while the 3D scene stays visible around it. Verified end-to-end in-browser.

## Checkpoint 5 — Polish, fallback, deploy (mostly done)

**Goal:** production-ready.

- [x] Loading state for assets — `src/LanguageGate.tsx` doubles as the loader, tracking real progress via drei's `useProgress()` (same loading manager `useGLTF` reports into), gating entry until both a language is picked and load hits 100%
- [ ] Mobile/low-end fallback per the open decision in ARCHITECTURE.md (skip 3D entirely on detected low-end/no-WebGL, or accept desktop-only — confirm with Alejandro which)
- [ ] Performance pass: check frame rate with the final model + effects on a mid-range machine, not just dev hardware
- [ ] Swap procedural placeholder for Alejandro's real model, if/when delivered
- [x] git init this repo, pushed to its own GitHub repo (`github.com/Nemestria/3d-gateway`)
- [x] Vercel project linked (`nemestria-world/3d-gateway`), auto-deploys on every push to `master`
- [ ] Decide & wire the final redirect URL (custom domain question from ARCHITECTURE.md, if relevant by this point)
- [x] Internationalization: EN/ES/CA via `src/i18n.ts`, covering every piece of app-owned UI text (not the embedded portfolio's own separate language selector)
- [x] Vintage CRT look, page-wide: barrel/fisheye lens distortion (3D-canvas-only, `src/PostFX.tsx`) + chromatic aberration/scanlines/vignette (whole page incl. DOM and the embedded iframe, `src/CrtOverlay.tsx`), one settings-button toggle for both, persisted in `localStorage` — see ARCHITECTURE.md "Post-processing"
- [x] Fixed a floor/grid z-fighting flicker by replacing the old two-plane floor+grid with a single textured `OfficeFloor` mesh — see ARCHITECTURE.md "Floor"

**Still open:** mobile/low-end fallback, a real performance pass, swapping in Alejandro's real model, and the final domain/URL decision.

**Definition of done:** live URL, works on a phone (either the full experience or the agreed fallback), the click-to-portfolio flow is publicly testable.
