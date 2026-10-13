import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import {
  Color,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  MathUtils,
  Mesh,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  WebGLRenderTarget,
} from "three";
import { createPostMaterial } from "./postMaterial";
import { useTheme } from "../theme";
import { CRT_PRESETS, type CrtParams } from "../crt/params";

// Custom render pipeline, ported from the basement.studio reference's
// `components/postprocessing/renderer.tsx`.
//
// Why not @react-three/postprocessing: EffectComposer allocates its own
// render targets and inserts a copy pass, so one LensDistortion effect cost
// three fullscreen passes. Here the scene children are portalled into a
// private Scene, drawn once into a linear HalfFloat target, and resolved by
// a single quad (postMaterial.ts) that also carries every CRT artefact the
// page-wide SVG filter used to do on the CPU compositor.
//
// Taking over the render loop: any useFrame with priority > 0 disables
// r3f's automatic render, which is exactly the hook the reference relies on.
// Pointer events still work — createPortal gives the portalled scene its own
// event layer that raycasts against `mainScene`.

export type GradePhase = "idle" | "screen" | "arcade";

interface Grade {
  distortion: number;
  aberration: number;
  scanline: number;
  noise: number;
  vignette: number;
  tint: string;
  tintAmount: number;
  tonemap: number;
  /** Levels per channel; 0 disables quantisation entirely. */
  posterize: number;
  exposure: number;
  contrast: number;
  brightness: number;
  gamma: number;
}

// Per-phase grades, the reference's `assets.scenes[].postprocessing` idea in
// miniature: one table instead of the intensity constants that were
// previously duplicated across the deleted PostFX.tsx and CrtOverlay.tsx and
// kept in step by hand.
// The CRT numbers (lens, scanlines, grain, vignette, tint) come from the shared
// presets in crt/params.ts; what is left here is the 3D-only colour grade.
function grade(
  p: CrtParams,
  g: Pick<Grade, "tonemap" | "posterize" | "exposure" | "contrast" | "brightness" | "gamma">,
): Grade {
  return {
    distortion: p.lens, aberration: p.aberration, scanline: p.scan, noise: p.grain,
    vignette: p.vignette, tintAmount: p.tint, tint: "#ffffff", ...g,
  };
}

const GRADES: Record<GradePhase, Grade> = {
  idle:   grade(CRT_PRESETS.sceneIdle,   { tonemap: 1, posterize: 10, exposure: 1.55, contrast: 1.06, brightness: 1.0, gamma: 1.0 }),
  screen: grade(CRT_PRESETS.sceneScreen, { tonemap: 1, posterize: 14, exposure: 1.45, contrast: 1.02, brightness: 1.0, gamma: 1.0 }),
  arcade: grade(CRT_PRESETS.sceneArcade, { tonemap: 1, posterize: 14, exposure: 1.45, contrast: 1.02, brightness: 1.0, gamma: 1.0 }),
};

const OFF: Grade = {
  distortion: 0, aberration: 0, scanline: 0, noise: 0, vignette: 0,
  tint: "#ffffff", tintAmount: 0, tonemap: 0, posterize: 0, exposure: 1, contrast: 1, brightness: 1, gamma: 1,
};

const tmpColor = new Color();

export default function Renderer({
  children,
  enabled,
  phase,
}: {
  children: ReactNode;
  enabled: boolean;
  phase: GradePhase;
}) {
  const theme = useTheme();
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const gl = useThree((s) => s.gl);

  const mainScene = useMemo(() => new Scene(), []);

  // Linear + HalfFloat so the grade below works in scene-referred values and
  // the sRGB encode happens exactly once, in the post shader. samples:4 gives
  // the geometry MSAA it never had (the old composer ran multisampling={0}),
  // and is affordable now that two passes are gone.
  const target = useMemo(
    () =>
      new WebGLRenderTarget(1, 1, {
        type: HalfFloatType,
        format: RGBAFormat,
        colorSpace: LinearSRGBColorSpace,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: true,
        samples: 4,
      }),
    [],
  );

  const material = useMemo(() => createPostMaterial(), []);

  // The resolve pass is built imperatively: its vertex shader writes clip
  // space directly, so it needs no camera transform and no r3f reconciliation.
  const { postScene, postCamera } = useMemo(() => {
    const s = new Scene();
    const quad = new Mesh(new PlaneGeometry(1, 1), material);
    quad.frustumCulled = false;
    s.add(quad);
    return { postScene: s, postCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [material]);

  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    target.setSize(w, h);
    material.uniforms.uResolution.value.set(w, h);
  }, [target, material, size.width, size.height, dpr]);

  useEffect(() => {
    return () => {
      target.dispose();
      material.dispose();
    };
  }, [target, material]);

  useEffect(() => {
    material.uniforms.uMain.value = target.texture;
  }, [material, target]);

  useFrame(({ camera, clock }, delta) => {
    const g = enabled ? GRADES[phase] : OFF;
    const u = material.uniforms;

    // Ease between grades instead of snapping, so entering/leaving a station
    // ramps the warp the way the flight does. Same damp convention as
    // CameraRig — no tween library.
    const d = Math.min(delta, 1 / 15);
    const to = (name: string, value: number) => {
      u[name].value = MathUtils.damp(u[name].value as number, value, 6, d);
    };
    to("uDistortion", g.distortion);
    to("uAberration", g.aberration);
    to("uScanline", g.scanline);
    to("uNoise", g.noise);
    to("uVignette", g.vignette);
    to("uTintAmount", g.tintAmount);
    to("uTonemap", g.tonemap);
    // Set, not damped: easing the level count would sweep through 3 and 2
    // levels on the way to 0, which looks like a fault rather than a fade.
    u.uPosterize.value = g.posterize;
    to("uExposure", g.exposure);
    to("uContrast", g.contrast);
    to("uBrightness", g.brightness);
    to("uGamma", g.gamma);
    (u.uTint.value as Color).lerp(tmpColor.set(theme.tint), 1 - Math.exp(-6 * d));
    u.uTime.value = clock.elapsedTime;

    // Scene pass — linear, untonemapped; the post shader owns the transfer.
    gl.outputColorSpace = LinearSRGBColorSpace;
    gl.toneMapping = NoToneMapping;
    gl.setRenderTarget(target);
    gl.render(mainScene, camera);

    // Resolve pass — straight to the canvas, encoding to sRGB on write.
    gl.outputColorSpace = SRGBColorSpace;
    gl.setRenderTarget(null);
    gl.render(postScene, postCamera);
  }, 1);

  return <>{createPortal(children, mainScene)}</>;
}
