import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrthographicCamera, Text } from "@react-three/drei";
import { MathUtils, type Group } from "three";
import type { ArcadeLab } from "./arcadeLabs";

// The arcade screen's contents — mounted inside drei's <RenderTexture>
// portal (see Scene.tsx's Arcade), so everything here renders into the
// off-screen target that the screen mesh wears as its texture. Genuine 3D
// content, not DOM: this whole component draws in its own isolated scene
// with its own camera, per the render-to-texture plan.
//
// Layout is the requested 4-quadrant split: left half (full height) is the
// game-select list, top-right the preview, bottom-right the description.
// Coordinates are in the ortho camera's units: the visible square spans
// -FX..FX horizontally and -FY..FY vertically. FX is the master "zoom"
// dial — raising it renders everything smaller with more margin (it was 5
// originally; content read too big on the actual cabinet); FY follows it
// through the glass's aspect so nothing distorts.
//
// Text uses troika's bundled default font on purpose — custom font files
// silently fail to load through troika in this codebase (see Scene.tsx's
// WelcomeSign note); the default is the one path known to work.

const ACCENT = "#00e5ec";
const DIM = "#2e6b6d";
const TEXT_DIM = "#9fd8d8";
const BG = "#031012";

// Ortho half-extents — bigger = smaller content. Horizontal and vertical
// differ by the glass's physical aspect (screen face ≈1.17:1, from the
// GLB's ArcadeScreen bounds), so content authored here lands undistorted
// after the square render target stretches onto the wider-than-tall face.
const SCREEN_FACE_ASPECT = 1.17;
const FX = 6.8;
const FY = FX / SCREEN_FACE_ASPECT; // ≈5.8
const ROW_H = 0.95;
const LIST_X = -5.9; // left edge of list text
const SELECTED_ROW_Y = 0.9; // world-y where the selected row rests
const DIVIDER_X = 0.1; // vertical split between list and preview/description
const RIGHT_CENTER_X = (DIVIDER_X + FX) / 2;

export default function ArcadeMenuScene({
  labs,
  selectedIndex,
  menuHint,
}: {
  labs: ArcadeLab[];
  selectedIndex: number;
  menuHint: string;
}) {
  const listRef = useRef<Group>(null);

  // Scroll the list so the selected row eases toward SELECTED_ROW_Y —
  // same damp-toward-target convention as CameraRig, no tween library.
  useFrame((_, delta) => {
    if (!listRef.current) return;
    const target = SELECTED_ROW_Y + selectedIndex * ROW_H;
    listRef.current.position.y = MathUtils.damp(listRef.current.position.y, target, 8, delta);
  });

  const selected = labs[selectedIndex];

  return (
    <>
      <color attach="background" args={[BG]} />
      <OrthographicCamera makeDefault manual left={-FX} right={FX} top={FY} bottom={-FY} near={0.1} far={20} position={[0, 0, 10]} />

      {/* Quadrant dividers */}
      <mesh position={[DIVIDER_X, 0, 0]}>
        <planeGeometry args={[0.03, FY * 2]} />
        <meshBasicMaterial color={DIM} />
      </mesh>
      <mesh position={[RIGHT_CENTER_X, -0.5, 0]}>
        <planeGeometry args={[FX - DIVIDER_X, 0.03]} />
        <meshBasicMaterial color={DIM} />
      </mesh>

      {/* Header */}
      <Text position={[LIST_X, FY - 0.9, 0]} fontSize={0.34} color={ACCENT} anchorX="left" anchorY="middle" letterSpacing={0.15}>
        ALEJANDRO://LABS
      </Text>
      <Text position={[LIST_X, FY - 1.45, 0]} fontSize={0.2} color={DIM} anchorX="left" anchorY="middle" letterSpacing={0.1}>
        {menuHint}
      </Text>

      {/* Left half — scrolling game-select list. Clipped visually by the
          screen edge; rows scrolled past the header just overlap dividers
          slightly, acceptable for v1. */}
      <group ref={listRef}>
        {labs.map((lab, i) => {
          const isSel = i === selectedIndex;
          return (
            <group key={lab.id} position={[0, -i * ROW_H, 0]}>
              {isSel && (
                <mesh position={[(LIST_X + DIVIDER_X) / 2 - 0.1, 0, -0.01]}>
                  <planeGeometry args={[DIVIDER_X - LIST_X + 0.4, 0.72]} />
                  <meshBasicMaterial color={ACCENT} transparent opacity={0.14} />
                </mesh>
              )}
              <Text
                position={[LIST_X, 0, 0]}
                fontSize={isSel ? 0.4 : 0.34}
                color={isSel ? ACCENT : TEXT_DIM}
                anchorX="left"
                anchorY="middle"
                letterSpacing={0.06}
              >
                {(isSel ? "▶ " : "  ") + lab.title}
              </Text>
            </group>
          );
        })}
      </group>

      {/* Top-right — preview (solid color plane standing in for art) */}
      <mesh position={[RIGHT_CENTER_X, 2.8, 0]}>
        <planeGeometry args={[5.2, 3.6]} />
        <meshBasicMaterial color={selected.previewColor} />
      </mesh>
      <Text position={[RIGHT_CENTER_X, 2.8, 0.01]} fontSize={0.28} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.2}>
        {selected.id.toUpperCase()}
      </Text>

      {/* Bottom-right — description */}
      <Text
        position={[DIVIDER_X + 0.6, -1.1, 0]}
        fontSize={0.3}
        color={TEXT_DIM}
        anchorX="left"
        anchorY="top"
        maxWidth={FX - DIVIDER_X - 1.2}
        lineHeight={1.5}
      >
        {selected.description}
      </Text>
    </>
  );
}
