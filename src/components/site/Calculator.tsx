import { useMemo, useState } from "react";
import { Section } from "./Section";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Clock, DollarSign, Zap } from "lucide-react";

export function Calculator() {
  const [hours, setHours] = useState(12);
  const [team, setTeam] = useState(5);
  const [rate, setRate] = useState(45);

  const { weeklyHours, monthlyHours, monthlyCost, yearlyCost, efficiency } = useMemo(() => {
    const weeklyHours = hours * team;
    const monthlyHours = weeklyHours * 4.33;
    const monthlyCost = monthlyHours * rate;
    const yearlyCost = monthlyCost * 12;
    // Assume automation reclaims ~70% of time
    const efficiency = Math.min(70, 25 + hours * 1.5 + team * 1.2);
    return { weeklyHours, monthlyHours, monthlyCost, yearlyCost, efficiency };
  }, [hours, team, rate]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

  return (
    <Section
      id="calculator"
      eyebrow="ROI calculator"
      title={<>See what manual work is costing you.</>}
      description="A rough but honest estimate of the time and money your team is leaking every month."
      className="section-tint-gold"
    >
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-2 surface-card p-8 space-y-8">
          <Field
            label="Hours of manual work, per person, per week"
            value={`${hours}h`}
          >
            <Slider
              value={[hours]}
              min={1}
              max={40}
              step={1}
              onValueChange={(v) => setHours(v[0])}
            />
          </Field>
          <Field label="Team size" value={`${team} people`}>
            <Slider
              value={[team]}
              min={1}
              max={50}
              step={1}
              onValueChange={(v) => setTeam(v[0])}
            />
          </Field>
          <Field label="Loaded hourly cost" value={`$${rate}/h`}>
            <Slider
              value={[rate]}
              min={20}
              max={150}
              step={5}
              onValueChange={(v) => setRate(v[0])}
            />
          </Field>
        </div>

        {/* Outputs */}
        <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
          <Stat
            icon={Clock}
            label="Hours lost / month"
            value={fmt(monthlyHours)}
            sub={`${fmt(weeklyHours)}h every week`}
          />
          <Stat
            icon={DollarSign}
            label="Cost / month"
            value={`$${fmt(monthlyCost)}`}
            sub="In team time alone"
          />
          <Stat
            icon={TrendingUp}
            label="Cost / year"
            value={`$${fmt(yearlyCost)}`}
            sub="Compounding silently"
            highlight
          />
          <Stat
            icon={Zap}
            label="Recoverable with automation"
            value={`~${Math.round(efficiency)}%`}
            sub={`≈ $${fmt((yearlyCost * efficiency) / 100)} / year back`}
            highlight
          />
        </div>
      </div>
    </Section>
  );
}

function Field({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="text-lg font-semibold font-mono text-primary">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        highlight
          ? "border-primary/40 bg-gradient-to-br from-primary/10 to-transparent"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-3 text-3xl md:text-4xl font-semibold tracking-tight ${highlight ? "text-gradient-primary" : ""}`}>
        {value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
