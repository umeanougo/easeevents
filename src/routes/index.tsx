import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { ExampleSystem } from "@/components/site/ExampleSystem";
import { CaseStudy } from "@/components/site/CaseStudy";
import { Services } from "@/components/site/Services";
import { Process } from "@/components/site/Process";
import { CTA } from "@/components/site/CTA";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "EaseOps — Operations systems, automation, and dashboards" },
      {
        name: "description",
        content:
          "EaseOps builds workflow automation, system integrations, dashboards, and clean websites for growing operators who need clearer operations.",
      },
      { property: "og:title", content: "EaseOps — Operations systems, automation, and dashboards" },
      {
        property: "og:description",
        content:
          "A practical systems partner for operators who need connected tools, cleaner workflows, and real-time visibility.",
      },
      { property: "og:url", content: "https://easeops.ca/" },
    ],
    links: [{ rel: "canonical", href: "https://easeops.ca/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EaseOps Solutions",
          url: "https://easeops.ca",
          logo: "https://easeops.ca/favicon.png",
          email: "hello@easeops.ca",
          description:
            "EaseOps designs workflow automation, system integrations, dashboards, and operational websites for growing operators.",
          sameAs: [
            "https://www.linkedin.com/company/ease-ops",
            "https://www.youtube.com/@EaseOps-b2b",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "EaseOps",
          url: "https://easeops.ca",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: "EaseOps Solutions",
          url: "https://easeops.ca",
          email: "hello@easeops.ca",
          areaServed: "Canada",
          serviceType: [
            "Workflow automation",
            "System integration",
            "Dashboards and reporting",
            "Website design and build",
          ],
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "EaseOps services",
            itemListElement: [
              "Workflow automation",
              "System integration",
              "Dashboards and reporting",
              "Website design and build",
            ].map((name) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name,
              },
            })),
          },
        }),
      },
    ],
  }),
});

function Index() {
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return false;
      const target = document.getElementById(decodeURIComponent(id));
      if (!target) return false;
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, left: 0, behavior: "auto" });
      return true;
    };

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0 });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const handleHashChange = () => {
      window.requestAnimationFrame(scrollToHash);
      window.setTimeout(scrollToHash, 0);
      window.setTimeout(scrollToHash, 80);
      window.setTimeout(scrollToHash, 240);
      window.setTimeout(scrollToHash, 600);
      window.setTimeout(scrollToHash, 1200);
    };

    if (window.location.hash) {
      handleHashChange();
    } else {
      resetScroll();
      window.requestAnimationFrame(resetScroll);
      window.setTimeout(resetScroll, 0);
      window.setTimeout(resetScroll, 120);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <ExampleSystem />
        <Services />
        <CaseStudy />
        <Process />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
