import { useCurrentFrame, interpolate } from "remotion";

/**
 * Scene envelope timed around the surrounding TransitionSeries crossfade.
 * Content is hidden during the crossfade window (first/last `trans` frames)
 * so adjacent scenes never visually overlap.
 */
export const useSceneEnvelope = (
  duration: number,
  enterFrames = 14,
  exitFrames = 14,
  trans = 22
) => {
  const frame = useCurrentFrame();
  // Enter starts after the incoming crossfade has fully resolved
  const enter = interpolate(
    frame,
    [trans, trans + enterFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Exit completes before the outgoing crossfade starts
  const exit = interpolate(
    frame,
    [duration - trans - exitFrames, duration - trans],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const lift = interpolate(
    frame,
    [duration - trans - exitFrames, duration - trans],
    [0, -22],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return { enter, exit, opacity: enter * exit, lift };
};
