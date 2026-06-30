import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="contact" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 rounded-lg border border-border bg-foreground p-8 text-background md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-background/65">
              Next step
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Find the workflow that is slowing the business down.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-background/70 md:text-base">
              Book a 30-minute ops audit or email hello@easeops.ca. We will identify the clearest
              Phase 1 system and the work it should replace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
              <a href="/consultation">
                Book an ops audit <ArrowRight />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-background/25 text-background hover:bg-background/10"
            >
              <a href="mailto:hello@easeops.ca">Email us</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
