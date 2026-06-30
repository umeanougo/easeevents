import { Section } from "./Section";
import ucOrders from "@/assets/uc-orders.jpg";
import ucInventory from "@/assets/uc-inventory.jpg";
import ucInvoice from "@/assets/uc-invoice.jpg";
import ucLeads from "@/assets/uc-leads.jpg";
import ucReturns from "@/assets/uc-returns.jpg";
import ucDashboard from "@/assets/uc-dashboard.jpg";
import ucKpi from "@/assets/uc-kpi.jpg";

type Tone = "teal" | "violet" | "amber" | "blue" | "rose" | "indigo" | "emerald";

const toneStyles: Record<Tone, string> = {
  teal: "bg-teal-500/25 text-teal-100 ring-1 ring-inset ring-teal-300/40",
  violet: "bg-violet-500/25 text-violet-100 ring-1 ring-inset ring-violet-300/40",
  amber: "bg-amber-500/25 text-amber-100 ring-1 ring-inset ring-amber-300/40",
  blue: "bg-blue-500/25 text-blue-100 ring-1 ring-inset ring-blue-300/40",
  rose: "bg-rose-500/25 text-rose-100 ring-1 ring-inset ring-rose-300/40",
  indigo: "bg-indigo-500/25 text-indigo-100 ring-1 ring-inset ring-indigo-300/40",
  emerald: "bg-emerald-500/25 text-emerald-100 ring-1 ring-inset ring-emerald-300/40",
};

const cases: { img: string; label: string; tone: Tone; desc: string }[] = [
  {
    img: ucOrders,
    label: "FULFILLMENT",
    tone: "teal",
    desc: "Order processing automation that routes from checkout to warehouse to shipping confirmation without a single manual touch.",
  },
  {
    img: ucInventory,
    label: "INVENTORY",
    tone: "violet",
    desc: "Real-time stock tracking across every channel, with low-stock alerts and reorder logic that runs itself.",
  },
  {
    img: ucInvoice,
    label: "FINANCE",
    tone: "amber",
    desc: "Auto-generated invoices, reconciliation, and clean books at month-end — no more spreadsheet archaeology.",
  },
  {
    img: ucLeads,
    label: "SALES & CRM",
    tone: "blue",
    desc: "Lead capture, enrichment, scoring, and routing into the right pipeline so nothing slips through the cracks.",
  },
  {
    img: ucReturns,
    label: "LOGISTICS",
    tone: "rose",
    desc: "Customer-facing returns flows wired into your warehouse and accounting — refunds and restocks handled in one motion.",
  },
  {
    img: ucDashboard,
    label: "EXECUTIVE",
    tone: "indigo",
    desc: "One screen for the founder: revenue, ops health, team capacity, and alerts — all in real time.",
  },
  {
    img: ucKpi,
    label: "ANALYTICS",
    tone: "emerald",
    desc: "Unified KPI tracking across systems so every team is reading from the same numbers, every day.",
  },
];

export function UseCases() {
  return (
    <Section
      id="use-cases"
      eyebrow="Use cases"
      title={<>Where this work pays off.</>}
      description="Common operating bottlenecks we turn into reliable workflows and dashboards."
      className="section-tint-teal"
    >
      {/* Mobile: horizontal snap carousel — keeps the section short */}
      <div className="md:hidden -mx-6 px-6">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
          {cases.map((c) => (
            <article
              key={c.label}
              className="group surface-card overflow-hidden flex flex-col shrink-0 w-[78%] snap-start"
            >
              <div className="relative aspect-[5/3] overflow-hidden">
                <img
                  src={c.img}
                  alt=""
                  width={1024}
                  height={614}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                <span
                  className={`absolute top-3 left-3 inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] backdrop-blur-md ${toneStyles[c.tone]}`}
                >
                  {c.label}
                </span>
              </div>
              <p className="px-4 py-4 text-[14px] leading-[1.55] text-foreground/85">{c.desc}</p>
            </article>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted-foreground/70 tracking-wide mt-1">
          Swipe to explore →
        </p>
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cases.map((c) => (
          <article
            key={c.label}
            className="group surface-card overflow-hidden flex flex-col hover:border-primary/40 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={c.img}
                alt=""
                width={1024}
                height={768}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
              <span
                className={`absolute top-2.5 left-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] backdrop-blur-md ${toneStyles[c.tone]}`}
              >
                {c.label}
              </span>
            </div>
            <p className="px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
              {c.desc}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
