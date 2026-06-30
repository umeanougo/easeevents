import { Section } from "./Section";
import {
  AlertTriangle,
  Clock,
  Database,
  EyeOff,
  GitBranch,
  TrendingDown,
  Lock,
} from "lucide-react";

const pains = [
  {
    icon: Clock,
    title: "Repetitive manual tasks",
    desc: "Your team copy-pastes between tools instead of doing real work.",
  },
  {
    icon: Database,
    title: "Data scattered across tools",
    desc: "Stripe, Shopify, HubSpot, sheets — nothing talks to each other.",
  },
  {
    icon: EyeOff,
    title: "No visibility into operations",
    desc: "You make decisions on gut feel because the numbers live in silos.",
  },
  {
    icon: GitBranch,
    title: "Disconnected workflows",
    desc: "Orders, invoices, fulfillment and CRM each run in their own loop.",
  },
  {
    icon: AlertTriangle,
    title: "Errors and delays",
    desc: "Manual handoffs cause missed orders, wrong data, frustrated customers.",
  },
];

const costs = [
  { icon: TrendingDown, title: "Headcount grows faster than revenue" },
  { icon: Lock, title: "Operations become the bottleneck" },
];

export function Problem() {
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title={<>Your ads create demand. Your operations need to keep up.</>}
      description="When traffic starts working again, the bottleneck moves behind the scenes: order flow, lead routing, reporting, fulfillment, invoicing, and follow-up."
      className="section-tint-rose"
    >
      <div className="grid md:grid-cols-3 gap-4">
        {pains.map((p) => (
          <div key={p.title} className="surface-card p-6 hover:border-primary/30 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <p.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg">{p.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 surface-card p-6 md:p-7">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4 text-center md:text-left">
          The cost of waiting
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {costs.map((c) => (
            <div key={c.title} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <c.icon className="h-4 w-4" />
              </div>
              <p className="text-sm md:text-base">{c.title}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          Every month you delay, more growth gets absorbed by admin work, manual checks, and unclear
          reporting. The front office speeds up while the back office falls behind.
        </p>
      </div>
    </Section>
  );
}
