import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { DashboardMock } from "./DashboardMock";

const proofPoints = [
  "Workflow automation",
  "System integrations",
  "Operational dashboards",
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-background">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-14 pt-14 md:grid-cols-[0.9fr_1.1fr] md:pb-20 md:pt-20 lg:gap-16">
        <div className="animate-fade-up">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            For growing operators with scattered tools
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-tight md:text-5xl lg:text-6xl">
            Operations systems for teams ready to run cleaner.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            EaseOps builds workflows, integrations, and dashboards that replace manual follow-up
            with clear operating systems your team can actually use.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{point}</span>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild variant="hero" size="xl">
              <a href="/consultation">
                Book an ops audit <ArrowRight />
              </a>
            </Button>
            <Button asChild variant="subtle" size="xl">
              <a href="mailto:hello@easeops.ca">
                <Mail /> hello@easeops.ca
              </a>
            </Button>
          </div>
        </div>

        <div className="animate-fade-in">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}
