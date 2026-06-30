import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import { EffectComposer, ChromaticAberration } from "@react-three/postprocessing";
import { Vector2 } from "three";
import Scene from "./Scene";
import CameraRig, { type FlightPhase } from "./CameraRig";

function App() {
  const [phase, setPhase] = useState<FlightPhase>("idle");
  const aberrationRef = useRef<{ offset?: Vector2 }>(null);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative" }}>
      <Canvas shadows camera={{ position: [4, 3, 6], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene phase={phase} onComputerClick={() => setPhase("flying")} />
          <CameraRig
            phase={phase}
            onArrived={() => setPhase("arrived")}
            onReturned={() => setPhase("idle")}
            onAberrationChange={(amount) => {
              aberrationRef.current?.offset?.set(amount * 0.006, amount * 0.006);
            }}
          />
          <EffectComposer>
            <ChromaticAberration ref={aberrationRef} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {phase === "arrived" && (
        <button
          onClick={() => setPhase("returning")}
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            fontFamily: "monospace",
            background: "rgba(0,0,0,0.6)",
            color: "#bfe9ff",
            border: "1px solid #bfe9ff",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          ← BACK
        </button>
      )}
    </div>
  );
}

export default App;
