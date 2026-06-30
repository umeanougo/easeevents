export function DashboardMock() {
  // Generate a smooth area chart path
  const points = [12, 18, 14, 22, 28, 24, 32, 38, 34, 42, 48, 44, 56, 52, 64, 70, 66, 78];
  const w = 600;
  const h = 140;
  const max = 80;
  const step = w / (points.length - 1);
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * h}`)
    .join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  const bars = [40, 65, 30, 80, 55, 70, 45, 60, 75, 50, 35, 65];

  return (
    <div className="surface-card relative p-2 shadow-elevated md:p-3">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        <div className="ml-3 text-xs text-muted-foreground font-mono">
          ops.dashboard / overview
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" /> live
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 p-3">
        {/* KPI cards */}
        {[
          { label: "Orders processed", value: "12,847", delta: "+18.2%" },
          { label: "Avg. fulfillment", value: "2.4h", delta: "−31%" },
          { label: "Hours automated", value: "318", delta: "+42h" },
          { label: "Manual errors", value: "0.04%", delta: "−87%" },
        ].map((k) => (
          <div
            key={k.label}
            className="col-span-6 min-h-[126px] rounded-lg border border-border bg-background/70 p-3 xl:col-span-3 xl:min-h-[132px] xl:p-4"
          >
            <div className="min-h-9 text-[10px] uppercase tracking-[0.12em] text-muted-foreground md:text-[11px]">
              {k.label}
            </div>
            <div className="mt-2 whitespace-nowrap text-2xl font-semibold tracking-tight xl:text-3xl">
              {k.value}
            </div>
            <div className="mt-1 text-xs text-primary">{k.delta}</div>
          </div>
        ))}

        {/* Area chart */}
        <div className="col-span-12 rounded-lg border border-border bg-background/70 p-4 xl:col-span-8">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Throughput
              </div>
              <div className="mt-1 max-w-[11rem] text-lg font-semibold leading-tight">
                Orders per hour
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 text-[10px] text-muted-foreground">
              {["1D", "7D", "30D", "90D"].map((t, i) => (
                <span
                  key={t}
                  className={`rounded px-2 py-1 ${
                    i === 2 ? "bg-primary/15 text-primary" : "bg-surface-elevated"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full h-32" preserveAspectRatio="none">
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#area)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Bar chart */}
        <div className="col-span-12 rounded-lg border border-border bg-background/70 p-4 xl:col-span-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Automation runs
          </div>
          <div className="text-lg font-semibold mt-1">By workflow</div>
          <div className="mt-4 flex items-end gap-1.5 h-32">
            {bars.map((b, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary"
                style={{ height: `${b}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
