import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Unsubscribe — EaseOps" },
      {
        name: "description",
        content:
          "Unsubscribe from EaseOps emails. Confirm your preference and stop receiving messages from the EaseOps team.",
      },
      { property: "og:title", content: "Unsubscribe from EaseOps emails" },
      {
        property: "og:description",
        content: "Confirm your unsubscribe request to stop receiving emails from EaseOps.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://easeops.ca/unsubscribe" }],
  }),
});

type State =
  | "loading"
  | "ready"
  | "already"
  | "invalid"
  | "submitting"
  | "done"
  | "error";

function UnsubscribePage() {
  const [state, setState] = useState<State>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) {
      setState("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        if (data.valid) return setState("ready");
        if (data.reason === "already_unsubscribed") return setState("already");
        setState("invalid");
      })
      .catch(() => setState("error"));
  }, []);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setState("error");
      if (data.success) return setState("done");
      if (data.reason === "already_unsubscribed") return setState("already");
      setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-xl px-6 py-24">
        <div className="surface-card p-10 text-center">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Validating link…
            </div>
          )}
          {state === "ready" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Unsubscribe from EaseOps emails
              </h1>
              <p className="mt-3 text-muted-foreground">
                You'll stop receiving messages from us. You can always reach out
                again at hello@easeops.ca.
              </p>
              <Button variant="hero" size="lg" className="mt-6" onClick={confirm}>
                Confirm unsubscribe
              </Button>
            </>
          )}
          {state === "submitting" && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Processing…
            </div>
          )}
          {state === "done" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                You're unsubscribed
              </h1>
              <p className="mt-3 text-muted-foreground">
                You won't receive further emails from EaseOps.
              </p>
            </>
          )}
          {state === "already" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                Already unsubscribed
              </h1>
              <p className="mt-3 text-muted-foreground">
                This email is already removed from our list.
              </p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                Something went wrong
              </h1>
              <p className="mt-3 text-muted-foreground">
                This unsubscribe link is invalid or expired. Email{" "}
                <a href="mailto:hello@easeops.ca" className="text-primary underline-offset-4 hover:underline">
                  hello@easeops.ca
                </a>{" "}
                and we'll remove you manually.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
