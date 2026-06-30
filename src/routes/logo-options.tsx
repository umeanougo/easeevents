import { createFileRoute } from "@tanstack/react-router";
import logo01 from "@/assets/logo-options/01-eo-fused-loop.png";
import logo02 from "@/assets/logo-options/02-e-inside-o.png";
import logo03 from "@/assets/logo-options/03-eo-infinity.png";
import logo04 from "@/assets/logo-options/04-gear-e.png";
import logo05 from "@/assets/logo-options/05-eo-ligature.png";
import logo06 from "@/assets/logo-options/06-o-arrow.png";
import logo07 from "@/assets/logo-options/07-e-bars.png";
import logo08 from "@/assets/logo-options/08-o-line.png";
import logo09 from "@/assets/logo-options/09-venn-e.png";
import logo10 from "@/assets/logo-options/10-nodes.png";
import logo11 from "@/assets/logo-options/11-chevron-stack.png";
import logo12 from "@/assets/logo-options/12-north-star.png";
import logo13 from "@/assets/logo-options/13-mobius-knot.png";
import logo14 from "@/assets/logo-options/14-converging-arcs.png";
import logo15 from "@/assets/logo-options/15-ugo-hidden-flow.png";
import logo16 from "@/assets/logo-options/16-ugo-crest.png";
import logo17 from "@/assets/logo-options/17-ugo-orbit.png";
import logo18 from "@/assets/logo-options/18-check-growth.png";
import logo19 from "@/assets/logo-options/19-precision-rosette.png";
import logo20 from "@/assets/logo-options/20-laurel-mark.png";
import logo01b from "@/assets/logo-options/01b-eo-fused-loop-wordmark.png";
import logo01c from "@/assets/logo-options/01c-eo-exact.png";
import logo01d from "@/assets/logo-options/01d-eo-symmetric.png";
import logo01e from "@/assets/logo-options/01e-eo-sweeping-top.png";
import logo01f from "@/assets/logo-options/01f-eo-faithful.png";
import logo01g from "@/assets/logo-options/01g-eo-final.png";
import logo01h from "@/assets/logo-options/01h-eo-jost.png";
import logo01i from "@/assets/logo-options/01i-eo-century-gothic.png";

export const Route = createFileRoute("/logo-options")({
  component: LogoOptions,
  head: () => ({
    meta: [
      { title: "Logo options — EaseOps brand directions" },
      {
        name: "description",
        content:
          "Internal review page showing logo direction explorations for the EaseOps brand mark, including EO fused loop, gear-E, and wordmark variations.",
      },
      { property: "og:title", content: "Logo options — EaseOps brand directions" },
      {
        property: "og:description",
        content:
          "Logo direction explorations for the EaseOps brand mark — internal review page.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://easeops.ca/logo-options" }],
  }),
});

const options = [
  { src: logo01, name: "01 · EO Fused Loop", desc: "E flowing into O — continuity & ease" },
  { src: logo02, name: "02 · E inside O", desc: "Negative-space E held within O — contained systems" },
  { src: logo03, name: "03 · EO Infinity", desc: "Endless automation loop" },
  { src: logo04, name: "04 · Gear-E", desc: "E inside a cog — operations engine" },
  { src: logo05, name: "05 · eo Ligature", desc: "Lowercase, friendly, soft geometry" },
  { src: logo06, name: "06 · O + Arrow", desc: "Circle breaking into upward momentum" },
  { src: logo07, name: "07 · E Bars", desc: "E as ascending bar chart — measurable gains" },
  { src: logo08, name: "08 · O Through-line", desc: "Forward motion bisecting a circle" },
  { src: logo09, name: "09 · Venn E", desc: "Two systems overlapping into clarity" },
  { src: logo10, name: "10 · Node Network", desc: "EO as a workflow diagram" },
  { src: logo11, name: "11 · Chevron Stack", desc: "Ascending efficiency & momentum" },
  { src: logo12, name: "12 · North Star", desc: "Precise direction, operational mastery" },
  { src: logo13, name: "13 · Möbius Knot", desc: "Seamless, continuous operations" },
  { src: logo14, name: "14 · Converging Arcs", desc: "Focus and precision" },
  { src: logo15, name: "15 · UGO Hidden Flow", desc: "U·G·O hidden inside a flowing emblem" },
  { src: logo16, name: "16 · UGO Crest", desc: "U·G·O disguised as a seal of excellence" },
  { src: logo17, name: "17 · UGO Orbit", desc: "U·G·O hidden in an orbital glyph" },
  { src: logo18, name: "18 · Check + Growth", desc: "Verified results, upward chart" },
  { src: logo19, name: "19 · Precision Rosette", desc: "Interlocking gears, flawless machinery" },
  { src: logo20, name: "20 · Laurel Mark", desc: "Modern wreath — award-winning ops" },
  { src: logo01b, name: "01b · EO Fused Loop + Wordmark", desc: "Extended curved E flowing into O, EaseOps below" },
  { src: logo01c, name: "01c · EO Exact Recreation", desc: "Faithful recreation of the reference photo" },
  { src: logo01d, name: "01d · EO Symmetric", desc: "Top of E flows into top of O — equal weights & gaps" },
  { src: logo01e, name: "01e · EO Sweeping Top", desc: "01c with extended sweeping top arm into the O" },
  { src: logo01f, name: "01f · EO Faithful", desc: "Faithful recreation — top E arm flows into the O" },
  { src: logo01g, name: "01g · EO Final", desc: "01f icon with rounded geometric wordmark" },
  { src: logo01h, name: "01h · EO + Jost wordmark", desc: "01f icon with real Jost (Futura-like) wordmark" },
  { src: logo01i, name: "01i · EO + Century Gothic", desc: "01f icon with Century Gothic wordmark" },
];

function LogoOptions() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight">Logo options</h1>
        <p className="text-muted-foreground mt-2">
          Ten directions for the EaseOps mark. Pick a number and I'll wire it up site-wide.
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {options.map((o) => (
          <figure key={o.name} className="rounded-xl border border-border overflow-hidden bg-card">
            <img
              src={o.src}
              alt={o.name}
              loading="lazy"
              width={1024}
              height={1024}
              className="w-full aspect-square object-cover"
            />
            <figcaption className="p-4">
              <div className="font-medium">{o.name}</div>
              <div className="text-sm text-muted-foreground">{o.desc}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
