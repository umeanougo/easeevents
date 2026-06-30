import {
  BarChart3,
  LayoutTemplate,
  Plug,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Section } from "./Section";

type Service = {
  icon: LucideIcon;
  title: string;
  desc: string;
  visual: "site" | "flow" | "dashboard" | "integration";
};

const services: Service[] = [
  {
    icon: LayoutTemplate,
    title: "Website design and build",
    desc: "Clean websites that connect to your forms, analytics, and follow-up workflows.",
    visual: "site",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    desc: "Replace repetitive admin, manual checks, and handoffs with reliable workflows.",
    visual: "flow",
  },
  {
    icon: BarChart3,
    title: "Dashboards and reporting",
    desc: "Give owners and operators one clear view of volume, status, exceptions, and KPIs.",
    visual: "dashboard",
  },
  {
    icon: Plug,
    title: "System integration",
    desc: "Connect the apps your business runs on so data moves cleanly between systems.",
    visual: "integration",
  },
];

export function Services() {
  return (
    <Section
      id="services"
      eyebrow="Services"
      title={<>Useful systems, not extra noise.</>}
      description="The most common starting points for teams that want cleaner operations, better conversion, and less manual follow-up."
    >
      <div className="grid auto-rows-fr grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        {services.map((s) => (
          <a
            key={s.title}
            href="/consultation"
            className="group flex h-full min-h-[250px] flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-card transition-all hover:-translate-y-1 hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-[276px]"
          >
            <ServiceVisual kind={s.visual} />
            <div className="flex flex-1 flex-col p-3 md:p-4">
              <div className="flex items-center gap-2.5 md:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary md:h-9 md:w-9">
                  <s.icon className="h-4 w-4" />
                </div>
                <h3 className="text-[15px] font-semibold leading-snug tracking-tight md:text-base">
                  {s.title}
                </h3>
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground md:text-sm">
                {s.desc}
              </p>
            </div>
          </a>
        ))}
      </div>
    </Section>
  );
}

function ServiceVisual({ kind }: { kind: Service["visual"] }) {
  return (
    <div aria-hidden="true" className="relative h-24 overflow-hidden bg-foreground text-background md:h-28">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />
      {kind === "site" && (
        <div className="absolute inset-x-4 bottom-4 rounded-lg border border-background/20 bg-background/95 p-3 text-foreground shadow-card">
          <div className="h-2 w-14 rounded-full bg-primary" />
          <div className="mt-3 grid grid-cols-[1fr_40px] gap-3">
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-foreground/20" />
              <div className="h-2 w-4/5 rounded-full bg-foreground/15" />
              <div className="h-5 w-16 rounded bg-foreground" />
            </div>
            <div className="rounded-md border border-border bg-primary/10" />
          </div>
        </div>
      )}
      {kind === "flow" && (
        <div className="absolute inset-x-8 bottom-10 flex items-center justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative">
              {i < 3 && <div className="absolute left-7 top-3.5 h-px w-8 bg-primary/80 md:w-12" />}
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-background/25 bg-background text-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
            </div>
          ))}
        </div>
      )}
      {kind === "dashboard" && (
        <div className="absolute inset-x-4 bottom-4 rounded-lg border border-background/20 bg-background/95 p-3 text-foreground">
          <div className="grid grid-cols-3 gap-2">
            {[48, 72, 58, 88, 64, 78].map((h, i) => (
              <div key={i} className="flex h-14 items-end rounded bg-foreground/5 px-1.5">
                <div className="w-full rounded-t bg-primary" style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {kind === "integration" && (
        <div className="absolute inset-x-5 bottom-7 grid grid-cols-3 items-center gap-2 md:gap-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="relative z-10 flex h-12 items-center justify-center rounded-lg border border-background/20 bg-background/95 px-2 text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="h-2 w-5 rounded-full bg-foreground/20" />
              </span>
            </div>
          ))}
          <div className="pointer-events-none absolute left-[30%] right-[30%] top-1/2 z-0 h-px -translate-y-1/2 bg-primary" />
        </div>
      )}
    </div>
  );
}
