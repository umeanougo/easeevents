import { Section } from "./Section";
import { Code2, Layers, Eye, Shield } from "lucide-react";
import isoEnterprise from "@/assets/iso-enterprise.png";
import isoApi from "@/assets/iso-api.png";

const reasons = [
  {
    icon: Code2,
    t: "We work at the API and data layer",
    d: "Not just the UI layer. Comfortable in the engine room, not dragging blocks on a canvas.",
  },
  {
    icon: Layers,
    t: "Systems designed to scale, not break",
    d: "Architectures built for the team and volume you'll have in 18 months.",
  },
  {
    icon: Eye,
    t: "Automation + analytics, combined",
    d: "Most consultants do one. The compounding leverage comes from doing both together.",
  },
  {
    icon: Shield,
    t: "Reliability and long-term clarity",
    d: "Documented, observable systems your team owns — not black boxes only we can maintain.",
  },
];

const trackRecord = [
  {
    img: isoEnterprise,
    eyebrow: "Enterprise analytics",
    title: "Dashboards in Domo for L'Oréal",
    desc: "Operational and executive dashboards used by global brand teams to monitor performance and make decisions on real-time data.",
  },
  {
    img: isoApi,
    eyebrow: "Production systems",
    title: "API-driven integrations at scale",
    desc: "Designed and shipped API integrations and backend workflows in production. Reliable, observable, and built to stay running without babysitting.",
  },
];

export function WhyMe() {
  return (
    <Section
      id="credibility"
      eyebrow="Why work with us"
      title={
        <>
          A systems and operations partner,{" "}
          <span className="text-gradient-primary">not a freelancer.</span>
        </>
      }
      description="The difference between a team that automates a task and one that designs an operating system — backed by a real production track record."
      className="section-tint-violet"
    >
      <div className="grid md:grid-cols-2 gap-5">
        {reasons.map((r) => (
          <div key={r.t} className="surface-card p-6 md:p-7 flex gap-5">
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <r.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{r.t}</h3>
              <p className="text-muted-foreground mt-1.5 leading-relaxed">{r.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 md:mt-12">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-6 text-center">
          Track record
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {trackRecord.map((t) => (
            <div
              key={t.title}
              className="surface-card p-6 md:p-7 flex flex-col sm:flex-row gap-5 items-start"
            >
              <img
                src={t.img}
                alt=""
                width={96}
                height={96}
                loading="lazy"
                className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 object-contain"
              />
              <div>
                <div className="text-xs uppercase tracking-wider text-accent">{t.eyebrow}</div>
                <h3 className="text-lg font-semibold mt-1">{t.title}</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed text-sm">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
