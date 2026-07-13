// The arcade's game-select menu entries — each "game" is a future lab page.
// PLACEHOLDER CONTENT: titles/descriptions are stand-ins for Alejandro to
// replace (same personal-voice caveat as the portfolio's draft copy), and
// previewColor stands in for a real preview image (swap for a texture path
// once art exists). The selection mechanism doesn't care what these say.
export interface ArcadeLab {
  id: string;
  title: string;
  description: string;
  previewColor: string;
}

export const ARCADE_LABS: ArcadeLab[] = [
  {
    id: "shaders",
    title: "SHADER PLAYGROUND",
    description: "Real-time GLSL experiments — noise fields, CRT warps, procedural materials.",
    previewColor: "#0e7c74",
  },
  {
    id: "dioramas",
    title: "MICRO DIORAMAS",
    description: "Tiny 3D environment studies. One scene, one mood, no scope creep.",
    previewColor: "#7c3aed",
  },
  {
    id: "tools",
    title: "TOOL EXPERIMENTS",
    description: "Small utilities for 3D workflows — batch renamers, texture packers, viewers.",
    previewColor: "#b45309",
  },
  {
    id: "sketches",
    title: "CODE SKETCHES",
    description: "Generative art and animation toys. Pixels doing things pixels shouldn't.",
    previewColor: "#be185d",
  },
  {
    id: "graveyard",
    title: "THE GRAVEYARD",
    description: "Abandoned prototypes, kept honest. Every idea that didn't make it.",
    previewColor: "#374151",
  },
];
