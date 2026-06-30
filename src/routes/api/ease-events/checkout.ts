import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CheckoutSchema = z.object({
  eventId: z.string().min(1),
  invoiceId: z.string().optional(),
  amountCents: z.number().int().min(100).max(2_000_000),
  description: z.string().min(1).max(220),
  returnPath: z.string().min(1).max(300),
});

function getBaseUrl(request: Request) {
  const configured = process.env.EASE_EVENTS_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function safeReturnPath(path: string, fallback: string) {
  if (!path.startsWith("/ease-events")) return fallback;
  if (path.startsWith("//")) return fallback;
  return path;
}

function appendCheckoutParams(path: string, params: Record<string, string>) {
  const url = new URL(path, "http://local");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return `${url.pathname}${url.search}`;
}

export const Route = createFileRoute("/api/ease-events/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          return Response.json(
            {
              setupRequired: true,
              error: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable live checkout.",
            },
            { status: 501 },
          );
        }

        const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return Response.json(
            { error: "Supabase server configuration is missing." },
            { status: 500 },
          );
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json(
            { error: "Sign in with a Supabase account before collecting payment." },
            { status: 401 },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const parsed = CheckoutSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid checkout request.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const token = authHeader.slice("Bearer ".length).trim();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return Response.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, organization_id, role, email")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || !profile) {
          return Response.json({ error: "EaseEvents user profile not found." }, { status: 403 });
        }

        const { data: event, error: eventError } = await supabase
          .from("events")
          .select(
            "id, organization_id, event_name, client_name_snapshot, client_email, client_price, client_user_id, clients(display_name)",
          )
          .eq("id", parsed.data.eventId)
          .maybeSingle();

        if (eventError || !event || event.organization_id !== profile.organization_id) {
          return Response.json({ error: "Event not found." }, { status: 404 });
        }

        const role = profile.role as string;
        const canCollect =
          role === "admin" ||
          role === "planner" ||
          (role === "client" &&
            (event.client_user_id === profile.id || event.client_email === profile.email));

        if (!canCollect) {
          return Response.json(
            { error: "You do not have access to this event payment." },
            { status: 403 },
          );
        }

        if (parsed.data.invoiceId) {
          const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select("id, organization_id, event_id, status, balance_due")
            .eq("id", parsed.data.invoiceId)
            .maybeSingle();

          if (
            invoiceError ||
            !invoice ||
            invoice.organization_id !== profile.organization_id ||
            invoice.event_id !== event.id
          ) {
            return Response.json({ error: "Invoice not found for this event." }, { status: 404 });
          }
        }

        const baseUrl = getBaseUrl(request);
        const fallbackPath =
          role === "client"
            ? "/ease-events/client-portal"
            : `/ease-events/events/${encodeURIComponent(event.id)}`;
        const returnPath = safeReturnPath(parsed.data.returnPath, fallbackPath);
        const clientDisplayName = event.clients?.display_name ?? event.client_name_snapshot;
        const successPath = appendCheckoutParams(returnPath, {
          payment: "success",
          session_id: "{CHECKOUT_SESSION_ID}",
        });
        const cancelPath = appendCheckoutParams(returnPath, { payment: "cancelled" });

        const params = new URLSearchParams();
        params.set("mode", "payment");
        params.set("payment_method_types[0]", "card");
        params.set("success_url", `${baseUrl}${successPath}`);
        params.set("cancel_url", `${baseUrl}${cancelPath}`);
        params.set("customer_email", event.client_email);
        params.set("client_reference_id", event.id);
        params.set("line_items[0][quantity]", "1");
        params.set("line_items[0][price_data][currency]", "cad");
        params.set("line_items[0][price_data][unit_amount]", String(parsed.data.amountCents));
        params.set("line_items[0][price_data][product_data][name]", parsed.data.description);
        params.set(
          "line_items[0][price_data][product_data][description]",
          `${event.event_name} for ${clientDisplayName}`,
        );
        params.set("metadata[event_id]", event.id);
        params.set("metadata[organization_id]", event.organization_id);
        params.set("metadata[client_email]", event.client_email);
        params.set("metadata[source]", "ease-events");
        if (parsed.data.invoiceId) {
          params.set("metadata[invoice_id]", parsed.data.invoiceId);
        }
        params.set("invoice_creation[enabled]", "true");
        params.set("invoice_creation[invoice_data][metadata][event_id]", event.id);
        if (parsed.data.invoiceId) {
          params.set("invoice_creation[invoice_data][metadata][invoice_id]", parsed.data.invoiceId);
        }

        const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });

        const checkoutSession = (await stripeResponse.json()) as {
          id?: string;
          url?: string;
          error?: { message?: string };
        };

        if (!stripeResponse.ok || !checkoutSession.url) {
          return Response.json(
            {
              error:
                checkoutSession.error?.message ?? "Stripe could not create a checkout session.",
            },
            { status: 502 },
          );
        }

        if (parsed.data.invoiceId && checkoutSession.id) {
          await supabase
            .from("invoices")
            .update({
              status: "Sent",
              stripe_checkout_session_id: checkoutSession.id,
              metadata: {
                checkout_amount_cents: parsed.data.amountCents,
                checkout_description: parsed.data.description,
              },
            })
            .eq("id", parsed.data.invoiceId)
            .eq("organization_id", profile.organization_id);
        }

        return Response.json({ url: checkoutSession.url });
      },
    },
  },
});
