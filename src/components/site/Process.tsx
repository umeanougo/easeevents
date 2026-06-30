import { Section } from "./Section";
import { ClipboardCheck, DraftingCompass, Rocket, type LucideIcon } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: ClipboardCheck,
    t: "Audit",
    d: "Map the workflow, tools, data, owners, and bottlenecks.",
  },
  {
    n: "02",
    icon: DraftingCompass,
    t: "Design",
    d: "Define the simplest useful system: workflow, integrations, dashboard, and handoff.",
  },
  {
    n: "03",
    icon: Rocket,
    t: "Build",
    d: "Implement, test, document, and train the team before launch.",
  },
] satisfies { n: string; icon: LucideIcon; t: string; d: string }[];

export function Process() {
  return (
    <Section
      id="process"
      eyebrow="Process"
      title={<>Simple, scoped, and built for handoff.</>}
      description="Start with the highest-leverage workflow. Ship the useful version first. Expand only when the system is working."
    >
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
        {steps.map((s) => (
          <article key={s.n} className="bg-surface-elevated p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
            </div>
            <h3 className="mt-5 text-xl font-semibold">{s.t}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
