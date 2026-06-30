import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../theme";
import { jost, mono } from "../MainVideo";
import { useSceneEnvelope } from "../useSceneEnvelope";

type Props = { orientation: "landscape" | "portrait"; duration: number };

export const SceneOutro: React.FC<Props> = ({ orientation, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = orientation === "portrait";
  const env = useSceneEnvelope(duration, 18, 30);

  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const lineOp = interpolate(frame, [18, 40], [0, 1], { extrapolateRight: "clamp" });
  const lineY = interpolate(frame, [18, 40], [16, 0], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 36, opacity: env.exit }}>
      <div style={{ transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`, opacity: env.enter }}>
        <Img src={staticFile("images/logo.jpg")} style={{ width: isPortrait ? 260 : 280, height: isPortrait ? 260 : 280, borderRadius: 28, boxShadow: "0 30px 80px rgba(61,139,255,0.4)" }} />
      </div>
      <div
        style={{
          opacity: lineOp,
          transform: `translateY(${lineY}px)`,
          fontFamily: jost,
          fontSize: isPortrait ? 56 : 64,
          fontWeight: 700,
          color: COLORS.text,
          letterSpacing: "-0.02em",
          textAlign: "center",
        }}
      >
        Run on <span style={{ color: COLORS.primary }}>systems that scale.</span>
      </div>
      <div
        style={{
          opacity: urlOp,
          fontFamily: mono,
          fontSize: isPortrait ? 28 : 26,
          color: COLORS.muted,
          letterSpacing: "0.15em",
        }}
      >
        easeops.ca
      </div>
    </AbsoluteFill>
  );
};
