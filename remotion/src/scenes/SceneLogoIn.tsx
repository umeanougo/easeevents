import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../theme";
import { jost, mono } from "../MainVideo";
import { useSceneEnvelope } from "../useSceneEnvelope";

type Props = { orientation: "landscape" | "portrait"; duration: number };

export const SceneLogoIn: React.FC<Props> = ({ orientation, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = orientation === "portrait";
  const env = useSceneEnvelope(duration, 18, 24);

  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 110, mass: 1 } });
  const scale = interpolate(pop, [0, 1], [0.6, 1]);
  const tagOp = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [22, 40], [16, 0], { extrapolateRight: "clamp" });

  const logoSize = isPortrait ? 320 : 360;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28, opacity: env.opacity, transform: `translateY(${env.lift}px)` }}>
      <div style={{ opacity: env.enter, transform: `scale(${scale})` }}>
        <Img src={staticFile("images/logo.jpg")} style={{ width: logoSize, height: logoSize, borderRadius: 32, boxShadow: "0 30px 80px rgba(61,139,255,0.35)" }} />
      </div>
      <div
        style={{
          opacity: tagOp * env.exit,
          transform: `translateY(${tagY}px)`,
          fontFamily: mono,
          fontSize: isPortrait ? 22 : 20,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: COLORS.primary,
        }}
      >
        Systems · Automation · Analytics
      </div>
      <div
        style={{
          opacity: tagOp * env.exit,
          fontFamily: jost,
          fontSize: isPortrait ? 32 : 28,
          color: COLORS.muted,
          fontWeight: 500,
        }}
      >
        easeops.ca
      </div>
    </AbsoluteFill>
  );
};
