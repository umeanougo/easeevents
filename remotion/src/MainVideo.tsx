import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont as loadJost } from "@remotion/google-fonts/Jost";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { COLORS } from "./theme";
import { SceneLogoIn } from "./scenes/SceneLogoIn";
import { SceneEliminate } from "./scenes/SceneEliminate";
import { SceneConnect } from "./scenes/SceneConnect";
import { SceneVisibility } from "./scenes/SceneVisibility";
import { SceneOutro } from "./scenes/SceneOutro";

export const jost = loadJost("normal", { weights: ["400", "500", "600", "700"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"] }).fontFamily;

type Props = { orientation: "landscape" | "portrait" };

// Scene durations (frames @ 30fps). Transitions overlap and subtract.
const TRANS = 22;
// Durations sized so each scene's animations complete fully before its exit/transition begins,
// and so total length matches the ~19.6s American-female voiceover.
const D = { logo: 100, eliminate: 170, connect: 140, visibility: 170, outro: 120 };
// Total = sum - 4 * TRANS = 680 - 88 = 592 frames @ 30fps ≈ 19.73s
export const TOTAL = D.logo + D.eliminate + D.connect + D.visibility + D.outro - 4 * TRANS;

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at ${50 + drift / 8}% ${30 + drift / 20}%, rgba(61,139,255,0.18), transparent 60%)`,
        }}
      />
      <svg style={{ position: "absolute", inset: 0, opacity: 0.08 }} width="100%" height="100%">
        <defs>
          <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke={COLORS.primary} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC<Props> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const audioFade = interpolate(frame, [TOTAL - 30, TOTAL], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const trans = () => (
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANS })} />
  );
  return (
    <AbsoluteFill>
      <Backdrop />
      <Audio src={staticFile("audio/vo.mp3")} volume={audioFade} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.logo}>
          <SceneLogoIn orientation={orientation} duration={D.logo} />
        </TransitionSeries.Sequence>
        {trans()}
        <TransitionSeries.Sequence durationInFrames={D.eliminate}>
          <SceneEliminate orientation={orientation} duration={D.eliminate} />
        </TransitionSeries.Sequence>
        {trans()}
        <TransitionSeries.Sequence durationInFrames={D.connect}>
          <SceneConnect orientation={orientation} duration={D.connect} />
        </TransitionSeries.Sequence>
        {trans()}
        <TransitionSeries.Sequence durationInFrames={D.visibility}>
          <SceneVisibility orientation={orientation} duration={D.visibility} />
        </TransitionSeries.Sequence>
        {trans()}
        <TransitionSeries.Sequence durationInFrames={D.outro}>
          <SceneOutro orientation={orientation} duration={D.outro} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
