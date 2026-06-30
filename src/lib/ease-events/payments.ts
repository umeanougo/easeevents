import { supabase } from "@/integrations/supabase/client";

export type CheckoutAmountType = "deposit" | "full" | "custom";

export interface CheckoutRequest {
  eventId: string;
  invoiceId?: string;
  amountCents: number;
  description: string;
  returnPath: string;
}

export interface CheckoutResponse {
  url?: string;
  setupRequired?: boolean;
  error?: string;
}

export function dollarsToCents(amount: number) {
  return Math.max(Math.round(amount * 100), 0);
}

export function centsToDollars(amountCents: number) {
  return amountCents / 100;
}

export async function createCheckoutSession(input: CheckoutRequest): Promise<CheckoutResponse> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const response = await fetch("/api/ease-events/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const result = (await response.json()) as CheckoutResponse;
  if (!response.ok) {
    return {
      setupRequired: result.setupRequired,
      error: result.error ?? "Unable to create checkout session.",
    };
  }

  return result;
}
