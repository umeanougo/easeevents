import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../theme";
import { jost, mono } from "../MainVideo";
import { useSceneEnvelope } from "../useSceneEnvelope";

type Props = { orientation: "landscape" | "portrait"; duration: number };

const tools = ["Stripe", "Shopify", "HubSpot", "Sheets", "Slack", "Postgres"];

export const SceneConnect: React.FC<Props> = ({ orientation, duration }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = orientation === "portrait";
  const env = useSceneEnvelope(duration, 14, 22);

  const headlineOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });

  // Hub in center; tool nodes around
  const cx = width / 2;
  const cy = isPortrait ? height * 0.62 : height * 0.6;
  const radius = isPortrait ? 360 : 320;

  const hubPop = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 130 } });

  return (
    <AbsoluteFill style={{ padding: isPortrait ? "120px 60px 0" : "80px 140px 0", flexDirection: "column", gap: 30, opacity: env.opacity, transform: `translateY(${env.lift}px)` }}>
      <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)` }}>
        <div style={{ fontFamily: mono, color: COLORS.primary, fontSize: 18, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 16 }}>
          02 — Integrate
        </div>
        <div style={{ fontFamily: jost, color: COLORS.text, fontSize: isPortrait ? 78 : 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Connect <span style={{ color: COLORS.primary }}>your tools.</span>
        </div>
      </div>

      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={width} height={height}>
        {tools.map((t, i) => {
          const angle = (i / tools.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const lineStart = 30 + i * 6;
          const draw = interpolate(frame, [lineStart, lineStart + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const dx = x - cx;
          const dy = y - cy;
          const lx = cx + dx * draw;
          const ly = cy + dy * draw;
          // pulse
          const pulseT = ((frame - lineStart - 24) % 60) / 60;
          const pulseShow = frame > lineStart + 24 && pulseT > 0;
          const px = cx + dx * pulseT;
          const py = cy + dy * pulseT;
          return (
            <g key={t}>
              <line x1={cx} y1={cy} x2={lx} y2={ly} stroke={COLORS.primary} strokeWidth={2} opacity={0.45} />
              {pulseShow && <circle cx={px} cy={py} r={4} fill={COLORS.primaryGlow} />}
            </g>
          );
        })}
      </svg>

      {/* Hub */}
      <div
        style={{
          position: "absolute",
          left: cx - 70,
          top: cy - 70,
          width: 140,
          height: 140,
          borderRadius: 28,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: jost,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: "0.05em",
          transform: `scale(${hubPop})`,
          boxShadow: "0 20px 60px rgba(61,139,255,0.5)",
        }}
      >
        EaseOps
      </div>

      {/* Tool nodes */}
      {tools.map((t, i) => {
        const angle = (i / tools.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const start = 24 + i * 6;
        const pop = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 140 } });
        return (
          <div
            key={t}
            style={{
              position: "absolute",
              left: x - 70,
              top: y - 28,
              width: 140,
              height: 56,
              borderRadius: 12,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: mono,
              fontSize: 18,
              color: COLORS.text,
              transform: `scale(${pop})`,
              opacity: pop,
            }}
          >
            {t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
