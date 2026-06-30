import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo-easeops.png";

export function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/#example", label: "Work" },
    { href: "/#services", label: "Services" },
    { href: "/#case-study", label: "Case study" },
    { href: "/#process", label: "Process" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight min-w-0">
          <img
            src={logo}
            alt="EaseOps logo"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-md object-cover"
          />
          <span>EaseOps</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex lg:gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-foreground transition-colors whitespace-nowrap"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="hero" size="sm">
            <a href="/consultation">Book audit</a>
          </Button>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-accent/10 transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-1 text-sm">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Button asChild variant="hero" size="sm" className="mt-3 sm:hidden">
              <a href="/consultation" onClick={() => setOpen(false)}>
                Book audit
              </a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
