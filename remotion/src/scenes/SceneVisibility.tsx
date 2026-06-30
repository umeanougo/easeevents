import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../theme";
import { jost, mono } from "../MainVideo";
import { useSceneEnvelope } from "../useSceneEnvelope";

type Props = { orientation: "landscape" | "portrait"; duration: number };

const stats = [
  { label: "Orders today", value: 1284, prefix: "" },
  { label: "Revenue", value: 42890, prefix: "$" },
  { label: "Uptime", value: 99.9, prefix: "", suffix: "%" },
];

const bars = [40, 65, 50, 78, 62, 85, 92, 70, 88, 95];

export const SceneVisibility: React.FC<Props> = ({ orientation, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = orientation === "portrait";
  const env = useSceneEnvelope(duration, 14, 22);

  const headlineOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: isPortrait ? "120px 60px" : "80px 140px", flexDirection: "column", gap: 40, opacity: env.opacity, transform: `translateY(${env.lift}px)` }}>
      <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)` }}>
        <div style={{ fontFamily: mono, color: COLORS.primary, fontSize: 18, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 16 }}>
          03 — Visualize
        </div>
        <div style={{ fontFamily: jost, color: COLORS.text, fontSize: isPortrait ? 78 : 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Real-time <span style={{ color: COLORS.primary }}>visibility.</span>
        </div>
      </div>

      {/* Dashboard mock */}
      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 18,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", gap: 16 }}>
          {stats.map((s, i) => {
            const start = 28 + i * 8;
            const pop = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 130 } });
            const count = interpolate(frame, [start, start + 40], [0, s.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const display = s.value % 1 === 0 ? Math.round(count).toLocaleString() : count.toFixed(1);
            return (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  background: COLORS.bgElevated,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: 20,
                  opacity: pop,
                  transform: `translateY(${(1 - pop) * 14}px)`,
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 13, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: jost, fontSize: isPortrait ? 38 : 44, fontWeight: 700, color: COLORS.text }}>
                  {s.prefix}
                  {display}
                  {(s as any).suffix ?? ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: isPortrait ? 220 : 260, padding: "10px 8px" }}>
          {bars.map((h, i) => {
            const start = 50 + i * 4;
            const grow = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 120 } });
            const height = (h / 100) * (isPortrait ? 200 : 240) * grow;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height,
                  background: `linear-gradient(180deg, ${COLORS.primaryGlow}, ${COLORS.primary})`,
                  borderRadius: "6px 6px 2px 2px",
                  opacity: 0.9,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
