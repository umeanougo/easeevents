import { Linkedin, Youtube, Mail } from "lucide-react";
import logo from "@/assets/logo-easeops.png";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src={logo} alt="EaseOps logo" width={24} height={24} className="h-6 w-6 rounded object-cover" />
          <span className="text-foreground font-medium">EaseOps</span>
          <span>· Systems, automation & analytics</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://www.linkedin.com/company/ease-ops"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="hover:text-foreground transition-colors"
          >
            <Linkedin className="h-4 w-4" />
          </a>
          <a
            href="https://www.youtube.com/@EaseOps-b2b"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="hover:text-foreground transition-colors"
          >
            <Youtube className="h-4 w-4" />
          </a>
          <a
            href="mailto:hello@easeops.ca"
            aria-label="Email"
            className="hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
          </a>
        </div>
        <div className="font-mono text-xs">© {new Date().getFullYear()} EaseOps Solutions Inc.</div>
      </div>
    </footer>
  );
}
