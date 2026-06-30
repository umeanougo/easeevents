import { Section } from "./Section";
import { Search, Workflow, Plug, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Workflow analysis",
    desc: "Map every manual task, handoff, and decision point in your operation.",
  },
  {
    icon: Workflow,
    title: "System design & automation",
    desc: "Build reliable, observable automations that replace manual work.",
  },
  {
    icon: Plug,
    title: "Data integration",
    desc: "Connect every tool so data flows into one source of truth.",
  },
  {
    icon: BarChart3,
    title: "Dashboards & reporting",
    desc: "Real-time visibility into the metrics that move your business.",
  },
];

const tools: { name: string; slug: string }[] = [
  { name: "Make.com", slug: "make" },
  { name: "n8n", slug: "n8n" },
  { name: "Zapier", slug: "zapier" },
  { name: "Metabase", slug: "metabase" },
  { name: "Looker Studio", slug: "looker" },
  { name: "Tableau", slug: "tableau" },
  { name: "Power BI", slug: "powerbi" },
  { name: "Domo", slug: "" },
  { name: "Airtable", slug: "airtable" },
  { name: "Postgres", slug: "postgresql" },
  { name: "Stripe", slug: "stripe" },
  { name: "Shopify", slug: "shopify" },
  { name: "HubSpot", slug: "hubspot" },
  { name: "Honeybook", slug: "" },
  { name: "Google Workspace", slug: "googleworkspace" },
  { name: "Microsoft 365", slug: "microsoftoffice" },
];

export function Solution() {
  return (
    <Section
      id="solution"
      eyebrow="The approach"
      title={<>One operating layer across the tools you already use.</>}
      description="Automation alone isn't enough. The real leverage comes from connecting workflows, data, dashboards, alerts, and documentation into one operating system."
      className="section-tint-rose"
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="bg-surface p-8 relative group hover:bg-surface-elevated transition-colors"
          >
            <div className="text-xs font-mono text-primary mb-6">0{i + 1}</div>
            <s.icon className="h-7 w-7 text-primary mb-4" />
            <h3 className="font-semibold text-lg">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
            {i < steps.length - 1 && (
              <ArrowRight className="hidden lg:block absolute top-8 right-[-10px] h-4 w-4 text-border z-10" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 max-w-2xl mx-auto text-center">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Tool-agnostic by design.</span> We pick the
          stack based on reliability and how well it scales with your business, not what's trending
          or what we've already built before.
        </p>
      </div>

      <div className="mt-10 -mx-6 md:-mx-0">
        <div className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-4">
          Tools we work with
        </div>
        <div
          className="relative overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="flex gap-3 w-max animate-marquee">
            {[...tools, ...tools].map((t, i) => {
              const palette = [
                "bg-indigo-500/10 border-indigo-400/30",
                "bg-teal-500/10 border-teal-400/30",
                "bg-amber-500/10 border-amber-400/30",
                "bg-rose-500/10 border-rose-400/30",
                "bg-emerald-500/10 border-emerald-400/30",
                "bg-violet-500/10 border-violet-400/30",
                "bg-sky-500/10 border-sky-400/30",
                "bg-pink-500/10 border-pink-400/30",
              ];
              const c = palette[i % palette.length];
              return (
                <div
                  key={`${t.name}-${i}`}
                  title={t.name}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border whitespace-nowrap ${c}`}
                >
                  {t.slug ? (
                    <img
                      src={`https://cdn.simpleicons.org/${t.slug}/white`}
                      alt={`${t.name} logo`}
                      width={18}
                      height={18}
                      loading="lazy"
                      className="h-[18px] w-[18px] object-contain opacity-90"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="text-sm font-medium text-foreground/85">{t.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}
