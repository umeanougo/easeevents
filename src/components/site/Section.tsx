import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("py-10 md:py-18 relative scroll-mt-20", className)}>
      <div className="mx-auto max-w-7xl px-6">
        {(eyebrow || title || description) && (
          <div className="max-w-2xl mx-auto mb-8 md:mb-10 text-center">
            {eyebrow && (
              <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3 md:mb-4">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-[28px] leading-[1.15] md:text-5xl font-semibold tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 md:mt-5 text-[15px] md:text-lg text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
