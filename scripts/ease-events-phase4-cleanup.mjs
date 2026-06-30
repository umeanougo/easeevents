import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv() {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...parts] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = parts.join("=").replace(/^"|"$/g, "");
    }
  } catch {
    // The caller may provide env vars directly.
  }
}

loadDotEnv();

const testId = process.env.EASE_EVENTS_PHASE4_TEST_ID;
if (!testId?.startsWith("easeevents-phase4-")) {
  throw new Error("Set EASE_EVENTS_PHASE4_TEST_ID to the exact easeevents-phase4-* test id.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: proposals, error: proposalError } = await supabase
  .from("proposals")
  .select("id, project_id, lead_id, event_id, client_id")
  .eq("proposal_number", `PROP-${testId}`);
if (proposalError) throw proposalError;
const proposal = proposals?.[0];

if (!proposal) {
  await supabase.from("leads").delete().eq("notes", testId);
  await supabase.from("clients").delete().eq("notes", testId);
  await supabase.from("vendors").delete().eq("name", `${testId} Vendor`);
  console.log(`No Phase 4 test proposal found for ${testId}.`);
  process.exit(0);
}

const { data: expenses } = await supabase
  .from("expenses")
  .select("id")
  .eq("project_id", proposal.project_id);
const expenseIds = expenses?.map((row) => row.id) ?? [];

if (expenseIds.length) {
  await supabase.from("expense_files").delete().in("expense_id", expenseIds);
  await supabase.from("expense_payments").delete().in("expense_id", expenseIds);
  await supabase.from("expenses").delete().in("id", expenseIds);
}

await supabase
  .from("files")
  .delete()
  .eq("project_id", proposal.project_id)
  .ilike("name", `${testId}%`);
await supabase.from("event_vendors").delete().eq("event_id", proposal.event_id);
await supabase.from("budget_items").delete().eq("event_id", proposal.event_id);
await supabase.from("invoice_payments").delete().eq("project_id", proposal.project_id);
await supabase.from("invoices").delete().eq("proposal_id", proposal.id);
await supabase.from("events").delete().eq("project_id", proposal.project_id);
await supabase.from("proposal_responses").delete().eq("proposal_id", proposal.id);

const { data: versions } = await supabase
  .from("proposal_versions")
  .select("id")
  .eq("proposal_id", proposal.id);
const versionIds = versions?.map((row) => row.id) ?? [];
if (versionIds.length) {
  await supabase.from("proposal_line_items").delete().in("proposal_version_id", versionIds);
  await supabase.from("proposal_payment_terms").delete().in("proposal_version_id", versionIds);
}

await supabase.from("proposal_versions").delete().eq("proposal_id", proposal.id);
await supabase.from("proposal_files").delete().eq("proposal_id", proposal.id);
await supabase.from("proposal_review_tokens").delete().eq("proposal_id", proposal.id);
await supabase.from("proposals").delete().eq("id", proposal.id);
await supabase.from("project_activity_events").delete().eq("project_id", proposal.project_id);
await supabase.from("project_booking_approvals").delete().eq("project_id", proposal.project_id);
await supabase.from("projects").delete().eq("id", proposal.project_id);
if (proposal.lead_id) await supabase.from("leads").delete().eq("id", proposal.lead_id);
if (proposal.client_id) await supabase.from("clients").delete().eq("id", proposal.client_id);

const { data: vendors } = await supabase
  .from("vendors")
  .select("id")
  .eq("name", `${testId} Vendor`);
const vendorIds = vendors?.map((row) => row.id) ?? [];
if (vendorIds.length) await supabase.from("vendors").delete().in("id", vendorIds);

console.log(`Cleaned Phase 4 test records for ${testId}.`);
