import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShoppingBag } from "lucide-react";
import { Section } from "./Section";

const outcomes = [
  "Multi-store Shopify order visibility",
  "One fulfillment queue for daily operations",
  "Clear Phase 1 path before a larger platform build",
];

export function CaseStudy() {
  return (
    <Section
      id="case-study"
      eyebrow="Mini case study"
      title={<>Moventory: from scattered storefront checks to one order view.</>}
      description="A focused Phase 1 proposal for a fulfillment operator managing orders across multiple Shopify stores."
    >
      <div className="grid gap-6 rounded-lg border border-border bg-surface-elevated p-6 md:grid-cols-[0.85fr_1.15fr] md:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            Ecommerce operations
          </div>
          <h3 className="mt-6 text-2xl font-semibold tracking-tight">
            The business was checking stores manually throughout the day.
          </h3>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            The first useful system was not a large platform. It was a simple operating dashboard:
            new orders, customer details, fulfillment status, and exceptions in one place.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Stores", "3-5"],
              ["Timeline", "4 weeks"],
              ["Focus", "MVP"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-background p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="mt-1 text-xl font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border bg-background p-5">
            <div className="text-sm font-semibold">What the MVP needed to make clear</div>
            <div className="mt-4 grid gap-3">
              {outcomes.map((outcome) => (
                <div key={outcome} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Button asChild variant="subtle" size="lg">
              <a href="/consultation">
                Map my workflow <ArrowRight />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
