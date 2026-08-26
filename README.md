# 3D Gateway — Alejandro Sancho

A 3D entry experience: a computer sits in a rendered scene. Click it, the camera flies into a first-person view of the screen (wide-angle FOV ramp + chromatic aberration), a retro terminal password prompt appears, and on success the visitor is taken to [Alejandro Sancho's portfolio](../mainRepo) — the Y2K desktop-OS site.

**This is a separate project from the portfolio**, on purpose — see [ARCHITECTURE.md](ARCHITECTURE.md) for why and how the two connect.

## Status

Scaffolded, not yet built. See [CHECKPOINTS.md](CHECKPOINTS.md) for the build order — work through them in sequence, each one should be independently demoable before moving to the next.

## Stack

- Vite + React 19 + TypeScript
- `@react-three/fiber` (React renderer for Three.js)
- `@react-three/drei` (helpers: loaders, controls, etc.)
- `@react-three/postprocessing` + `postprocessing` (chromatic aberration, vignette, bloom)
- `three` (core 3D engine)

All already installed — `pnpm install` to get started.

## Dev

```bash
pnpm install
pnpm dev      # http://localhost:5173 (or next free port)
pnpm build
```

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — the technical plan, stack reasoning, how this connects to the portfolio, open decisions
- [CHECKPOINTS.md](CHECKPOINTS.md) — phased build order with definition-of-done per phase
- [DESIGN.md](DESIGN.md) — visual spec for the 3D scene + password terminal, ties back to the portfolio's existing Y2K design language
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md) — third-party asset credits and their licence terms (some require attribution; the app mirrors this list behind its CREDITS button)
- [../mainRepo/CLAUDE.md](../mainRepo/CLAUDE.md) — working instructions for the portfolio project (the destination of this gateway)

## Relationship to the portfolio

The portfolio (`../mainRepo`) is the **finished, deployed, functional site** — https://portfolio-ashen-sigma-63gx2gi92g.vercel.app. This project does not modify it. On a correct password, this gateway navigates the browser to that URL (real navigation, not an iframe or embed — see ARCHITECTURE.md for why).
