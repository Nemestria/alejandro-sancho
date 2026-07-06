// Env-driven so local testing doesn't require hardcoding the prod URL —
// see CHECKPOINTS.md Checkpoint 4. Shared by App.tsx (mobile redirect) and
// DesktopApp.tsx (in-screen iframe embed) — kept in its own module so App.tsx
// doesn't need to import DesktopApp's (GLB-preloading) dependency graph just
// to read this constant.
export const PORTFOLIO_BASE_URL =
  import.meta.env.VITE_PORTFOLIO_URL ??
  "https://portfolio-ashen-sigma-63gx2gi92g.vercel.app";
