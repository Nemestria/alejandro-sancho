import { useMemo } from "react";
import { useGLTF, OrbitControls, Grid } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { FlightPhase } from "./CameraRig";

function Desk() {
  const { scene } = useGLTF("/Adjustable Desk.glb");
  return <primitive object={scene} position={[0, 0, 0]} scale={1.4} rotation={[0, -Math.PI, 0]} />;
}

function Computer({ onClick }: { onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const { scene } = useGLTF("/Computer.glb");

  // Desk top is roughly y=0.75 (placeholder Adjustable Desk.glb) — auto-fit
  // the computer's own bounding box onto that surface instead of guessing
  // a hardcoded scale/position per model.
  const deskTopY = 0.75 * 1.4 + 0.27; // matches Desk's scale={1.4}, nudged up onto the surface

  const rotationY = Math.PI / 2 - Math.PI;

  const { scale, position } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    const targetHeight = 0.9;
    const s = size.y > 0 ? targetHeight / size.y : 1;
    const center = new Vector3();
    box.getCenter(center);
    // Center offset must be rotated to match the model's applied Y rotation,
    // since position is applied in world axes after rotation swaps x/z.
    const rotatedCenter = center
      .clone()
      .applyAxisAngle(new Vector3(0, 1, 0), rotationY);
    return {
      scale: s,
      position: [
        -rotatedCenter.x * s,
        deskTopY - box.min.y * s,
        -rotatedCenter.z * s,
      ] as [number, number, number],
    };
  }, [scene, deskTopY, rotationY]);

  return (
    <primitive
      object={scene}
      scale={scale}
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick(e);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    />
  );
}

export default function Scene({
  phase,
  onComputerClick,
}: {
  phase: FlightPhase;
  onComputerClick: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 8, 30]} />

      <ambientLight intensity={0.08} />
      <spotLight
        position={[0, 6, 0.5]}
        angle={0.35}
        penumbra={0.6}
        intensity={120}
        distance={12}
        decay={2}
        color="#bfe9ff"
        castShadow
        target-position={[0, 0.9, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2b2622" roughness={1} />
      </mesh>

      <Grid
        position={[0, 0.002, 0]}
        args={[200, 200]}
        cellSize={1}
        cellThickness={1}
        cellColor="#3d352c"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#4a3f33"
        fadeDistance={25}
        fadeStrength={1.5}
        infiniteGrid
      />

      <Desk />
      <Computer onClick={() => phase === "idle" && onComputerClick()} />

      {phase === "idle" && (
        <OrbitControls
          target={[0, 1.2, 0]}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={2}
          maxDistance={15}
        />
      )}
    </>
  );
}

useGLTF.preload("/Adjustable Desk.glb");
useGLTF.preload("/Computer.glb");
