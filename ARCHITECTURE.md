# Architecture & Plan

## The pitch

1. 3D scene loads: a computer sits on a desk, establishing shot.
2. Visitor clicks the computer.
3. Camera flies from the establishing shot into a first-person view of the screen — FOV widens during the flight (fisheye/wide-angle feel), chromatic aberration kicks in (post-processing).
4. Once "inside" the screen, an HTML overlay appears: a retro terminal password prompt.
5. Visitor types a password. Wrong → shake/glitch, try again. Right → exit transition (flash/glitch), then **real browser navigation** to the live portfolio.

## Two-project split — why, and how they connect

The portfolio (`../mainRepo`) is a finished, deployed, independently-functioning site. This project is deliberately **not** merged into it:

- **Risk isolation.** The portfolio works today. Bolting an experimental 3D scene into its bundle risks breaking something that currently ships fine.
- **Bundle weight.** Three.js + react-three-fiber + postprocessing will roughly double-to-triple this project's JS payload on their own. The portfolio is currently ~227KB gzipped total — keeping that lean matters more than keeping these two experiences in one repo.
- **Independent iteration speed.** This project can be prototyped, broken, and rebuilt without touching `master` on the live portfolio.

### How they connect: portfolio embedded inside the in-scene screen (superseded decision)

**Revised.** The original plan below (real navigation, full-page redirect) is superseded by a diegetic requirement: the portfolio must visibly *live inside the computer's screen* in the 3D scene — camera stays in its close POV, monitor bezel and desk stay visible around the site, no page navigation away from the 3D view.

Implementation: an `<iframe src={PORTFOLIO_URL}>` sized and perspective-matched to the monitor's screen-plane mesh via drei's `<Html transform>` (same anchor the password terminal uses, see Checkpoint 3/4). Not a full-page iframe — it only fills the on-screen screen rectangle.

This intentionally reintroduces the iframe approach the original plan rejected. The original objection (iframes fighting the portfolio's fullscreen draggable-window UI) still applies if this iframe were full-page — it isn't; it's a small windowed embed, so that failure mode doesn't apply here. Two things worth verifying once wired up: whether the portfolio's own splash/intro reads fine at monitor-rectangle size, and whether the portfolio requires a specific viewport minimum (its own desktop-only ~1024×768 target, per its CLAUDE.md) that a small in-screen iframe won't satisfy — see Checkpoint 4.

**Original plan (kept for history, no longer the chosen approach):**

```ts
window.location.href = "https://portfolio-ashen-sigma-63gx2gi92g.vercel.app";
```

| Approach | Verdict (original) | Why |
|---|---|---|
| Real navigation | ✅ (superseded) | Simple, robust, no iframe sizing headaches — but breaks the "site lives in the screen" requirement |
| iframe embed, full-page | ❌ | Fights the portfolio's own fullscreen draggable-window UI |
| iframe embed, screen-rectangle-only | ✅ (current) | Confined to monitor-screen size, camera/desk stay visible around it — matches the diegetic requirement, avoids the full-page failure mode |
| Monorepo, shared deploy | ❌ | Forces both stacks' dependencies together; defeats bundle-isolation goal |
| Mount portfolio's `<App/>` inside this repo | ❌ | Duplicating/npm-linking mainRepo's App.tsx, fonts, assets — high maintenance for no benefit over an iframe |

**If a unified domain is wanted later**, that's a DNS/Vercel-routing concern, not a code-merging one.

## Stack

- **Vite + React 19 + TypeScript** — matches the portfolio's toolchain (consistency for whoever maintains both)
- **`@react-three/fiber`** — React renderer for Three.js, lets the scene be authored as JSX/components instead of imperative Three.js calls
- **`@react-three/drei`** — grab-bag of R3F helpers (model loaders, camera controls, `useGLTF`, etc.) — avoids reinventing common patterns
- **`@react-three/postprocessing`** (+ `postprocessing`) — chromatic aberration, vignette, bloom as composable effect passes

All four are already installed (`package.json`).

## The 3D computer model — resolved

`public/Computer.glb` and `public/Adjustable Desk.glb` are in use (loaded via `useGLTF` in `Scene.tsx`). Free/CC-style assets, not yet Alejandro's own Blender export — swappable later without touching camera/postprocessing/password code, per the original plan below.

<details>
<summary>Original options considered (for history)</summary>

1. Alejandro models it himself in Blender, exports glTF/GLB — best quality, his own timeline.
2. Build it from primitives in code — fully code-driven, no licensing question, less polished.
3. Free/CC asset from Sketchfab or similar — fastest, generic, license-check obligation. **This is the option currently in use.**

</details>

## Camera model — locked POV, not free orbit

**Revised.** The visitor is not an orbiting inspector — they're a POV in the room. At every phase (establishing shot and arrived/close shot):

- Drag (left-click) rotates yaw/pitch within a clamped range — can look around a bit, cannot spin to see all angles or fly around the room.
- Mouse near the viewport edge nudges a small look-offset (subtle parallax), independent of drag.
- Zoom is clamped to a tight range — a little push in/out, not free dolly.
- Once "arrived" (close POV on the screen), the clamp tightens further — mostly forced to look at the screen, small nudge room only.

This replaces the earlier plan of drei's free `<CameraControls>`/`<OrbitControls>` for dev/debug — those are gone now, not just disabled, since the locked-POV behavior is core to the experience, not a debug convenience.

## Camera fly-in

- Camera path: lerp/slerp position + lookAt target from the establishing shot to the close POV in front of the screen-plane (see below), driven by `useFrame` with an eased progress value (0→1).
- Wide-angle effect: ramp the camera's `fov` property up during the back half of the flight (e.g. 50° → 90°+) — cheap, no extra geometry needed, reads immediately as "uncomfortably close to a CRT."
- Trigger: raycast click on the computer mesh (`onClick` works directly on R3F mesh JSX) starts the animation; lock further clicks until it completes or the password screen exits.

## Screen-plane (hover glow + HTML/iframe anchor)

`Computer.glb`'s `Monitor` mesh is a single mesh/material — no separate screen face to key material changes off. Fix: an extra plane mesh (`ScreenPlane` in `src/Scene.tsx`), authored in code, not nested in the GLB or in Computer's auto-fit group (nesting it there fed back into the auto-fit bounding-box calc and broke the model's scale — see the git history for that detour). Instead it's a standalone top-level object positioned/rotated using the world-space anchor in `src/screenAnchor.ts`, which was derived by sampling `Computer.glb`'s own NORMAL accessor for its dominant front face and applying the live matrixWorld — not guessed.

This plane serves two jobs:
1. **Hover glow** — `onPointerOver`/`onPointerOut` (on the Computer body or the plane itself) toggles this plane's emissive intensity (screen lights up on hover, off on hover-out).
2. **HTML anchor** — drei's `<Html>` in **billboard mode** (no `transform` prop) attached at this plane's position, used for both the password terminal (Checkpoint 3) and the embedded portfolio iframe (Checkpoint 4). `<Html transform occlude>` was tried first but produced broken/off-screen CSS matrices in testing; billboard mode is a reasonable simplification here since the locked-POV camera (see above) always looks nearly straight at the screen by design, so there's no real perspective skew to correct for.

## Post-processing — split between the 3D canvas and the whole page

**Revised.** The original plan below (a single `EffectComposer` with all the CRT effects, ramped with flight progress) is superseded: the visitor asked for the vintage look to cover *everything on screen*, not just the 3D canvas — including the plain DOM buttons, `LanguageGate`, and the embedded portfolio iframe once unlocked. `EffectComposer` only post-processes the WebGL canvas's own pixels, so it can't reach any of that.

The effect is split by what's actually possible for each part:

- **`src/PostFX.tsx`** — `@react-three/postprocessing`'s `<EffectComposer>` with only `LensDistortionEffect` (barrel/fisheye warp). This stays 3D-only on purpose: geometrically warping arbitrary DOM (and a cross-origin iframe) isn't practical the way warping 3D geometry is. `LensDistortionEffect` isn't one of the effect classes the library ships a JSX wrapper for, so it's wrapped manually with the library's own `wrapEffect()` helper — the same technique `@react-three/postprocessing` uses internally for its built-ins.
- **`src/CrtOverlay.tsx`** — chromatic aberration (a hand-written SVG `<filter>`, referenced via CSS `filter: url(#crt-aberration)` on the root wrapper in `App.tsx`) plus scanlines/vignette (a `position: fixed` CSS layer on top of everything). CSS `filter` operates at the compositing stage, so it affects the 3D canvas, the DOM overlays, *and* the cross-origin portfolio iframe exactly the same way — unlike reading the iframe's pixels into a `<canvas>` (which CORS would block), a purely visual filter isn't restricted by cross-origin rules.

Both halves are driven by one `fxEnabled` boolean in `App.tsx` (a settings button, top-right, persisted in `localStorage`) — toggling it off unmounts `<PostFX>` and skips rendering `<CrtOverlay>`/applying the CSS filter, rather than tracking separate enabled state per effect.

**Original plan (kept for history, no longer accurate):** a flight-progress-ramped `ChromaticAberration`/`Vignette`/`Noise` all living inside one canvas-only `EffectComposer`. The ramping-with-flight-progress idea was never implemented — the current version is a flat toggle, not dynamic — revisit DESIGN.md's camera-language section if that dynamic feel is wanted later.

## Floor

The floor used to be two overlapping planes — a solid `meshStandardMaterial` plane and drei's `<Grid>` component, offset by only 0.002 world units — which z-fought (flickered) at distance, since depth-buffer precision drops off the further a fragment is from the camera in a perspective projection. Fixed by replacing both with a single mesh (`OfficeFloor` in `src/Scene.tsx`) using one procedurally-generated repeating-tile `CanvasTexture` (grout color filled full, tile face inset a few px, `RepeatWrapping` at a high repeat count for office-tile-scale squares — see the component's own comment for the exact numbers). One plane means there's nothing left to fight. Don't reintroduce a second coplanar (or near-coplanar) ground plane without a much larger separation, or the flicker comes back.

## Internationalization (EN/ES/CA)

`src/i18n.ts` exports a `Lang` union (`"en" | "es" | "ca"`) and a `translations` record keyed by that union, covering every piece of app-owned UI text (back button, password terminal strings, the welcome sign, the language-gate/loading copy, the effects-toggle label). Components take a `t`/`text` prop rather than importing the dictionary themselves, so translation is just editing `i18n.ts` — no component code needs to change for wording tweaks.

`src/LanguageGate.tsx` blocks entry until a language is picked, and doubles as the loading screen: it reads real progress via drei's `useProgress()` (the same `THREE.DefaultLoadingManager` `useGLTF` reports into), so "done loading" isn't faked. It only resolves (calling `onDone`, which sets `App.tsx`'s `lang` state) once *both* a language is chosen and load progress hits 100%.

**Now wired to the embedded portfolio's language.** The chosen `Lang` is passed as `?lang=es|en|ca` on the iframe `src` (see `portfolioUrl()` in `src/App.tsx`) — the portfolio's `App.tsx` reads it (`URL_LANG`) and uses it as the initial language, skipping its own splash language-picker step. localStorage can't carry this across origins (gateway and portfolio are separate Vercel deployments with separate storage), so the URL param is the only inheritance channel; if no `lang` param is present (portfolio visited directly, not through the gateway), it falls back to its own remembered choice or the language-select splash as before.

## Password terminal

Once the camera flight finishes, fade in an **HTML overlay anchored to the screen-plane** (via drei `<Html>` billboard mode, see above — not a full-page overlay, not a 3D-rendered texture):
- Reuse `Press Start 2P` / `Share Tech Mono` (match `../mainRepo`'s `PX`/`MONO` constants) for visual continuity between the two projects
- Plain controlled `<input>`, styled like a BIOS/terminal prompt (blinking cursor, echoed or asterisked characters — pick one, asterisks reads more "password," plain echo reads more "terminal")
- A dim "HINT: 1234" line under the input — same energy as the in-scene note prop, just also visible right at the point of entry
- An explicit CONFIRM button (`type="submit"` inside the `<form>`, so it shares the exact same submit handler pressing Enter already uses) alongside Enter-to-submit, for anyone who doesn't think to hit Enter
- Wrong password: shake animation + "ACCESS DENIED" message, clear input, don't lock out (no rate limiting — this is a portfolio gimmick, not real auth). Note: the shake keyframes set `transform` directly, so if the terminal box ever gets a `transform: scale(...)` (it currently does, scaled down ~40% from its original size), the keyframes need that same scale folded into every step or the shake will flash the box back to full size — see the keyframes in `PasswordTerminal.tsx`.

**This is not real security.** The password is a hardcoded string checked client-side. Anyone can read it in devtools or view-source the bundle. That's fine and expected — it's a theatrical gate, not an access-control system. Don't build backend validation, rate limiting, or anything implying real auth; that would be wasted effort and wrong framing for a portfolio piece.

## In-scene note prop

A small paper/plane mesh near the desk, rendered with "1234" on it (canvas texture or drei `<Text>`) — the in-scene justification for the password, a discoverable hint rather than pure backstory.

## Welcome sign

A one-time greeting (`WelcomeSign` in `src/Scene.tsx`), positioned off to the left of the room, visible only from the establishing shot. Dismisses on whichever comes first: 15 seconds, or the visitor clicking into a station for the first time (`Scene`'s `signDismissed` state + `showWelcome` prop, the latter gated on the language gate having resolved in `App.tsx` — the sign shouldn't run its countdown or appear while the visitor is still picking a language).

It renders as drei's `<Html>` in billboard mode (plain CSS text, `Boldonse` from Google Fonts via `index.css`'s `@import`) wrapped in a `<Billboard>` so it always faces the camera — **not** troika's SDF `<Text>` (used elsewhere for the note prop). Text was tried first; fetching a custom font file for it (both a remote `.woff` and a self-hosted same-origin `.ttf`) silently never resolved — no thrown error, no visible network request from the font-loading worker, just permanently invisible geometry. Given `<Html>`-with-CSS-fonts already works reliably everywhere else in this app, that's the path this component uses instead of continuing to debug troika's worker-based font loader.

## Open decisions (need Alejandro's input before/while building)

1. ~~Model source~~ — resolved, see above.
2. ~~The password itself~~ — resolved: `1234`, justified in-scene by the note prop above (deliberately simple/jokey rather than a "real" secret — matches "not real security").
3. ~~Mobile fallback~~ — resolved: a `matchMedia("(max-width: 768px)")` check in `src/App.tsx` skips the 3D experience entirely on phones and does a real `window.location.replace()` straight to the portfolio (no 3D flight, no password gate, no in-screen iframe — there's no monitor screen-plane to embed into if the scene never mounts). `DesktopApp.tsx` (the 3D experience, GLB models, password terminal, etc.) is `React.lazy`-loaded from a separate module so mobile visitors never even download it — a static top-level import would still trigger `Scene.tsx`'s module-level `useGLTF.preload(...)` regardless of whether it renders.
4. **Domain/URL wiring** — redirect target is currently the Vercel preview URL, now embedded via iframe rather than full navigation (see "How they connect" above); decide later if a custom domain unifies both projects. **Still open.**
5. ~~Loading state~~ — resolved: `LanguageGate` doubles as the loading screen, see "Internationalization" above.
6. ~~Language(s)~~ — resolved: English/Spanish/Catalan via `src/i18n.ts`, see "Internationalization" above. Also now synced with the embedded portfolio via the `?lang=` URL param.
