# Design Spec — 3D Gateway

This experience should feel like a **prologue** to the portfolio, not a disconnected piece. The portfolio (`../mainRepo`) is deliberately flat, Y2K-desktop-OS styled, sincere-not-ironic retro (see `../mainRepo/RETRO_GUIDELINES.md`). This 3D scene is the one place allowed to break that flatness — it's "before you're inside the OS," a physical CRT in a room — but the **password terminal** and **transition moment** should visually rhyme with what's on the other side of the door.

## The Scene (3D)

- **Subject:** a single computer (CRT monitor + keyboard, era-appropriate — late-90s/early-2000s beige/two-tone plastic, not a modern flat-screen) on a desk, roughly centered.
- **Lighting:** simple — ambient fill + one directional/point light. Don't over-light; a slightly moody, single-light-source room reads better for the "flying into a screen" moment than a fully lit showroom.
- **Materials:** flat/matte, no glossy PBR showroom look — this should feel consistent with the portfolio's "no gradients except title bars, no drop shadows" rule even in 3D. A CRT does have *some* sheen on the glass — fine to keep that one highlight, but keep the plastic body matte.
- **Environment:** doesn't need to be an elaborate room. A desk + the computer + maybe a wall plane behind for the establishing shot is enough. Resist over-building a full 3D room — the experience is about the computer, not the room.

## Camera Language

- **Establishing shot:** normal FOV (~50°), computer roughly centered, slight elevation/angle (not a flat front-on shot — give it some perspective).
- **Fly-in:** FOV widens progressively — by the time the camera "arrives" near the screen it should feel like a fisheye lens pressed close to glass (~90°+). This is the core "wide-angle" requirement from the brief.
- **Chromatic aberration:** near-zero at rest, ramps up through the fly-in, settles to a low ambient amount once arrived (not zero — a constant faint aberration while "inside" the screen sells the CRT-proximity feeling without being distracting during password entry). **As shipped:** this is currently a flat, page-wide toggleable filter (on/off, no flight-progress ramp) rather than the dynamic version described above — it also needed to cover the DOM/iframe, not just the 3D canvas, which is why it lives outside the camera-flight code. See ARCHITECTURE.md "Post-processing." Revisit the ramped version above if the static toggle ever feels too flat.
- **No camera shake/wobble** during the flight — smooth eased interpolation only. Shake is reserved for the wrong-password feedback (see below), so it stays meaningful when it happens.

## Password Terminal (HTML overlay)

This is the bridge moment — it should look like it could be a window *inside* the portfolio, so the transition from "3D scene" to "Y2K desktop OS" doesn't feel like two unrelated projects stapled together.

**Reuse directly from the portfolio:**
- Fonts: `Press Start 2P` (labels/prompt chrome) and `Share Tech Mono` (input text, metadata) — same constants pattern as `../mainRepo/src/app/App.tsx`'s `PX`/`MONO`
- Color language: dark terminal background, single accent color for the cursor/prompt (cyan reads as the most "Y2K CRT" choice, and happens to match the portfolio's default Y2K palette accent `#00b9be` — use that unless there's a reason not to)
- Retro UI tells: blinking cursor, monospace echo, ALL-CAPS prompt labels (`ENTER PASSWORD:`, `ACCESS DENIED`) — same "metadata-forward, technical but earnest" tone as `../mainRepo/RETRO_GUIDELINES.md`'s content-tone section

**Character display:** asterisks (`****`) reads more "password prompt," plain echoed text reads more "terminal command." Recommend asterisks — most visitors will read "password" faster than parsing a terminal-echo convention, and BIOS/login-screen prompts (the most common 2000s reference point) mask input.

**Wrong password feedback:** short horizontal shake (CSS `translateX` keyframe, ~0.3s) + a one-line `ACCESS DENIED` message in the error/red accent color, then clear the input. No lockout, no attempt counter — friction should be momentary, not punishing.

**Right password feedback:** brief glitch/flash (a couple frames of scanline-tear or color-channel-split effect, reusing the chromatic aberration pass at a spiked intensity reads as "the screen is breaking through") then navigate.

## What NOT to do

- No skeuomorphic over-detailing (dust, scratches, cable clutter) — matches the portfolio's "no anachronism, no over-polish" principle, just inverted: here the rule is "no over-texture," not "no modern minimalism."
- No looping ambient sound/music in the 3D scene without an explicit opt-in choice, same rule the portfolio already follows on its own splash screen (`../mainRepo/src/app/App.tsx`'s `SplashScreen` — never autoplay audio without the visitor choosing it first).
- No real loading-bar dishonesty (i.e. don't fake a progress bar that doesn't track real asset load — the portfolio's splash bar is a deliberate stylistic fake-load animation, but a 3D scene with real GLTF/texture loads should show *real* progress once a non-trivial model is in use, so don't carry that particular trick over uncritically).
