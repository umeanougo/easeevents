import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
} from "lucide-react";

const SUBMIT_URL = "/api/public/consultation";

const CHALLENGES = [
  "Too much manual work",
  "Disconnected systems/tools",
  "Poor visibility into operations",
  "Repetitive admin tasks",
  "Slow internal workflows",
  "Inefficient lead management",
  "Reporting challenges",
  "Lack of automation",
  "AI implementation uncertainty",
  "Scaling operational processes",
  "Other",
];

export const Route = createFileRoute("/consultation")({
  component: ConsultationPage,
  head: () => ({
    meta: [
      { title: "Book a 30-Minute Ops Audit — EaseOps" },
      {
        name: "description",
        content:
          "Request a focused 30-minute ops audit. We'll review your workflow, identify bottlenecks, and recommend 2-3 high-leverage fixes.",
      },
      {
        property: "og:title",
        content: "Book a 30-Minute Ops Audit — EaseOps",
      },
      {
        property: "og:description",
        content:
          "A focused audit for operators who want clearer workflows, smarter automation, and better visibility.",
      },
      { property: "og:url", content: "https://easeops.ca/consultation" },
    ],
    links: [{ rel: "canonical", href: "https://easeops.ca/consultation" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Book a 30-Minute Ops Audit",
          url: "https://easeops.ca/consultation",
          description:
            "Request a focused 30-minute operations audit with the EaseOps team.",
          mainEntity: {
            "@type": "Organization",
            name: "EaseOps Solutions",
            email: "hello@easeops.ca",
            url: "https://easeops.ca",
          },
        }),
      },
    ],
  }),
});

type Status = "idle" | "submitting" | "success" | "error";

function ConsultationPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: "",
    companyName: "",
    workEmail: "",
    phoneNumber: "",
    businessDescription: "",
    teamSize: "",
    operationalChallenges: [] as string[],
    currentTools: "",
    biggestOpportunity: "",
    lookingFor: "Workflow audit",
    timeline: "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleChallenge = (label: string) => {
    setForm((f) => ({
      ...f,
      operationalChallenges: f.operationalChallenges.includes(label)
        ? f.operationalChallenges.filter((c) => c !== label)
        : [...f.operationalChallenges, label],
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.companyName.trim()) e.companyName = "Required";
    if (!form.workEmail.trim()) e.workEmail = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.workEmail)) e.workEmail = "Invalid email";
    if (!form.biggestOpportunity.trim()) e.biggestOpportunity = "Required";
    if (!form.timeline) e.timeline = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      const first = document.querySelector("[data-error='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <section className="relative overflow-hidden bg-background">
          <div className="mx-auto max-w-7xl px-6 pt-14 pb-12 md:pt-20 md:pb-16">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:items-center">
              <div className="animate-fade-up">
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Ops audit · No pitch · 30 minutes
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-tight md:text-5xl lg:text-6xl">
                  Map your highest-leverage{" "}
                  <span className="text-gradient-primary">workflow in 30 minutes.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                  Tell us where operations feel slow, manual, or unclear. We'll review your
                  workflow, identify 2-3 high-leverage fixes, and show what a practical Phase 1
                  system could look like.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button asChild variant="hero" size="lg">
                    <a href="#consultation-form">
                      Start request <ArrowRight />
                    </a>
                  </Button>
                  <a
                    href="mailto:hello@easeops.ca"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Mail className="h-4 w-4 text-primary" />
                    Prefer email? hello@easeops.ca
                  </a>
                </div>
              </div>
              <div className="animate-fade-in">
                <AuditPreview />
              </div>
            </div>
          </div>
        </section>

        <section id="consultation-form" className="pb-20">
          <div className="mx-auto max-w-7xl px-6">
            {status === "success" ? (
              <SuccessPanel />
            ) : (
              <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {status === "error" && (
                    <div className="surface-card p-5 flex items-start gap-3 border-destructive/40">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-sm">
                        Something went wrong. Please try again or email{" "}
                        <a
                          href="mailto:hello@easeops.ca"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          hello@easeops.ca
                        </a>
                        .
                      </div>
                    </div>
                  )}

                  <FormSection
                    index="01"
                    title="Contact"
                    description="Just enough to follow up with scheduling options."
                  >
                    <div className="grid md:grid-cols-2 gap-5">
                      <Field label="Full name" required error={errors.fullName} htmlFor="fullName">
                        <Input
                          id="fullName"
                          name="fullName"
                          autoComplete="name"
                          value={form.fullName}
                          onChange={(e) => update("fullName", e.target.value)}
                          placeholder="Jane Doe"
                          maxLength={100}
                        />
                      </Field>
                      <Field
                        label="Work email"
                        required
                        error={errors.workEmail}
                        htmlFor="workEmail"
                      >
                        <Input
                          id="workEmail"
                          name="workEmail"
                          type="email"
                          autoComplete="email"
                          value={form.workEmail}
                          onChange={(e) => update("workEmail", e.target.value)}
                          placeholder="jane@acme.com"
                          maxLength={255}
                        />
                      </Field>
                      <Field
                        label="Company"
                        required
                        error={errors.companyName}
                        htmlFor="companyName"
                      >
                        <Input
                          id="companyName"
                          name="companyName"
                          autoComplete="organization"
                          value={form.companyName}
                          onChange={(e) => update("companyName", e.target.value)}
                          placeholder="Acme Inc."
                          maxLength={150}
                        />
                      </Field>
                      <Field label="Phone number" hint="Optional" htmlFor="phoneNumber">
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          autoComplete="tel"
                          value={form.phoneNumber}
                          onChange={(e) => update("phoneNumber", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          maxLength={40}
                        />
                      </Field>
                    </div>
                  </FormSection>

                  <FormSection
                    index="02"
                    title="Audit Focus"
                    description="Point us at the workflow that would create the most leverage."
                  >
                    <div className="space-y-5">
                      <Field
                        label="If you could improve one operational bottleneck immediately, what would it be?"
                        required
                        error={errors.biggestOpportunity}
                        htmlFor="biggestOpportunity"
                      >
                        <Textarea
                          id="biggestOpportunity"
                          name="biggestOpportunity"
                          rows={4}
                          value={form.biggestOpportunity}
                          onChange={(e) => update("biggestOpportunity", e.target.value)}
                          placeholder="Client onboarding takes too long, inventory data lives in too many places, reporting is manual..."
                          maxLength={2000}
                        />
                      </Field>
                      <div className="grid md:grid-cols-2 gap-5">
                        <Field label="Desired timeline" required error={errors.timeline}>
                          <Select
                            value={form.timeline}
                            onValueChange={(v) => update("timeline", v)}
                          >
                            <SelectTrigger aria-label="Desired timeline">
                              <SelectValue placeholder="Select a timeline" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "ASAP",
                                "Within 30 days",
                                "Within 3 months",
                                "Exploring options",
                              ].map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="What would help most?" hint="Optional">
                          <Select
                            value={form.lookingFor}
                            onValueChange={(v) => update("lookingFor", v)}
                          >
                            <SelectTrigger aria-label="What would help most">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "Workflow audit",
                                "Website Design & Build",
                                "Automation implementation",
                                "Dashboard / reporting system",
                                "API or data-layer build",
                                "Not sure yet",
                              ].map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection
                    index="03"
                    title="Help Us Prepare"
                    description="Optional context that makes the audit more useful."
                  >
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-baseline justify-between gap-2 mb-3">
                          <Label className="text-sm">Current operational challenges</Label>
                          <span className="text-xs text-muted-foreground">Optional</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {CHALLENGES.map((c) => {
                            const checked = form.operationalChallenges.includes(c);
                            return (
                              <label
                                key={c}
                                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                  checked
                                    ? "border-primary/50 bg-primary/5"
                                    : "border-border bg-background/40 hover:border-primary/30 hover:bg-surface-elevated"
                                }`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleChallenge(c)}
                                />
                                <span className="text-sm">{c}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-5">
                        <Field label="Team size" hint="Optional">
                          <Select
                            value={form.teamSize}
                            onValueChange={(v) => update("teamSize", v)}
                          >
                            <SelectTrigger aria-label="Team size">
                              <SelectValue placeholder="Select team size" />
                            </SelectTrigger>
                            <SelectContent>
                              {["1-5", "6-20", "21-50", "50+"].map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Current tools" hint="Optional" htmlFor="currentTools">
                          <Textarea
                            id="currentTools"
                            name="currentTools"
                            rows={3}
                            value={form.currentTools}
                            onChange={(e) => update("currentTools", e.target.value)}
                            placeholder="HubSpot, Shopify, Airtable, spreadsheets, QuickBooks..."
                            maxLength={1000}
                          />
                        </Field>
                      </div>

                      <Field
                        label="What does your business do?"
                        hint="Optional"
                        htmlFor="businessDescription"
                      >
                        <Textarea
                          id="businessDescription"
                          name="businessDescription"
                          rows={4}
                          value={form.businessDescription}
                          onChange={(e) => update("businessDescription", e.target.value)}
                          placeholder="A quick sentence or two is enough."
                          maxLength={2000}
                        />
                      </Field>
                    </div>
                  </FormSection>

                  <div className="rounded-lg border border-border bg-foreground p-8 text-center text-background md:p-12">
                    <div>
                      <div className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-background/65">
                        Ready to submit
                      </div>
                      <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
                        Request your ops audit.
                      </h2>
                      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-background/70 md:text-lg">
                        We'll review your context and follow up shortly with scheduling options.
                      </p>
                      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <Button
                          type="submit"
                          size="xl"
                          className="bg-background text-foreground hover:bg-background/90"
                          disabled={status === "submitting"}
                        >
                          {status === "submitting" ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              Request my ops audit <ArrowRight />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>

                <aside className="lg:sticky lg:top-24 space-y-4">
                  <WhatHappensNext />
                  <ProofPanel />
                </aside>
              </div>
            )}
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Workflow,
                  title: "Operational Expertise",
                  desc: "Hands-on systems work for operators who need fewer bottlenecks.",
                },
                {
                  icon: Sparkles,
                  title: "Smart Automation",
                  desc: "Workflow fixes that remove busywork without adding fragility.",
                },
                {
                  icon: TrendingUp,
                  title: "Better Visibility",
                  desc: "Dashboards and data flows built around real decisions.",
                },
                {
                  icon: Target,
                  title: "Clear Next Steps",
                  desc: "Leave the audit with 2-3 practical fixes to prioritize.",
                },
              ].map((h) => (
                <div
                  key={h.title}
                  className="rounded-lg border border-border bg-surface-elevated p-6 transition-colors hover:border-primary/40"
                >
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <h.icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 font-semibold tracking-tight">{h.title}</div>
                    <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {h.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AuditPreview() {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-6 shadow-card md:p-8">
      <div className="relative">
        <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium">
          Audit output
        </div>
        <h2 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
          A sharper path from messy workflow to buildable system.
        </h2>
        <div className="mt-6 space-y-3">
          {[
            "Primary bottleneck and owner",
            "Best automation or dashboard opportunity",
            "Phase 1 workflow map with recommended next steps",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-md border border-border bg-background p-4"
            >
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-md border border-border bg-surface p-4">
          <div className="text-sm font-medium">Good fit when:</div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Your team is spending too much time reconciling tools, manually updating reports, or
            moving work between systems that should already be talking to each other.
          </p>
        </div>
      </div>
    </div>
  );
}

function WhatHappensNext() {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-6 shadow-card">
      <div className="relative">
        <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium">
          What happens next
        </div>
        <div className="mt-5 space-y-4">
          {[
            "Submit the short request",
            "We review your workflow context",
            "Join a focused 30-minute audit",
            "Leave with 2-3 recommended fixes",
          ].map((step, idx) => (
            <div key={step} className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-xs text-primary">
                {idx + 1}
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProofPanel() {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-6 shadow-card">
      <div className="relative">
        <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium">
          Relevant proof
        </div>
        <div className="mt-5 space-y-3">
          {[
            "Moventory Shopify ops dashboard proposal",
            "Domo dashboard work for L'Oreal",
            "API and data-layer implementation experience",
          ].map((item) => (
            <div
              key={item}
              className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormSection({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-6 shadow-card md:p-8">
      <div className="relative">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-mono text-xs text-primary tracking-wider">{index}</span>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2" data-error={error ? "true" : undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm" htmlFor={htmlFor}>
          {label}
          {required && <span className="text-primary ml-1">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SuccessPanel() {
  return (
    <div className="animate-fade-up rounded-lg border border-border bg-surface-elevated p-10 text-center shadow-card md:p-16">
      <div className="relative">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight">
          Thanks, we received your ops audit request.
        </h2>
        <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
          We'll review your context and reach out shortly with scheduling options. You can also book
          a time directly that works best for you.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="hero" size="xl">
            <a href="https://calendly.com/ugo-easeops/30min" target="_blank" rel="noreferrer">
              Book a time <ArrowRight />
            </a>
          </Button>
          <Button asChild variant="subtle" size="xl">
            <a href="/">Back to home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
