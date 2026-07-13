import { EffectComposer, wrapEffect } from "@react-three/postprocessing";
import { LensDistortionEffect } from "postprocessing";
import { Vector2 } from "three";

// @react-three/postprocessing doesn't wrap every effect class the
// underlying `postprocessing` package ships — LensDistortionEffect (the
// fisheye/wide-lens warp) is one of the missing ones, so it's wrapped here
// the same way the library wraps its own built-ins.
const LensDistortion = wrapEffect(LensDistortionEffect);

const DISTORTION_IDLE   = new Vector2(0.12, 0.12); // full wide-lens warp
const DISTORTION_CLOSE  = new Vector2(0.03, 0.03); // subtle warp at screen
const DISTORTION_FLAT   = new Vector2(0.0, 0.0);   // none — arcade close-up

export default function PostFX({
  enabled,
  atScreen = false,
  flat = false,
}: {
  enabled: boolean;
  atScreen?: boolean;
  // Kill the warp entirely (arcade station: even the CLOSE level stacked on
  // the arrival fov read as fisheye — the cabinet's own screen shader
  // supplies the vintage look there instead).
  flat?: boolean;
}) {
  if (!enabled) return null;
  const distortion = flat ? DISTORTION_FLAT : atScreen ? DISTORTION_CLOSE : DISTORTION_IDLE;
  return (
    <EffectComposer multisampling={0}>
      <LensDistortion distortion={distortion} />
    </EffectComposer>
  );
}
