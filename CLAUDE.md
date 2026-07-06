# Claude Working Instructions

## Project
3D entry experience for Alejandro Sancho's portfolio — a computer in a 3D scene, click it, camera flies into a locked-POV first-person screen view (wide-angle + chromatic aberration), a retro terminal password prompt appears anchored to the screen, correct password embeds the live portfolio inside that same screen rectangle. A language-select screen (EN/ES/CA) gates entry and doubles as the asset loader; a page-wide vintage CRT filter (toggleable) covers everything, not just the 3D canvas.

**Separate project from the portfolio on purpose** — see [ARCHITECTURE.md](ARCHITECTURE.md) for the reasoning. Don't merge this into `../mainRepo`. On success this app embeds the portfolio via an iframe sized to the monitor's screen-plane — **not** a full-page redirect (that was the original plan; superseded, see ARCHITECTURE.md "How they connect").

## Dev Setup
```bash
pnpm install
pnpm dev
pnpm build
```

## Before Starting
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) — stack, the two-project split, the model-source decision, open questions
2. Read [CHECKPOINTS.md](CHECKPOINTS.md) — **work through these in order, don't skip ahead.** Checkpoints 0-4 done; Checkpoint 5 (polish/deploy) mostly done, see its checklist for what's still open.
3. Read [DESIGN.md](DESIGN.md) — visual spec, what to reuse from the portfolio's design language

## Key Files
- `src/App.tsx` — thin shell: mobile detection (`matchMedia`, see "Mobile fallback" below) and `React.lazy`-loads `DesktopApp.tsx`. Keep this file free of any Scene/Canvas/GLTF imports — a static import here would defeat the lazy-load and download the 3D bundle on phones anyway
- `src/DesktopApp.tsx` — the actual experience: top-level phase state (`idle`/`flying`/`arrived`/`returning`), mounts `<Canvas>`, renders the screen-anchored password terminal and embedded portfolio iframe once unlocked, wraps everything in the CRT filter + settings toggle, gates the whole page behind `LanguageGate` until a language is chosen
- `src/portfolioUrl.ts` — the portfolio's base URL (`VITE_PORTFOLIO_URL` env, falls back to the live Vercel URL); split out of `DesktopApp.tsx` so `App.tsx`'s mobile-redirect path doesn't need to import the heavy module to read it
- `src/Scene.tsx` — desk/computer GLB models, `OfficeFloor` (single-mesh procedural tile texture — do not reintroduce a separate grid plane, see ARCHITECTURE.md "Floor"), note prop, `WelcomeSign` (dismisses on first station-entry or after 15s), `ScreenPlane` (hover glow + Html anchor target)
- `src/CameraRig.tsx` — locked-POV camera controls + fly-in animation
- `src/screenAnchor.ts` — shared world-space position/normal/size for the monitor's screen-plane, used by both `CameraRig` (close-shot framing) and `Scene` (the anchor itself), so they can't drift apart
- `src/PasswordTerminal.tsx` — password UI (hint + explicit CONFIRM button alongside Enter-to-submit), rendered via drei `<Html>` (billboard mode) anchored to the screen-plane, all strings passed in via the `t` translation prop
- `src/i18n.ts` — `Lang` type (`en`/`es`/`ca`) + the `translations` dictionary; this is the one file to edit for wording/translation changes, see ARCHITECTURE.md "Internationalization"
- `src/LanguageGate.tsx` — language-select screen shown before anything else; also the loading screen (tracks real asset-load progress via drei's `useProgress`, same loading manager `useGLTF` uses)
- `src/PostFX.tsx` — 3D-scene-only barrel/fisheye lens distortion (`@react-three/postprocessing`'s `EffectComposer`)
- `src/CrtOverlay.tsx` — page-wide chromatic aberration (SVG filter) + scanlines/vignette (CSS layer), applied to everything in `App.tsx` including the embedded iframe — see ARCHITECTURE.md "Post-processing" for why this is split from `PostFX.tsx`
- `package.json` — `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing` already installed

## Conventions (carried over from the portfolio, keep consistent)
- pnpm, not npm/yarn
- TypeScript throughout
- Commit message: scope + what + why
- Don't autoplay audio without an explicit opt-in (matches `../mainRepo`'s splash screen pattern)
- The password is **not real security** — hardcoded client-side check is correct and sufficient, don't over-engineer auth

## Relationship to `../mainRepo` (the portfolio)
- Read-only reference, not a dependency — don't import code from it, don't add it as a workspace package
- Reuse its *design language* (fonts, color, tone) per DESIGN.md, by reading its source for reference, not by importing it
- The iframe embed target on password success is its live URL: https://portfolio-ashen-sigma-63gx2gi92g.vercel.app (or its local dev server during testing — see Checkpoint 4). It's embedded at monitor-screen size, not full-page.

## Testing
- Manual: `pnpm dev`, click through the full flow each checkpoint adds
- Check frame rate isn't tanking once real geometry/effects are in (no formal perf budget yet — use judgment, flag if a mid-range laptop chugs)
- No unit tests planned — this is a short, visual, interaction-heavy experience; manual testing is the right tool here

## Current State
Checkpoints 0-4 done, Checkpoint 5 mostly done, all verified end-to-end in-browser and deployed live (auto-deploys from `master` via Vercel, see "Deploy" below):
- Static scene w/ real GLB models, `OfficeFloor`'s single-mesh tile texture (no more flickering grid+plane combo — see git history / ARCHITECTURE.md "Floor")
- Locked-POV camera rig (`src/CameraRig.tsx`)
- Hover-glow + screen-anchored password terminal (hint + CONFIRM button) + embedded portfolio iframe, all anchored to `ScreenPlane` (`src/Scene.tsx`, world-space anchor in `src/screenAnchor.ts`)
- In-scene note prop ("1234") and a one-time `WelcomeSign` (dismisses on first station-entry or after 15s)
- Language-select gate (EN/ES/CA, `src/LanguageGate.tsx`) that doubles as the asset-loading screen; all app UI text translated via `src/i18n.ts`
- Vintage CRT look: 3D-only barrel/fisheye lens distortion (`src/PostFX.tsx`) + page-wide chromatic aberration/scanlines/vignette (`src/CrtOverlay.tsx`), one settings toggle for both, persisted in `localStorage`

**Still open:** exit-transition flash on password success (Checkpoint 4), a real performance pass, swapping the placeholder model for Alejandro's own, and the domain/URL decision — see CHECKPOINTS.md Checkpoint 5 for the full list.

## Deploy
This repo (`github.com/Nemestria/alejandro-sancho`, renamed from `3d-gateway`) is linked to a Vercel project of the same name (`nemestria-world/alejandro-sancho`, live at `alejandro-sancho.vercel.app`) that auto-deploys on every push to `master` — no manual `vercel --prod` needed. `vercel ls` (CLI already authenticated in this environment) shows recent deployments if you need to confirm a push went live.
