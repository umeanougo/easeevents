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

const testId = process.env.EASE_EVENTS_PHASE3_TEST_ID;
if (!testId?.startsWith("easeevents-phase3-")) {
  throw new Error("Set EASE_EVENTS_PHASE3_TEST_ID to the exact easeevents-phase3-* test id.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: proposals } = await supabase
  .from("proposals")
  .select("id, project_id, lead_id, event_id, client_id")
  .eq("proposal_number", `PROP-${testId}`);
const proposal = proposals?.[0];

if (!proposal) {
  console.log(`No Phase 3 test proposal found for ${testId}.`);
  process.exit(0);
}

await supabase.from("events").delete().eq("project_id", proposal.project_id);
await supabase.from("invoices").delete().eq("proposal_id", proposal.id);
await supabase.from("proposal_responses").delete().eq("proposal_id", proposal.id);
await supabase
  .from("proposal_line_items")
  .delete()
  .in(
    "proposal_version_id",
    (
      await supabase.from("proposal_versions").select("id").eq("proposal_id", proposal.id)
    ).data?.map((row) => row.id) ?? [],
  );
await supabase
  .from("proposal_payment_terms")
  .delete()
  .in(
    "proposal_version_id",
    (
      await supabase.from("proposal_versions").select("id").eq("proposal_id", proposal.id)
    ).data?.map((row) => row.id) ?? [],
  );
await supabase.from("proposal_versions").delete().eq("proposal_id", proposal.id);
await supabase.from("proposal_review_tokens").delete().eq("proposal_id", proposal.id);
await supabase.from("proposal_files").delete().eq("proposal_id", proposal.id);
await supabase.from("proposals").delete().eq("id", proposal.id);
await supabase.from("project_activity_events").delete().eq("project_id", proposal.project_id);
await supabase.from("project_booking_approvals").delete().eq("project_id", proposal.project_id);
await supabase.from("projects").delete().eq("id", proposal.project_id);
if (proposal.lead_id) await supabase.from("leads").delete().eq("id", proposal.lead_id);
if (proposal.client_id) await supabase.from("clients").delete().eq("id", proposal.client_id);

console.log(`Cleaned Phase 3 test records for ${testId}.`);
