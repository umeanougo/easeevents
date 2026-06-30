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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function insert(client, table, payload) {
  const { data, error } = await client.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

async function count(client, table, filters) {
  let query = client.from(table).select("id", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { count: found, error } = await query;
  if (error) throw error;
  return found ?? 0;
}

function today(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

loadDotEnv();

if (process.env.EASE_EVENTS_EMAIL_MODE === "live") {
  throw new Error("Refusing to run Phase 9 e2e while EASE_EVENTS_EMAIL_MODE=live.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE9_TEST_ID || `easeevents-phase9-${Date.now()}`;
assert(
  testId.startsWith("easeevents-phase9-"),
  "Phase 9 test id must start with easeevents-phase9-.",
);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 9 e2e test id: ${testId}`);

const configuredOrganizationId =
  process.env.EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
  process.env.VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
  "00000000-0000-4000-8000-000000000001";

const { data: organization, error: organizationError } = await supabase
  .from("organizations")
  .select("*")
  .eq("id", configuredOrganizationId)
  .maybeSingle();
if (organizationError) throw organizationError;
const org =
  organization ??
  (await supabase.from("organizations").select("*").limit(1).single().throwOnError()).data;
assert(org?.id, "No organization found.");

const { data: ownerRows, error: ownerError } = await supabase
  .from("users")
  .select("*")
  .eq("organization_id", org.id)
  .in("role", ["admin", "planner"])
  .limit(1);
if (ownerError) throw ownerError;
const owner = ownerRows?.[0];
assert(owner?.id, "At least one admin/planner user is required for Phase 9 e2e.");

await supabase.from("organization_retention_settings").upsert(
  {
    organization_id: org.id,
    promotional_outreach_enabled: false,
    express_consent_required: true,
    default_execution_mode: "draft_only",
    manual_compliance_review: true,
    metadata: { test_identifier: testId },
  },
  { onConflict: "organization_id" },
);

const client = await insert(supabase, "clients", {
  organization_id: org.id,
  display_name: `${testId} Relationship Client`,
  email: `${testId}-client@example.test`,
  phone: "555-0900",
  status: "Past",
  source: "Phase 9 e2e",
  notes: testId,
  relationship_status: "Retention Follow-Up",
  relationship_owner_id: owner.id,
  preferred_contact_channel: "Email",
  future_event_communication_preference: "Manual Review",
  relationship_score: 5,
  first_inquiry_at: new Date().toISOString(),
  last_event_at: today(-10),
  next_relationship_action: "Review consent-safe rebooking follow-up.",
  next_relationship_action_at: new Date().toISOString(),
  relationship_notes: testId,
});

const lead = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: owner.id,
  client_id: client.id,
  stage: "Booked",
  client_name_snapshot: client.display_name,
  email: client.email,
  phone: client.phone,
  event_type: "Relationship closeout seed",
  event_date: today(-10),
  estimated_guest_count: 75,
  budget_range: "$12,000",
  notes: testId,
  source: "Phase 9 e2e",
});

const project = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: client.id,
  owner_id: owner.id,
  name: `${testId} Closed Relationship Project`,
  stage: "Completed",
});
await supabase.from("leads").update({ project_id: project.id }).eq("id", lead.id);

const event = await insert(supabase, "events", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  client_id: client.id,
  planner_id: owner.id,
  client_name_snapshot: client.display_name,
  client_email: client.email,
  client_phone: client.phone,
  event_name: `${testId} Closed Event`,
  event_type: "Milestone celebration",
  event_date: today(-10),
  start_time: "12:00",
  end_time: "17:00",
  location: "Phase 9 Studio",
  guest_count: 75,
  status: "Completed",
  client_price: 12000,
  internal_notes: testId,
  timeline_notes: testId,
});
await supabase.from("projects").update({ event_id: event.id }).eq("id", project.id);

await insert(supabase, "client_consents", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  client_id: client.id,
  consent_type: "Marketing Communication",
  status: "Granted",
  consent_wording_version: "phase9-v1",
  granted_at: new Date().toISOString(),
  source: "Phase 9 e2e",
  captured_by: owner.id,
  metadata: { test_identifier: testId },
});

await insert(supabase, "client_consents", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  client_id: client.id,
  consent_type: "Testimonial",
  status: "Declined",
  consent_wording_version: "phase9-v1",
  declined_at: new Date().toISOString(),
  source: "Phase 9 e2e",
  captured_by: owner.id,
  metadata: { test_identifier: testId },
});

const milestone = await insert(supabase, "client_milestones", {
  organization_id: org.id,
  client_id: client.id,
  source_project_id: project.id,
  milestone_type: "Event Anniversary",
  title: `${testId} anniversary`,
  milestone_date: today(90),
  month: Number(today(90).slice(5, 7)),
  day: Number(today(90).slice(8, 10)),
  recurrence_rule: "FREQ=YEARLY",
  reminder_offset_days: 60,
  next_occurrence_date: today(90),
  sensitivity: "Standard",
  source: "Planner confirmed",
  is_active: true,
  notes: testId,
  idempotency_key: `${testId}:milestone`,
  metadata: { test_identifier: testId },
  created_by: owner.id,
});
const duplicateMilestone = await supabase.from("client_milestones").insert({
  organization_id: org.id,
  client_id: client.id,
  milestone_type: "Event Anniversary",
  title: `${testId} duplicate anniversary`,
  milestone_date: today(90),
  idempotency_key: `${testId}:milestone`,
});
assert(duplicateMilestone.error, "Duplicate milestone idempotency key should be rejected.");

const opportunity = await insert(supabase, "rebooking_opportunities", {
  organization_id: org.id,
  client_id: client.id,
  source_project_id: project.id,
  source_event_id: event.id,
  source_milestone_id: milestone.id,
  assigned_to: owner.id,
  opportunity_type: "Anniversary",
  title: `${testId} repeat event`,
  description: "Controlled retention opportunity.",
  stage: "Review Required",
  estimated_event_date: today(120),
  target_contact_date: today(30),
  estimated_value: 15000,
  estimated_probability: 40,
  event_type: "Anniversary celebration",
  preferred_contact_channel: "Email",
  consent_status_snapshot: "Manual Review",
  next_action: "Review consent before outreach.",
  next_action_at: new Date().toISOString(),
  ai_summary: "Draft placeholder: summarize prior event preferences before outreach.",
  ai_summary_generated_at: new Date().toISOString(),
  idempotency_key: `${testId}:opportunity`,
  metadata: { test_identifier: testId },
  created_by: owner.id,
});
const duplicateOpportunity = await supabase.from("rebooking_opportunities").insert({
  organization_id: org.id,
  client_id: client.id,
  opportunity_type: "Anniversary",
  title: `${testId} duplicate opportunity`,
  idempotency_key: `${testId}:opportunity`,
});
assert(duplicateOpportunity.error, "Duplicate opportunity idempotency key should be rejected.");

await insert(supabase, "communication_eligibility_logs", {
  organization_id: org.id,
  client_id: client.id,
  opportunity_id: opportunity.id,
  channel: "Email",
  communication_category: "retention",
  allowed: false,
  consent_status: "Manual Review",
  suppression_reason: "manual_review_required",
  jurisdiction_profile: "Manual Review",
  requires_manual_review: true,
  explanation: "Phase 9 e2e keeps outreach draft-only.",
  checked_by: owner.id,
  idempotency_key: `${testId}:eligibility:1`,
  metadata: { test_identifier: testId },
});

const thread = await insert(supabase, "communication_threads", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  assigned_to_id: owner.id,
  subject: `${testId} retention draft`,
  client_name_snapshot: client.display_name,
  participants: [client.email, owner.email],
  channel: "Email",
  status: "Scheduled",
  integration_source: "retention",
  preview: "Draft-only retention outreach.",
  unread_count: 0,
  last_activity_at: new Date().toISOString(),
});

await insert(supabase, "communication_messages", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  thread_id: thread.id,
  author_id: owner.id,
  direction: "Internal",
  body: "Draft-only retention outreach. Do not send until reviewed.",
  summary: "Retention outreach draft",
  visibility: "Internal",
  delivery_status: "Suppressed",
  delivery_mode: process.env.EASE_EVENTS_EMAIL_MODE === "test" ? "test" : "disabled",
  metadata: { test_identifier: testId, no_external_send: true },
});

const referralLink = await insert(supabase, "client_referral_links", {
  organization_id: org.id,
  client_id: client.id,
  project_id: project.id,
  referral_code: `P9-${testId.slice(-8).toUpperCase()}`,
  source_campaign: "Phase 9 e2e",
  is_active: true,
  created_by: owner.id,
  metadata: { test_identifier: testId },
});
const duplicateReferralLink = await supabase.from("client_referral_links").insert({
  organization_id: org.id,
  client_id: client.id,
  referral_code: referralLink.referral_code,
});
assert(duplicateReferralLink.error, "Duplicate referral code should be rejected.");

const referral = await insert(supabase, "referrals", {
  organization_id: org.id,
  referring_client_id: client.id,
  referring_project_id: project.id,
  referral_link_id: referralLink.id,
  assigned_to: owner.id,
  referral_code: referralLink.referral_code,
  referral_source: "Phase 9 e2e",
  referrer_name_snapshot: client.display_name,
  referred_name: `${testId} Referred Client`,
  referred_email: `${testId}-referred@example.test`,
  status: "Review Required",
  consent_or_contact_basis: "Referrer introduction required",
  reward_status: "Pending Review",
  notes: testId,
  idempotency_key: `${testId}:referral`,
  metadata: { test_identifier: testId },
});
const duplicateReferral = await supabase.from("referrals").insert({
  organization_id: org.id,
  referred_name: `${testId} duplicate referred client`,
  status: "Submitted",
  idempotency_key: `${testId}:referral`,
});
assert(duplicateReferral.error, "Duplicate referral idempotency key should be rejected.");

const repeatLead = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: owner.id,
  client_id: client.id,
  stage: "New Inquiry",
  client_name_snapshot: client.display_name,
  email: client.email,
  phone: client.phone,
  event_type: "Anniversary celebration",
  event_date: today(120),
  estimated_guest_count: 0,
  budget_range: "$15,000",
  notes: `${testId} converted from rebooking opportunity.`,
  source: "Rebooking opportunity",
});
const repeatProject = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: repeatLead.id,
  client_id: client.id,
  owner_id: owner.id,
  name: `${testId} Repeat Project`,
  stage: "Inquiry",
});
await supabase.from("leads").update({ project_id: repeatProject.id }).eq("id", repeatLead.id);
await supabase
  .from("rebooking_opportunities")
  .update({
    stage: "Converted",
    converted_lead_id: repeatLead.id,
    converted_project_id: repeatProject.id,
    responded_at: new Date().toISOString(),
  })
  .eq("id", opportunity.id);

assert(
  (await count(supabase, "projects", { client_id: client.id })) === 2,
  "Closed project plus one repeat inquiry project should exist.",
);
assert(
  (await count(supabase, "projects", { id: project.id, stage: "Completed" })) === 1,
  "Old project should remain completed.",
);
assert(
  (await count(supabase, "rebooking_opportunities", { converted_project_id: repeatProject.id })) ===
    1,
  "Opportunity should point to exactly one converted project.",
);
assert(referral.id, "Referral should be recorded.");

const { error: revokeConsentError } = await supabase
  .from("client_consents")
  .update({
    status: "Revoked",
    revoked_at: new Date().toISOString(),
    source: "Phase 9 e2e unsubscribe",
    metadata: { test_identifier: testId, revoked_during_test: true },
  })
  .eq("organization_id", org.id)
  .eq("project_id", project.id)
  .eq("client_id", client.id)
  .eq("consent_type", "Marketing Communication");
if (revokeConsentError) throw revokeConsentError;
await supabase
  .from("clients")
  .update({
    future_event_communication_preference: "Unsubscribed",
    marketing_unsubscribed_at: new Date().toISOString(),
  })
  .eq("id", client.id);
await insert(supabase, "communication_eligibility_logs", {
  organization_id: org.id,
  client_id: client.id,
  opportunity_id: opportunity.id,
  channel: "Email",
  communication_category: "retention",
  allowed: false,
  consent_status: "Revoked",
  suppression_reason: "unsubscribed",
  unsubscribe_status: "Unsubscribed",
  jurisdiction_profile: "Manual Review",
  requires_manual_review: true,
  explanation: "Client unsubscribed during Phase 9 e2e.",
  checked_by: owner.id,
  idempotency_key: `${testId}:eligibility:2`,
  metadata: { test_identifier: testId },
});

if (anonKey) {
  const otherOrg = await insert(supabase, "organizations", {
    name: `${testId} Other Org`,
    slug: `${testId}-other-org`,
    timezone: "America/Toronto",
    currency: org.currency || "CAD",
  });
  const otherEmail = `${testId}-other-admin@example.test`;
  const password = `Phase9-${Date.now()}!`;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: otherEmail,
    password,
    email_confirm: true,
    user_metadata: { test_identifier: testId },
  });
  if (authError) throw authError;
  await insert(supabase, "users", {
    id: authData.user.id,
    organization_id: otherOrg.id,
    role: "admin",
    full_name: `${testId} Other Admin`,
    email: otherEmail,
  });

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email: otherEmail,
    password,
  });
  if (signInError) throw signInError;
  const { data: forbiddenRows, error: forbiddenError } = await anonClient
    .from("rebooking_opportunities")
    .select("id")
    .eq("id", opportunity.id);
  if (forbiddenError) throw forbiddenError;
  assert(
    (forbiddenRows ?? []).length === 0,
    "Other organization should not read retention records.",
  );
}

console.log("Phase 9 e2e passed. No real email, payment, or external provider call was made.");
