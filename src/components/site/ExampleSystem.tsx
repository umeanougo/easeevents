import { Section } from "./Section";
import { Bell, Database, Gauge } from "lucide-react";

const flow = [
  {
    icon: Database,
    title: "Data in one place",
    desc: "Orders, leads, invoices, and operational status synced from the tools you already use.",
  },
  {
    icon: Gauge,
    title: "Workflows you can see",
    desc: "Clear queues, ownership, exceptions, and next steps instead of hidden manual checks.",
  },
  {
    icon: Bell,
    title: "Alerts before delays",
    desc: "The right person is notified when a handoff stalls, a report changes, or an error appears.",
  },
];

export function ExampleSystem() {
  return (
    <Section
      id="example"
      eyebrow="What we build"
      title={<>One operating view for the work that matters.</>}
      description="A practical system layer: connected tools, clean workflows, useful dashboards, and enough documentation for your team to own it."
    >
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
        {flow.map((s, i) => (
          <article key={s.title} className="bg-surface-elevated p-6 md:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
