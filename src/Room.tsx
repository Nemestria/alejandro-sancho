import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  Matrix4,
  Vector3,
  type BufferGeometry,
  type InstancedMesh as InstancedMeshType,
  type Material,
  type Mesh,
} from "three";

// The room the whole scene sits inside — floor, four walls, and a ceiling made
// from the floor's own tiles.
//
// Built in code from two single-tile GLBs rather than modelled as one room
// mesh. The tiles are 4-vertex quads, so a whole 16m room is a few hundred
// vertices; and a code-built room can be resized by changing one number here
// instead of re-exporting from Blender. Every tile of a given material is one
// InstancedMesh, so the entire room costs FOUR draw calls (floor, ceiling, and
// the wall's two materials) no matter how many tiles it contains.
//
// Wall art: "PSX Style Office Walls Pack" (https://skfb.ly/pspOz) by wooolvie,
// CC BY 4.0. See ATTRIBUTIONS.md — the credit is also shown in-app.

const GROUND_URL = "/GroundTile.glb";
const WALL_URL = "/WallTile.glb";

// Wall tiles are used slightly enlarged. This is not an arbitrary number: at
// 1.05 the wall stands 6.21m, which is the first height that clears BOTH spot
// lights, which hang at y=6. Sizing the room around the lighting that already
// works means none of it has to be re-tuned — a shorter room would have put
// the lights outside the ceiling, and pulling them down inside changes their
// distance to what they light, so every intensity would need re-deriving.
const WALL_SCALE = 1.05;

// 6 tiles a side. With the tile at 2.688m that is a 16.13m room, which holds
// everything with margin — see ENCLOSED below.
const TILES_PER_SIDE = 6;

// Centred on the action, not on the origin. The desk is at the origin and the
// cabinet at x=-2.6, but the establishing camera sits at (4, 3, 6), so the
// room has to reach much further in +z than -z to keep the camera indoors.
const ROOM_CENTER_X = 0;
const ROOM_CENTER_Z = 2;

// What the room has to contain, checked when the size constants change.
// (x, y, z) — all must fall inside the box the constants above describe.
//
//   establishing camera eye      ( 4.00, 3.00, 6.00)   CameraRig ESTABLISHED_EYE
//   desk spot light              ( 0.00, 6.00, 0.50)
//   arcade overhead spot         (-2.60, 6.00, 1.10)
//   arcade front fill            (-1.32, 2.60, 2.47)
//   arcade approach camera       (-0.76, 1.03, 3.30)   stations.ts
//   computer close camera        (-0.30, 1.86, 0.35)   stations.ts
//
// At the values above the room spans x [-8.06, 8.06], z [-6.06, 10.06],
// y [0, 6.21], so every one of those clears by at least 0.2m.

/**
 * Load a tile GLB and return its drawable parts with the node transforms baked
 * in and the whole thing moved so its minimum corner sits on the origin.
 *
 * Baking matters because these tiles do not arrive axis-aligned: the wall's
 * node carries a quaternion that maps local (x, y, z) to world (z, -x, -y) and
 * a 0.0128 scale, so its raw geometry is 460 units long and lying on its side.
 * Normalising here means the placement maths below is plain addition — and it
 * re-derives from the file every load, so a re-export with a different origin
 * or orientation still lands correctly.
 */
function useTile(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    scene.updateMatrixWorld(true);

    const parts: { geometry: BufferGeometry; material: Material }[] = [];
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const geometry = m.geometry.clone();
      geometry.applyMatrix4(m.matrixWorld);
      parts.push({ geometry, material: m.material as Material });
    });

    // One bounds for all parts together — the wall's trim and wallpaper are
    // separate primitives of a single tile and must not be normalised apart.
    const bounds = new Box3();
    parts.forEach((p) => {
      p.geometry.computeBoundingBox();
      bounds.union(p.geometry.boundingBox!);
    });

    const shift = new Matrix4().makeTranslation(-bounds.min.x, -bounds.min.y, -bounds.min.z);
    parts.forEach((p) => p.geometry.applyMatrix4(shift));

    const size = new Vector3();
    bounds.getSize(size);
    return { parts, size };
  }, [scene]);
}

/** One InstancedMesh per material, with the given placements. */
function Tiles({
  parts,
  matrices,
}: {
  parts: { geometry: BufferGeometry; material: Material }[];
  matrices: Matrix4[];
}) {
  return (
    <>
      {parts.map((part, i) => (
        <TileLayer key={i} part={part} matrices={matrices} />
      ))}
    </>
  );
}

function TileLayer({
  part,
  matrices,
}: {
  part: { geometry: BufferGeometry; material: Material };
  matrices: Matrix4[];
}) {
  const ref = useRef<InstancedMeshType>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    // Instanced geometry gets no automatic bounds, and without them the room
    // is frustum-culled against a single tile's box — so it vanishes the
    // moment that one tile leaves frame.
    mesh.computeBoundingSphere();
  }, [matrices]);

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, matrices.length]}
      receiveShadow
      // Nothing in the room should cast: the walls would shadow each other for
      // no visible gain, and the ceiling sits above both lights, so the only
      // effect would be to switch the room off.
      castShadow={false}
      // The room is scenery. Letting the raycaster walk a few hundred
      // instances on every pointer move, to hit a wall nobody can click, is
      // pure cost — and a wall between the cursor and the cabinet would
      // swallow the click.
      raycast={() => null}
    />
  );
}

export default function Room() {
  const ground = useTile(GROUND_URL);
  const wall = useTile(WALL_URL);

  const layout = useMemo(() => {
    const W = wall.size.x * WALL_SCALE;
    const H = wall.size.y * WALL_SCALE;
    const side = W * TILES_PER_SIDE;

    const x0 = ROOM_CENTER_X - side / 2;
    const z0 = ROOM_CENTER_Z - side / 2;
    const x1 = x0 + side;
    const z1 = z0 + side;

    const S = new Matrix4().makeScale(WALL_SCALE, WALL_SCALE, WALL_SCALE);
    const walls: Matrix4[] = [];

    // The tile's face points -Z once its node transform is baked, so each side
    // gets the rotation that turns that face inward. The extra tile-width in
    // the translations is because rotating about Y sweeps the tile to the far
    // side of its own origin.
    const rotY = (a: number) => new Matrix4().makeRotationY(a);
    for (let i = 0; i < TILES_PER_SIDE; i++) {
      const along = i * W;
      // Far wall (+z), already facing inward.
      walls.push(new Matrix4().makeTranslation(x0 + along, 0, z1).multiply(S));
      // Near wall (-z), turned to face +z.
      walls.push(
        new Matrix4()
          .makeTranslation(x0 + along + W, 0, z0)
          .multiply(rotY(Math.PI))
          .multiply(S),
      );
      // Right wall (+x), facing -x.
      walls.push(
        new Matrix4()
          .makeTranslation(x1, 0, z0 + along + W)
          .multiply(rotY(Math.PI / 2))
          .multiply(S),
      );
      // Left wall (-x), facing +x.
      walls.push(
        new Matrix4()
          .makeTranslation(x0, 0, z0 + along)
          .multiply(rotY(-Math.PI / 2))
          .multiply(S),
      );
    }

    // Floor and ceiling are laid on their own grid, sized to overshoot the
    // walls by about a tile. The overshoot is hidden behind them, and it means
    // the floor grid never has to divide evenly into the wall grid.
    const gw = ground.size.x;
    const gd = ground.size.z;
    const cols = Math.ceil(side / gw) + 1;
    const rows = Math.ceil(side / gd) + 1;
    const gx0 = ROOM_CENTER_X - (cols * gw) / 2;
    const gz0 = ROOM_CENTER_Z - (rows * gd) / 2;

    const floor: Matrix4[] = [];
    const ceiling: Matrix4[] = [];
    // Turned over rather than scaled by -1 on Y: a negative scale gives the
    // matrix a negative determinant, which inverts the winding and leaves the
    // lighting reading off a back face. A half-turn about X keeps it a proper
    // rotation and points the normal honestly downwards.
    const flip = new Matrix4().makeRotationX(Math.PI);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = gx0 + i * gw;
        const z = gz0 + j * gd;
        floor.push(new Matrix4().makeTranslation(x, 0, z));
        ceiling.push(new Matrix4().makeTranslation(x, H, z + gd).multiply(flip));
      }
    }

    return { walls, floor, ceiling };
  }, [ground.size, wall.size]);

  return (
    <group>
      <Tiles parts={ground.parts} matrices={layout.floor} />
      <Tiles parts={ground.parts} matrices={layout.ceiling} />
      <Tiles parts={wall.parts} matrices={layout.walls} />
    </group>
  );
}

useGLTF.preload(GROUND_URL);
useGLTF.preload(WALL_URL);
