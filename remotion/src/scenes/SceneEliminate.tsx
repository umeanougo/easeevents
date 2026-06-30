import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../theme";
import { jost, mono } from "../MainVideo";
import { useSceneEnvelope } from "../useSceneEnvelope";

type Props = { orientation: "landscape" | "portrait"; duration: number };

const tasks = [
  "Copy order data to spreadsheet",
  "Email invoice to customer",
  "Update CRM contact",
  "Notify warehouse team",
  "Reconcile payment",
];

export const SceneEliminate: React.FC<Props> = ({ orientation, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = orientation === "portrait";
  const env = useSceneEnvelope(duration, 14, 22);

  const headlineOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        padding: isPortrait ? "120px 60px" : "80px 140px",
        flexDirection: "column",
        justifyContent: "center",
        gap: 50,
        opacity: env.opacity,
        transform: `translateY(${env.lift}px)`,
      }}
    >
      <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)` }}>
        <div style={{ fontFamily: mono, color: COLORS.primary, fontSize: 18, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 16 }}>
          01 — Automate
        </div>
        <div style={{ fontFamily: jost, color: COLORS.text, fontSize: isPortrait ? 78 : 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Eliminate <span style={{ color: COLORS.primary }}>manual work.</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: isPortrait ? 900 : 1100 }}>
        {tasks.map((t, i) => {
          const start = 28 + i * 10;
          const enter = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 130 } });
          const strikeStart = 90 + i * 4;
          const strike = interpolate(frame, [strikeStart, strikeStart + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(enter, [0, 1], [-30, 0]);
          return (
            <div
              key={t}
              style={{
                opacity: enter,
                transform: `translateX(${x}px)`,
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "16px 22px",
                borderRadius: 12,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${COLORS.primary}`,
                  background: strike > 0.5 ? COLORS.primary : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {strike > 0.5 ? "✓" : ""}
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <div style={{ fontFamily: jost, fontSize: isPortrait ? 28 : 30, color: strike > 0.5 ? COLORS.muted : COLORS.text, fontWeight: 500 }}>{t}</div>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    height: 2,
                    background: COLORS.primary,
                    width: `${strike * 100}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
