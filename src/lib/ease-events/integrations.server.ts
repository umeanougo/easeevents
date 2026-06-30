/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { CreateMeetingInput } from "./supabase-repository";
import type {
  ConnectedAccount,
  ConnectedAccountStatus,
  IntegrationProvider,
  MeetingRecord,
  MeetingType,
} from "./types";

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

const microsoftScopes = [
  "openid",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
  "Calendars.ReadWrite",
];

interface AuthenticatedEaseEventsProfile {
  id: string;
  organizationId: string;
  role: string;
  email: string;
  fullName: string;
}

interface ConnectedAccountRow {
  id: string;
  organization_id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: ConnectedAccountStatus;
  provider_account_id: string;
  provider_account_email: string;
  provider_account_name: string | null;
  scopes: string[] | null;
  calendar_id: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  last_mail_synced_at: string | null;
  last_calendar_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface OAuthStatePayload {
  userId: string;
  organizationId: string;
  provider: IntegrationProvider;
  returnPath: string;
  exp: number;
  nonce: string;
}

interface IntegrationSyncResult {
  createdThreads: number;
  createdMessages: number;
  updatedThreads: number;
  createdMeetings: number;
  updatedMeetings: number;
  skipped: number;
  cachedExternalEvents?: number;
}

type EmailMode = "disabled" | "test" | "live";

interface SendProjectEmailInput {
  accountId?: string;
  threadId?: string;
  thread?: {
    eventId: string;
    projectId?: string;
    leadId?: string;
    assignedToId?: string;
    subject: string;
    clientName: string;
    participants: string[];
  };
  eventId: string;
  projectId?: string;
  leadId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  visibility?: "Internal" | "Client" | "Vendor";
  idempotencyKey?: string;
}

function isMissingCalendarSchema(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  return (
    candidate?.code === "42P01" ||
    candidate?.code === "42703" ||
    candidate?.message?.includes("external_calendar_events") ||
    candidate?.message?.includes("calendar_sync_runs") ||
    candidate?.message?.includes("calendar_sync_states")
  );
}

function getBaseUrl(request: Request) {
  const configured = process.env.EASE_EVENTS_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function getConfiguredEmailMode(): EmailMode {
  const mode = process.env.EASE_EVENTS_EMAIL_MODE;
  if (mode === "disabled" || mode === "test" || mode === "live") return mode;
  return "disabled";
}

function safeReturnPath(path: string | undefined, fallback = "/ease-events/communications") {
  if (!path || !path.startsWith("/ease-events") || path.startsWith("//")) return fallback;
  return path;
}

function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getGoogleOAuthConfig(request: Request) {
  return {
    clientId: readRequiredEnv("GOOGLE_CLIENT_ID"),
    clientSecret: readRequiredEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${getBaseUrl(request)}/api/ease-events/integrations/oauth/callback`,
  };
}

function getMicrosoftOAuthConfig(request: Request) {
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  return {
    tenantId,
    clientId: readRequiredEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: readRequiredEnv("MICROSOFT_CLIENT_SECRET"),
    redirectUri:
      process.env.MICROSOFT_REDIRECT_URI ||
      `${getBaseUrl(request)}/api/ease-events/integrations/oauth/callback`,
  };
}

function getStateSecret() {
  return readRequiredEnv("EASE_EVENTS_OAUTH_STATE_SECRET");
}

function getEncryptionKey() {
  const raw = process.env.EASE_EVENTS_INTEGRATIONS_ENCRYPTION_KEY || getStateSecret();
  return createHash("sha256").update(raw).digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptSecret(value: string) {
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Encrypted secret is malformed.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function encodeState(payload: OAuthStatePayload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getStateSecret()).update(base).digest("base64url");
  return `${base}.${signature}`;
}

function decodeState(state: string): OAuthStatePayload {
  const [base, signature] = state.split(".");
  if (!base || !signature) throw new Error("OAuth state is malformed.");
  const expected = createHmac("sha256", getStateSecret()).update(base).digest("base64url");
  if (expected !== signature) throw new Error("OAuth state signature is invalid.");
  const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as OAuthStatePayload;
  if (payload.exp < Date.now()) throw new Error("OAuth state has expired.");
  return payload;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function getAuthenticatedProfile(
  request: Request,
): Promise<AuthenticatedEaseEventsProfile> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response("Unauthorized.", { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    throw new Response("Unauthorized.", { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, organization_id, role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Response("EaseEvents profile not found.", { status: 403 });
  }

  return {
    id: profile.id,
    organizationId: profile.organization_id,
    role: profile.role,
    email: profile.email,
    fullName: profile.full_name,
  };
}

export function assertStaff(profile: AuthenticatedEaseEventsProfile) {
  if (profile.role !== "admin" && profile.role !== "planner") {
    throw new Response("This integration requires a staff account.", { status: 403 });
  }
}

async function getOrganizationEmailSettings(organizationId: string) {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("name, email_sender_name, email_signature")
    .eq("id", organizationId)
    .maybeSingle();
  return {
    name: typeof data?.name === "string" && data.name.trim() ? data.name.trim() : "EaseEvents",
    emailSenderName:
      typeof data?.email_sender_name === "string" && data.email_sender_name.trim()
        ? data.email_sender_name
        : "",
    emailSignature:
      typeof data?.email_signature === "string" && data.email_signature.trim()
        ? data.email_signature
        : "",
  };
}

function mapConnectedAccount(row: ConnectedAccountRow): ConnectedAccount {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    provider: row.provider,
    status: row.status,
    providerAccountId: row.provider_account_id,
    providerAccountEmail: row.provider_account_email,
    providerAccountName: row.provider_account_name ?? undefined,
    scopes: row.scopes ?? [],
    calendarId: row.calendar_id ?? undefined,
    lastMailSyncedAt: row.last_mail_synced_at ?? undefined,
    lastCalendarSyncedAt: row.last_calendar_synced_at ?? undefined,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMeetingRow(row: any): MeetingRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? "",
    title: row.title,
    meetingType: row.meeting_type,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    organizerId: row.organizer_id ?? undefined,
    connectedAccountId: row.connected_account_id ?? undefined,
    externalProvider: row.external_provider ?? undefined,
    externalCalendarId: row.external_calendar_id ?? undefined,
    externalEventId: row.external_event_id ?? undefined,
    externalConferenceUrl: row.external_conference_url ?? undefined,
    syncedAt: row.synced_at ?? undefined,
    attendees: Array.isArray(row.attendees) ? row.attendees : [],
    agenda: row.agenda ?? "",
    link: row.link ?? undefined,
    transcript: row.transcript ?? "",
    internalSummary: row.internal_summary ?? "",
    clientSummary: row.client_summary ?? "",
    notes: row.notes ?? "",
    actionItems: Array.isArray(row.action_items) ? row.action_items : [],
    createdAt: row.created_at,
  };
}

function buildGoogleAuthorizationUrl(
  request: Request,
  profile: AuthenticatedEaseEventsProfile,
  returnPath?: string,
) {
  const config = getGoogleOAuthConfig(request);
  const state = encodeState({
    userId: profile.id,
    organizationId: profile.organizationId,
    provider: "google",
    returnPath: safeReturnPath(returnPath),
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomUUID(),
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("login_hint", profile.email);
  url.searchParams.set("scope", googleScopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

function buildMicrosoftAuthorizationUrl(
  request: Request,
  profile: AuthenticatedEaseEventsProfile,
  returnPath?: string,
) {
  const config = getMicrosoftOAuthConfig(request);
  const state = encodeState({
    userId: profile.id,
    organizationId: profile.organizationId,
    provider: "microsoft",
    returnPath: safeReturnPath(returnPath),
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomUUID(),
  });
  const url = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", microsoftScopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("login_hint", profile.email);
  return url.toString();
}

async function exchangeGoogleCode(request: Request, code: string) {
  const config = getGoogleOAuthConfig(request);
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await readJson<any>(response);
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token exchange failed.");
  }
  return data;
}

async function exchangeMicrosoftCode(request: Request, code: string) {
  const config = getMicrosoftOAuthConfig(request);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
    scope: microsoftScopes.join(" "),
  });
  const response = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  const data = await readJson<any>(response);
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Microsoft token exchange failed.");
  }
  return data;
}

async function refreshGoogleToken(refreshToken: string, request: Request) {
  const config = getGoogleOAuthConfig(request);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await readJson<any>(response);
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token refresh failed.");
  }
  return data;
}

async function refreshMicrosoftToken(refreshToken: string, request: Request) {
  const config = getMicrosoftOAuthConfig(request);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    redirect_uri: config.redirectUri,
    grant_type: "refresh_token",
    scope: microsoftScopes.join(" "),
  });
  const response = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  const data = await readJson<any>(response);
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Microsoft token refresh failed.");
  }
  return data;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await readJson<any>(response);
  if (!response.ok || !data.id) throw new Error("Unable to load Google account profile.");
  return data;
}

async function fetchMicrosoftProfile(accessToken: string) {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const data = await readJson<any>(response);
  if (!response.ok || !data.id) throw new Error("Unable to load Microsoft account profile.");
  return data;
}

async function upsertConnectedAccount(args: {
  organizationId: string;
  userId: string;
  provider: IntegrationProvider;
  providerAccountId: string;
  providerAccountEmail: string;
  providerAccountName?: string;
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  calendarId?: string;
}) {
  const expiresAt = args.expiresIn
    ? new Date(Date.now() + args.expiresIn * 1000).toISOString()
    : null;
  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .upsert(
      {
        organization_id: args.organizationId,
        user_id: args.userId,
        provider: args.provider,
        status: "Connected",
        provider_account_id: args.providerAccountId,
        provider_account_email: args.providerAccountEmail,
        provider_account_name: args.providerAccountName ?? null,
        scopes: args.scopes,
        calendar_id: args.calendarId ?? "primary",
        access_token_encrypted: encryptSecret(args.accessToken),
        refresh_token_encrypted: args.refreshToken ? encryptSecret(args.refreshToken) : null,
        token_expires_at: expiresAt,
        last_error: null,
        metadata: { linkedAt: new Date().toISOString() },
      },
      { onConflict: "organization_id,user_id,provider" },
    )
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Unable to save connected account.");
  return mapConnectedAccount(data as ConnectedAccountRow);
}

async function getConnectedAccountForUser(
  profile: AuthenticatedEaseEventsProfile,
  accountId: string,
): Promise<ConnectedAccountRow> {
  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("organization_id", profile.organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new Response("Connected account not found.", { status: 404 });
  }

  if (profile.role !== "admin" && data.user_id !== profile.id) {
    throw new Response("You do not have access to this connected account.", { status: 403 });
  }

  return data as ConnectedAccountRow;
}

async function updateConnectedAccountStatus(
  accountId: string,
  status: ConnectedAccountStatus,
  lastError?: string | null,
) {
  await supabaseAdmin
    .from("connected_accounts")
    .update({ status, last_error: lastError ?? null })
    .eq("id", accountId);
}

async function getFreshAccessToken(account: ConnectedAccountRow, request: Request) {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : null;
  const isFresh = !expiresAt || expiresAt - Date.now() > 90 * 1000;

  if (isFresh) {
    return decryptSecret(account.access_token_encrypted);
  }

  if (!account.refresh_token_encrypted) {
    await updateConnectedAccountStatus(account.id, "Action Required", "Refresh token missing.");
    throw new Response("This account needs to be reconnected.", { status: 409 });
  }

  const refreshToken = decryptSecret(account.refresh_token_encrypted);
  const refreshed =
    account.provider === "google"
      ? await refreshGoogleToken(refreshToken, request)
      : await refreshMicrosoftToken(refreshToken, request);

  const nextRefreshToken = refreshed.refresh_token || refreshToken;
  const expiresAtIso = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : account.token_expires_at;

  const { error } = await supabaseAdmin
    .from("connected_accounts")
    .update({
      status: "Connected",
      access_token_encrypted: encryptSecret(refreshed.access_token),
      refresh_token_encrypted: nextRefreshToken ? encryptSecret(nextRefreshToken) : null,
      token_expires_at: expiresAtIso,
      last_error: null,
    })
    .eq("id", account.id);

  if (error) throw error;
  return refreshed.access_token as string;
}

async function googleApi<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await readJson<T & { error?: { message?: string } }>(response);
  if (!response.ok) {
    throw new Error((data as any)?.error?.message || `Google API request failed: ${path}`);
  }
  return data as T;
}

async function microsoftGraphApi<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await readJson<T & { error?: { message?: string } }>(response);
  if (!response.ok) {
    throw new Error((data as any)?.error?.message || `Microsoft Graph request failed: ${path}`);
  }
  return data as T;
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sanitizeHeaderValue(value: string | null | undefined) {
  return (value ?? "").replace(/\r?\n/g, " ").trim();
}

function sanitizeDisplayName(value: string | null | undefined) {
  return sanitizeHeaderValue(value).replace(/["\\]/g, "");
}

function emailDomain(email: string) {
  return normalizeEmail(email).split("@")[1] || "easeevents.local";
}

function formatMailboxHeader(name: string | null | undefined, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const displayName = sanitizeDisplayName(name);
  return displayName ? `"${displayName}" <${normalizedEmail}>` : normalizedEmail;
}

function headerList(label: string, values: string[]) {
  const cleaned = values.map(normalizeEmail).filter(Boolean);
  return cleaned.length ? `${label}: ${cleaned.join(", ")}\r\n` : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownLinksToHtml(value: string) {
  const fragments: string[] = [];
  let lastIndex = 0;
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    fragments.push(escapeHtml(value.slice(lastIndex, match.index)));
    fragments.push(
      `<a href="${escapeHtml(match[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`,
    );
    lastIndex = match.index + match[0].length;
  }

  fragments.push(escapeHtml(value.slice(lastIndex)));
  return fragments.join("");
}

function textBodyToHtml(value: string) {
  return markdownLinksToHtml(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "<br />\n");
}

function buildRfc822Message(input: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  replyTo?: string;
  messageIdDomain?: string;
}) {
  const messageId = `<easeevents-${randomUUID()}@${input.messageIdDomain ?? emailDomain(input.from)}>`;
  const boundary = `easeevents-${randomUUID()}`;
  const contentHeaders = input.htmlBody
    ? [
        `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`,
        "\r\n",
        `--${boundary}\r\n`,
        "Content-Type: text/plain; charset=UTF-8\r\n",
        "Content-Transfer-Encoding: 8bit\r\n",
        "\r\n",
        input.body,
        "\r\n",
        `--${boundary}\r\n`,
        "Content-Type: text/html; charset=UTF-8\r\n",
        "Content-Transfer-Encoding: 8bit\r\n",
        "\r\n",
        input.htmlBody,
        "\r\n",
        `--${boundary}--`,
      ].join("")
    : ["Content-Type: text/plain; charset=UTF-8\r\n", "\r\n", input.body].join("");

  return [
    `Date: ${new Date().toUTCString()}\r\n`,
    `Message-ID: ${messageId}\r\n`,
    `From: ${sanitizeHeaderValue(input.from)}\r\n`,
    input.replyTo ? `Reply-To: ${sanitizeHeaderValue(input.replyTo)}\r\n` : "",
    headerList("To", input.to),
    headerList("Cc", input.cc ?? []),
    headerList("Bcc", input.bcc ?? []),
    `Subject: ${sanitizeHeaderValue(input.subject)}\r\n`,
    "MIME-Version: 1.0\r\n",
    "X-Mailer: EaseEvents\r\n",
    contentHeaders,
  ].join("");
}

function markdownLinksToPlainText(value: string) {
  return value.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 - $2");
}

function decodeCommonHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeBodyForConfiguredSignature(body: string, signature: string | null | undefined) {
  const decodedBody = decodeCommonHtmlEntities(body).trim();
  const configuredName = markdownLinksToPlainText(signature ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[1];

  if (
    configuredName &&
    decodedBody.includes("Ugo Umeano") &&
    decodedBody.includes("Founder & Chief Consultant") &&
    decodedBody.includes("EaseOps")
  ) {
    return decodedBody.replace(/Ugo Umeano/g, configuredName);
  }

  return decodedBody;
}

function appendEmailSignature(body: string, signature: string | null | undefined) {
  const trimmed = normalizeBodyForConfiguredSignature(body, signature);
  if (!trimmed) return body;
  const formattedSignature = markdownLinksToPlainText(signature ?? "").trim();
  if (!formattedSignature) return trimmed;

  const normalizedBody = trimmed.toLowerCase();
  const normalizedSignature = formattedSignature.toLowerCase();
  if (
    normalizedBody.includes(normalizedSignature) ||
    (normalizedBody.includes("ugo umeano") && normalizedBody.includes("easeops.ca"))
  ) {
    return trimmed;
  }

  return `${trimmed}\n\n${formattedSignature}`;
}

function appendEmailSignatureForHtml(body: string, signature: string | null | undefined) {
  const trimmed = normalizeBodyForConfiguredSignature(body, signature);
  if (!trimmed) return body;
  const rawSignature = (signature ?? "").trim();
  if (!rawSignature) return trimmed;

  const normalizedBody = trimmed.toLowerCase();
  const normalizedSignature = markdownLinksToPlainText(rawSignature).toLowerCase();
  if (
    normalizedBody.includes(normalizedSignature) ||
    (normalizedBody.includes("ugo umeano") && normalizedBody.includes("easeops.ca"))
  ) {
    return trimmed;
  }

  return `${trimmed}\n\n${rawSignature}`;
}

function assertSendScopes(account: ConnectedAccountRow) {
  const scopes = account.scopes ?? [];
  const hasScope =
    account.provider === "google"
      ? scopes.includes("https://www.googleapis.com/auth/gmail.send")
      : scopes.includes("Mail.Send");
  if (!hasScope) {
    throw new Response(
      "This mailbox was connected before send permission was added. Reconnect it to grant email send access.",
      { status: 409 },
    );
  }
}

async function sendViaGoogleMailbox(
  accessToken: string,
  account: ConnectedAccountRow,
  input: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    htmlBody?: string;
    fromName: string;
    externalThreadId?: string | null;
  },
) {
  const fromHeader = formatMailboxHeader(input.fromName, account.provider_account_email);
  const raw = base64Url(
    buildRfc822Message({
      from: fromHeader,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      body: input.body,
      htmlBody: input.htmlBody,
      replyTo: fromHeader,
      messageIdDomain: emailDomain(account.provider_account_email),
    }),
  );
  return googleApi<{ id?: string; threadId?: string }>(
    accessToken,
    "/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      body: JSON.stringify({
        raw,
        ...(input.externalThreadId ? { threadId: input.externalThreadId } : {}),
      }),
    },
  );
}

async function sendViaMicrosoftMailbox(
  accessToken: string,
  input: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    htmlBody?: string;
  },
) {
  const recipient = (address: string) => ({ emailAddress: { address } });
  await microsoftGraphApi(accessToken, "/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: {
          contentType: input.htmlBody ? "HTML" : "Text",
          content: input.htmlBody ?? input.body,
        },
        toRecipients: input.to.map(recipient),
        ccRecipients: input.cc.map(recipient),
        bccRecipients: input.bcc.map(recipient),
      },
      saveToSentItems: true,
    }),
  });
  return { id: undefined, threadId: undefined };
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function extractEmailAddresses(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => {
      const match = item.match(/<([^>]+)>/);
      return normalizeEmail(match ? match[1] : item);
    })
    .filter(Boolean);
}

function normalizeSearchText(value: string | null | undefined) {
  return value
    ?.toLowerCase()
    .replace(/[^a-z0-9@.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface EventMatchRecord {
  id: string;
  client_name_snapshot: string;
  client_email: string;
  event_name: string;
  emails: string[];
  names: string[];
}

async function loadEventMatchRecords(organizationId: string): Promise<EventMatchRecord[]> {
  const [eventsResponse, leadsResponse, usersResponse] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select(
        "id, client_name_snapshot, client_email, event_name, lead_id, client_user_id, clients(display_name)",
      )
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("leads")
      .select("id, client_name_snapshot, email, converted_event_id")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .eq("organization_id", organizationId),
  ]);

  if (eventsResponse.error) throw eventsResponse.error;
  if (leadsResponse.error) throw leadsResponse.error;
  if (usersResponse.error) throw usersResponse.error;

  const leads = (leadsResponse.data ?? []) as Array<{
    id: string;
    client_name_snapshot: string;
    email: string;
    converted_event_id: string | null;
  }>;
  const users = (usersResponse.data ?? []) as Array<{
    id: string;
    full_name: string;
    email: string;
  }>;

  return ((eventsResponse.data ?? []) as Array<any>).map((event) => {
    const canonicalClientName = event.clients?.display_name ?? event.client_name_snapshot;
    const linkedLeads = leads.filter(
      (lead) => lead.id === event.lead_id || lead.converted_event_id === event.id,
    );
    const clientUser = users.find((user) => user.id === event.client_user_id);
    const emails = new Set<string>([
      normalizeEmail(event.client_email),
      ...linkedLeads.map((lead) => normalizeEmail(lead.email)),
      normalizeEmail(clientUser?.email),
    ]);
    const names = new Set<string>([
      canonicalClientName,
      event.client_name_snapshot,
      event.event_name,
      ...linkedLeads.map((lead) => lead.client_name_snapshot),
      clientUser?.full_name,
    ]);

    return {
      id: event.id,
      client_name_snapshot: canonicalClientName,
      client_email: event.client_email,
      event_name: event.event_name,
      emails: Array.from(emails).filter(Boolean),
      names: Array.from(names).filter((name): name is string => Boolean(name?.trim())),
    };
  });
}

function pickEventForMessage(
  events: EventMatchRecord[],
  emails: string[],
  textParts: Array<string | null | undefined> = [],
) {
  const normalized = new Set(emails.map(normalizeEmail).filter(Boolean));
  const emailMatch = events.find((event) => event.emails.some((email) => normalized.has(email)));
  if (emailMatch) return emailMatch;

  const searchableText = normalizeSearchText(textParts.filter(Boolean).join(" ")) ?? "";
  if (!searchableText) return null;

  return (
    events.find((event) =>
      event.names.some((name) => {
        const normalizedName = normalizeSearchText(name);
        return Boolean(
          normalizedName && normalizedName.length >= 5 && searchableText.includes(normalizedName),
        );
      }),
    ) ?? null
  );
}

function mapMessageDirection(
  accountEmail: string,
  clientEmail: string,
  fromEmail: string,
): "Inbound" | "Outbound" {
  const normalizedFrom = normalizeEmail(fromEmail);
  if (normalizedFrom === normalizeEmail(clientEmail)) return "Inbound";
  if (normalizedFrom === normalizeEmail(accountEmail)) return "Outbound";
  return "Outbound";
}

function mapThreadStatus(direction: "Inbound" | "Outbound") {
  return direction === "Inbound" ? "Needs Reply" : "Waiting on Client";
}

function stripHtml(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function syncMailboxGoogle(
  request: Request,
  profile: AuthenticatedEaseEventsProfile,
  account: ConnectedAccountRow,
  accessToken: string,
): Promise<IntegrationSyncResult> {
  const orgEvents = await loadEventMatchRecords(profile.organizationId);

  const [threadsResult, messagesResult] = await Promise.all([
    supabaseAdmin
      .from("communication_threads")
      .select("id, external_thread_id")
      .eq("organization_id", profile.organizationId)
      .eq("external_provider", "google"),
    supabaseAdmin
      .from("communication_messages")
      .select("id, external_message_id")
      .eq("organization_id", profile.organizationId)
      .eq("external_provider", "google"),
  ]);

  const threadMap = new Map(
    (threadsResult.data ?? []).map((row: any) => [
      row.external_thread_id as string,
      row.id as string,
    ]),
  );
  const messageIds = new Set(
    (messagesResult.data ?? []).map((row: any) => row.external_message_id as string),
  );
  const createdThreadIds = new Set<string>();
  const updatedThreadIds = new Set<string>();

  const list = await googleApi<{ messages?: Array<{ id: string; threadId: string }> }>(
    accessToken,
    "/gmail/v1/users/me/messages?maxResults=100&q=newer_than:180d",
  );

  const result: IntegrationSyncResult = {
    createdThreads: 0,
    createdMessages: 0,
    updatedThreads: 0,
    createdMeetings: 0,
    updatedMeetings: 0,
    skipped: 0,
    cachedExternalEvents: 0,
  };

  const googleMessages = [];
  for (const messageRef of list.messages ?? []) {
    const message = await googleApi<any>(
      accessToken,
      `/gmail/v1/users/me/messages/${messageRef.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date`,
    );
    googleMessages.push(message);
  }

  googleMessages.sort((a, b) => Number(a.internalDate ?? 0) - Number(b.internalDate ?? 0));

  for (const message of googleMessages) {
    const alreadySynced = messageIds.has(message.id);

    const headers = new Map<string, string>();
    for (const header of message.payload?.headers ?? []) {
      headers.set(header.name, header.value);
    }
    const subject = headers.get("Subject") || "Email sync";
    const from = headers.get("From") || "";
    const to = headers.get("To") || "";
    const cc = headers.get("Cc") || "";
    const fromEmail = extractEmailAddresses(from)[0] ?? normalizeEmail(from);
    const participantEmails = [from, to, cc].flatMap(extractEmailAddresses);
    const matchedEvent = pickEventForMessage(orgEvents, participantEmails, [
      subject,
      message.snippet,
      from,
      to,
      cc,
    ]);
    if (!matchedEvent) {
      result.skipped += 1;
      continue;
    }

    const clientEmail = matchedEvent.client_email;
    const direction = mapMessageDirection(account.provider_account_email, clientEmail, fromEmail);
    const unread = Array.isArray(message.labelIds) && message.labelIds.includes("UNREAD");
    let localThreadId = threadMap.get(message.threadId);
    if (!localThreadId) {
      const { data: createdThread, error: threadError } = await supabaseAdmin
        .from("communication_threads")
        .upsert(
          {
            organization_id: profile.organizationId,
            event_id: matchedEvent.id,
            assigned_to_id: account.user_id,
            subject,
            client_name_snapshot: matchedEvent.client_name_snapshot,
            participants: Array.from(new Set(participantEmails)),
            channel: "Email",
            status: mapThreadStatus(direction),
            integration_source: "Gmail sync",
            external_provider: "google",
            external_thread_id: message.threadId,
            synced_at: new Date().toISOString(),
            preview: message.snippet ?? subject,
            unread_count: unread ? 1 : 0,
            last_activity_at: new Date(Number(message.internalDate || Date.now())).toISOString(),
          },
          { onConflict: "organization_id,external_provider,external_thread_id" },
        )
        .select("id")
        .single();

      if (threadError || !createdThread) throw threadError ?? new Error("Unable to upsert thread.");
      localThreadId = createdThread.id;
      threadMap.set(message.threadId, localThreadId);
      createdThreadIds.add(localThreadId);
      result.createdThreads += 1;
    } else {
      await supabaseAdmin
        .from("communication_threads")
        .update({
          status: mapThreadStatus(direction),
          client_name_snapshot: matchedEvent.client_name_snapshot,
          participants: Array.from(new Set(participantEmails)),
          event_id: matchedEvent.id,
          preview: message.snippet ?? subject,
          unread_count: unread ? 1 : 0,
          last_activity_at: new Date(Number(message.internalDate || Date.now())).toISOString(),
          synced_at: new Date().toISOString(),
        })
        .eq("id", localThreadId);
      if (!createdThreadIds.has(localThreadId) && !updatedThreadIds.has(localThreadId)) {
        updatedThreadIds.add(localThreadId);
        result.updatedThreads += 1;
      }
    }

    const { error: messageError } = await supabaseAdmin.from("communication_messages").upsert(
      {
        organization_id: profile.organizationId,
        thread_id: localThreadId,
        event_id: matchedEvent.id,
        direction,
        body: message.snippet ?? subject,
        summary: subject,
        visibility: "Client",
        external_provider: "google",
        external_message_id: message.id,
        synced_at: new Date().toISOString(),
        sent_at: new Date(Number(message.internalDate || Date.now())).toISOString(),
      },
      { onConflict: "organization_id,external_provider,external_message_id" },
    );

    if (messageError) throw messageError;
    if (alreadySynced) result.skipped += 1;
    else result.createdMessages += 1;
  }

  await supabaseAdmin
    .from("connected_accounts")
    .update({
      last_mail_synced_at: new Date().toISOString(),
      status: "Connected",
      last_error: null,
    })
    .eq("id", account.id);

  return result;
}

async function syncMailboxMicrosoft(
  profile: AuthenticatedEaseEventsProfile,
  account: ConnectedAccountRow,
  accessToken: string,
): Promise<IntegrationSyncResult> {
  const orgEvents = await loadEventMatchRecords(profile.organizationId);

  const [threadsResult, messagesResult] = await Promise.all([
    supabaseAdmin
      .from("communication_threads")
      .select("id, external_thread_id")
      .eq("organization_id", profile.organizationId)
      .eq("external_provider", "microsoft"),
    supabaseAdmin
      .from("communication_messages")
      .select("id, external_message_id")
      .eq("organization_id", profile.organizationId)
      .eq("external_provider", "microsoft"),
  ]);

  const threadMap = new Map(
    (threadsResult.data ?? []).map((row: any) => [
      row.external_thread_id as string,
      row.id as string,
    ]),
  );
  const messageIds = new Set(
    (messagesResult.data ?? []).map((row: any) => row.external_message_id as string),
  );
  const createdThreadIds = new Set<string>();
  const updatedThreadIds = new Set<string>();

  const response = await microsoftGraphApi<{
    value?: Array<any>;
  }>(
    accessToken,
    "/me/messages?$top=25&$select=id,conversationId,subject,bodyPreview,receivedDateTime,sentDateTime,isRead,from,toRecipients,ccRecipients",
  );

  const result: IntegrationSyncResult = {
    createdThreads: 0,
    createdMessages: 0,
    updatedThreads: 0,
    createdMeetings: 0,
    updatedMeetings: 0,
    skipped: 0,
    cachedExternalEvents: 0,
  };

  const microsoftMessages = [...(response.value ?? [])].sort((a, b) => {
    const aTime = new Date(a.receivedDateTime || a.sentDateTime || 0).getTime();
    const bTime = new Date(b.receivedDateTime || b.sentDateTime || 0).getTime();
    return aTime - bTime;
  });

  for (const message of microsoftMessages) {
    const alreadySynced = messageIds.has(message.id);

    const fromEmail = normalizeEmail(message.from?.emailAddress?.address);
    const participantEmails = [
      fromEmail,
      ...(message.toRecipients ?? []).map((item: any) =>
        normalizeEmail(item.emailAddress?.address),
      ),
      ...(message.ccRecipients ?? []).map((item: any) =>
        normalizeEmail(item.emailAddress?.address),
      ),
    ].filter(Boolean);
    const matchedEvent = pickEventForMessage(orgEvents, participantEmails, [
      message.subject,
      message.bodyPreview,
    ]);
    if (!matchedEvent || !message.conversationId) {
      result.skipped += 1;
      continue;
    }

    const direction = mapMessageDirection(
      account.provider_account_email,
      matchedEvent.client_email,
      fromEmail,
    );

    let localThreadId = threadMap.get(message.conversationId);
    if (!localThreadId) {
      const { data: createdThread, error: threadError } = await supabaseAdmin
        .from("communication_threads")
        .upsert(
          {
            organization_id: profile.organizationId,
            event_id: matchedEvent.id,
            assigned_to_id: account.user_id,
            subject: message.subject || "Outlook sync",
            client_name_snapshot: matchedEvent.client_name_snapshot,
            participants: Array.from(new Set(participantEmails)),
            channel: "Email",
            status: mapThreadStatus(direction),
            integration_source: "Outlook sync",
            external_provider: "microsoft",
            external_thread_id: message.conversationId,
            synced_at: new Date().toISOString(),
            preview: message.bodyPreview || message.subject || "Outlook sync",
            unread_count: message.isRead ? 0 : 1,
            last_activity_at:
              message.receivedDateTime || message.sentDateTime || new Date().toISOString(),
          },
          { onConflict: "organization_id,external_provider,external_thread_id" },
        )
        .select("id")
        .single();

      if (threadError || !createdThread) throw threadError ?? new Error("Unable to upsert thread.");
      localThreadId = createdThread.id;
      threadMap.set(message.conversationId, localThreadId);
      createdThreadIds.add(localThreadId);
      result.createdThreads += 1;
    } else {
      await supabaseAdmin
        .from("communication_threads")
        .update({
          status: mapThreadStatus(direction),
          client_name_snapshot: matchedEvent.client_name_snapshot,
          participants: Array.from(new Set(participantEmails)),
          event_id: matchedEvent.id,
          preview: message.bodyPreview || message.subject || "Outlook sync",
          unread_count: message.isRead ? 0 : 1,
          last_activity_at:
            message.receivedDateTime || message.sentDateTime || new Date().toISOString(),
          synced_at: new Date().toISOString(),
        })
        .eq("id", localThreadId);
      if (!createdThreadIds.has(localThreadId) && !updatedThreadIds.has(localThreadId)) {
        updatedThreadIds.add(localThreadId);
        result.updatedThreads += 1;
      }
    }

    const { error: messageError } = await supabaseAdmin.from("communication_messages").upsert(
      {
        organization_id: profile.organizationId,
        thread_id: localThreadId,
        event_id: matchedEvent.id,
        direction,
        body: message.bodyPreview || message.subject || "Outlook sync",
        summary: message.subject || "Outlook sync",
        visibility: "Client",
        external_provider: "microsoft",
        external_message_id: message.id,
        synced_at: new Date().toISOString(),
        sent_at: message.receivedDateTime || message.sentDateTime || new Date().toISOString(),
      },
      { onConflict: "organization_id,external_provider,external_message_id" },
    );

    if (messageError) throw messageError;
    if (alreadySynced) result.skipped += 1;
    else result.createdMessages += 1;
  }

  await supabaseAdmin
    .from("connected_accounts")
    .update({
      last_mail_synced_at: new Date().toISOString(),
      status: "Connected",
      last_error: null,
    })
    .eq("id", account.id);

  return result;
}

function mapMeetingStatus(startAt: string, endAt: string, cancelled: boolean) {
  if (cancelled) return "Cancelled";
  if (new Date(endAt).getTime() < Date.now()) return "Completed";
  return "Scheduled";
}

async function cacheExternalCalendarEvent(input: {
  profile: AuthenticatedEaseEventsProfile;
  account: ConnectedAccountRow;
  externalEventId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone?: string;
  status?: string;
  location?: string;
  meetingUrl?: string;
  attendees?: string[];
  providerUpdatedAt?: string;
  rawProviderPayload?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("external_calendar_events").upsert(
    {
      organization_id: input.profile.organizationId,
      connected_account_id: input.account.id,
      provider: input.account.provider,
      calendar_id: input.account.calendar_id || "primary",
      external_event_id: input.externalEventId,
      title: input.title,
      description: input.description ?? null,
      start_at: input.startAt,
      end_at: input.endAt,
      all_day: Boolean(input.allDay),
      timezone: input.timezone || "America/Toronto",
      status: input.status || "Confirmed",
      location: input.location ?? null,
      meeting_url: input.meetingUrl ?? null,
      attendees: input.attendees ?? [],
      provider_updated_at: input.providerUpdatedAt ?? null,
      raw_provider_payload: input.rawProviderPayload ?? {},
      sync_status: "Synced",
      conflict_status: "Unchecked",
    },
    { onConflict: "organization_id,provider,calendar_id,external_event_id" },
  );

  if (error && !isMissingCalendarSchema(error)) throw error;
}

async function syncCalendarGoogle(
  profile: AuthenticatedEaseEventsProfile,
  account: ConnectedAccountRow,
  accessToken: string,
): Promise<IntegrationSyncResult> {
  const [orgEvents, meetingsResponse] = await Promise.all([
    loadEventMatchRecords(profile.organizationId),
    supabaseAdmin
      .from("meetings")
      .select(
        "id, event_id, external_event_id, action_items, notes, transcript, internal_summary, client_summary",
      )
      .eq("organization_id", profile.organizationId)
      .eq("external_provider", "google"),
  ]);

  const existingMeetings = new Map(
    (meetingsResponse.data ?? []).map((row: any) => [row.external_event_id as string, row]),
  );

  const calendar = await googleApi<{ items?: Array<any> }>(
    accessToken,
    `/calendar/v3/calendars/${encodeURIComponent(account.calendar_id || "primary")}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    )}&maxResults=50&conferenceDataVersion=1`,
  );

  const result: IntegrationSyncResult = {
    createdThreads: 0,
    createdMessages: 0,
    updatedThreads: 0,
    createdMeetings: 0,
    updatedMeetings: 0,
    skipped: 0,
  };

  for (const item of calendar.items ?? []) {
    if (!item.id || !item.start?.dateTime || !item.end?.dateTime) {
      result.skipped += 1;
      continue;
    }
    const existing = existingMeetings.get(item.id);
    const attendeeEmails = (item.attendees ?? [])
      .map((attendee: any) => normalizeEmail(attendee.email))
      .filter(Boolean);
    const matchedEvent =
      (existing && orgEvents.find((event) => event.id === existing.event_id)) ||
      pickEventForMessage(orgEvents, attendeeEmails, [item.summary, item.description]);

    const link =
      item.hangoutLink ||
      item.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === "video")
        ?.uri ||
      item.htmlLink;

    if (!matchedEvent) {
      await cacheExternalCalendarEvent({
        profile,
        account,
        externalEventId: item.id,
        title: item.summary || "External calendar event",
        description: stripHtml(item.description),
        startAt: item.start.dateTime,
        endAt: item.end.dateTime,
        timezone: item.start.timeZone || "America/Toronto",
        status: item.status === "cancelled" ? "Cancelled" : "Confirmed",
        location: item.location,
        meetingUrl: link,
        attendees: attendeeEmails,
        providerUpdatedAt: item.updated,
        rawProviderPayload: item,
      });
      result.cachedExternalEvents = (result.cachedExternalEvents ?? 0) + 1;
      result.skipped += 1;
      continue;
    }

    const payload = {
      organization_id: profile.organizationId,
      event_id: matchedEvent.id,
      organizer_id: account.user_id,
      connected_account_id: account.id,
      title: item.summary || "Calendar sync",
      meeting_type:
        item.hangoutLink || item.conferenceData?.conferenceSolution?.key?.type === "hangoutsMeet"
          ? "Google Meet"
          : "In Person",
      status: mapMeetingStatus(item.start.dateTime, item.end.dateTime, item.status === "cancelled"),
      start_at: item.start.dateTime,
      end_at: item.end.dateTime,
      attendees: attendeeEmails,
      agenda: stripHtml(item.description),
      link: link ?? null,
      transcript: existing?.transcript ?? "",
      internal_summary: existing?.internal_summary ?? "",
      client_summary: existing?.client_summary ?? "",
      notes: existing?.notes ?? "",
      action_items: existing?.action_items ?? [],
      external_provider: "google",
      external_calendar_id: account.calendar_id || "primary",
      external_event_id: item.id,
      external_conference_url: link ?? null,
      synced_at: new Date().toISOString(),
      timezone: item.start.timeZone || "America/Toronto",
      sync_status: "Synced",
      provider_updated_at: item.updated ?? null,
    };

    const { error } = await supabaseAdmin.from("meetings").upsert(payload, {
      onConflict: "organization_id,external_provider,external_event_id",
    });
    if (error) throw error;
    if (existing) result.updatedMeetings += 1;
    else result.createdMeetings += 1;
  }

  await supabaseAdmin
    .from("connected_accounts")
    .update({
      last_calendar_synced_at: new Date().toISOString(),
      status: "Connected",
      last_error: null,
    })
    .eq("id", account.id);

  return result;
}

async function syncCalendarMicrosoft(
  profile: AuthenticatedEaseEventsProfile,
  account: ConnectedAccountRow,
  accessToken: string,
): Promise<IntegrationSyncResult> {
  const [orgEvents, meetingsResponse] = await Promise.all([
    loadEventMatchRecords(profile.organizationId),
    supabaseAdmin
      .from("meetings")
      .select(
        "id, event_id, external_event_id, action_items, notes, transcript, internal_summary, client_summary",
      )
      .eq("organization_id", profile.organizationId)
      .eq("external_provider", "microsoft"),
  ]);

  const existingMeetings = new Map(
    (meetingsResponse.data ?? []).map((row: any) => [row.external_event_id as string, row]),
  );

  const calendar = await microsoftGraphApi<{ value?: Array<any> }>(
    accessToken,
    "/me/events?$top=50&$select=id,subject,bodyPreview,start,end,attendees,isOnlineMeeting,onlineMeetingProvider,onlineMeeting,webLink,isCancelled",
  );

  const result: IntegrationSyncResult = {
    createdThreads: 0,
    createdMessages: 0,
    updatedThreads: 0,
    createdMeetings: 0,
    updatedMeetings: 0,
    skipped: 0,
  };

  for (const item of calendar.value ?? []) {
    if (!item.id || !item.start?.dateTime || !item.end?.dateTime) {
      result.skipped += 1;
      continue;
    }
    const existing = existingMeetings.get(item.id);
    const attendeeEmails = (item.attendees ?? [])
      .map((attendee: any) => normalizeEmail(attendee.emailAddress?.address))
      .filter(Boolean);
    const matchedEvent =
      (existing && orgEvents.find((event) => event.id === existing.event_id)) ||
      pickEventForMessage(orgEvents, attendeeEmails, [item.subject, item.bodyPreview]);
    const link = item.onlineMeeting?.joinUrl || item.webLink;
    if (!matchedEvent) {
      await cacheExternalCalendarEvent({
        profile,
        account,
        externalEventId: item.id,
        title: item.subject || "External calendar event",
        description: item.bodyPreview || "",
        startAt:
          item.start.timeZone === "UTC" ? `${item.start.dateTime}Z` : `${item.start.dateTime}Z`,
        endAt: item.end.timeZone === "UTC" ? `${item.end.dateTime}Z` : `${item.end.dateTime}Z`,
        timezone: item.start.timeZone || "America/Toronto",
        status: item.isCancelled ? "Cancelled" : "Confirmed",
        location: item.location?.displayName,
        meetingUrl: link,
        attendees: attendeeEmails,
        providerUpdatedAt: item.lastModifiedDateTime,
        rawProviderPayload: item,
      });
      result.cachedExternalEvents = (result.cachedExternalEvents ?? 0) + 1;
      result.skipped += 1;
      continue;
    }

    const payload = {
      organization_id: profile.organizationId,
      event_id: matchedEvent.id,
      organizer_id: account.user_id,
      connected_account_id: account.id,
      title: item.subject || "Calendar sync",
      meeting_type: item.isOnlineMeeting ? "Microsoft Teams" : "In Person",
      status: mapMeetingStatus(
        `${item.start.dateTime}Z`,
        `${item.end.dateTime}Z`,
        Boolean(item.isCancelled),
      ),
      start_at:
        item.start.timeZone === "UTC" ? `${item.start.dateTime}Z` : `${item.start.dateTime}Z`,
      end_at: item.end.timeZone === "UTC" ? `${item.end.dateTime}Z` : `${item.end.dateTime}Z`,
      attendees: attendeeEmails,
      agenda: item.bodyPreview || "",
      link: link ?? null,
      transcript: existing?.transcript ?? "",
      internal_summary: existing?.internal_summary ?? "",
      client_summary: existing?.client_summary ?? "",
      notes: existing?.notes ?? "",
      action_items: existing?.action_items ?? [],
      external_provider: "microsoft",
      external_calendar_id: account.calendar_id || "primary",
      external_event_id: item.id,
      external_conference_url: link ?? null,
      synced_at: new Date().toISOString(),
      timezone: item.start.timeZone || "UTC",
      sync_status: "Synced",
      provider_updated_at: item.lastModifiedDateTime ?? null,
    };

    const { error } = await supabaseAdmin.from("meetings").upsert(payload, {
      onConflict: "organization_id,external_provider,external_event_id",
    });
    if (error) throw error;
    if (existing) result.updatedMeetings += 1;
    else result.createdMeetings += 1;
  }

  await supabaseAdmin
    .from("connected_accounts")
    .update({
      last_calendar_synced_at: new Date().toISOString(),
      status: "Connected",
      last_error: null,
    })
    .eq("id", account.id);

  return result;
}

async function createGoogleCalendarMeeting(
  accessToken: string,
  account: ConnectedAccountRow,
  input: CreateMeetingInput,
) {
  const body: any = {
    summary: input.title,
    description: [input.agenda, input.notes].filter(Boolean).join("\n\n"),
    start: { dateTime: input.startAt },
    end: { dateTime: input.endAt },
    attendees: input.attendees.map((email) => ({ email })),
  };

  if (input.meetingType === "Google Meet") {
    body.conferenceData = {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const sendUpdates = input.attendees.length ? "all" : "none";
  let event: any;
  try {
    event = await googleApi<any>(
      accessToken,
      `/calendar/v3/calendars/${encodeURIComponent(account.calendar_id || "primary")}/events?conferenceDataVersion=1&sendUpdates=${sendUpdates}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  } catch (error) {
    throw new Error(
      `Google Calendar could not create this meeting: ${
        error instanceof Error ? error.message : "Unknown provider error."
      }`,
    );
  }

  const link =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === "video")
      ?.uri ||
    event.htmlLink;

  return {
    externalProvider: "google" as const,
    externalCalendarId: account.calendar_id || "primary",
    externalEventId: event.id as string,
    externalConferenceUrl: link as string | undefined,
    link: link as string | undefined,
  };
}

async function createMicrosoftCalendarMeeting(
  accessToken: string,
  account: ConnectedAccountRow,
  input: CreateMeetingInput,
) {
  const body = {
    subject: input.title,
    body: {
      contentType: "HTML",
      content: [input.agenda, input.notes].filter(Boolean).join("<br><br>"),
    },
    start: {
      dateTime: input.startAt.replace("Z", ""),
      timeZone: "UTC",
    },
    end: {
      dateTime: input.endAt.replace("Z", ""),
      timeZone: "UTC",
    },
    attendees: input.attendees.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    })),
    isOnlineMeeting: input.meetingType === "Microsoft Teams",
    onlineMeetingProvider: input.meetingType === "Microsoft Teams" ? "teamsForBusiness" : undefined,
  };

  const event = await microsoftGraphApi<any>(accessToken, "/me/events", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const link = event.onlineMeeting?.joinUrl || event.webLink;
  return {
    externalProvider: "microsoft" as const,
    externalCalendarId: account.calendar_id || "primary",
    externalEventId: event.id as string,
    externalConferenceUrl: link as string | undefined,
    link: link as string | undefined,
  };
}

export async function createOAuthStartUrl(
  request: Request,
  provider: IntegrationProvider,
  returnPath?: string,
) {
  const profile = await getAuthenticatedProfile(request);
  assertStaff(profile);
  return provider === "google"
    ? buildGoogleAuthorizationUrl(request, profile, returnPath)
    : buildMicrosoftAuthorizationUrl(request, profile, returnPath);
}

export async function handleOAuthCallback(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");

  if (!state) {
    return Response.redirect(`${getBaseUrl(request)}/ease-events/settings?integration=error`, 302);
  }

  let payload: OAuthStatePayload;
  try {
    payload = decodeState(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth state validation failed.";
    return Response.redirect(
      `${getBaseUrl(request)}${safeReturnPath("/ease-events/settings")}?integration=error&reason=${encodeURIComponent(message)}`,
      302,
    );
  }

  const redirectPath = safeReturnPath(payload.returnPath, "/ease-events/settings");

  if (providerError) {
    return Response.redirect(
      `${getBaseUrl(request)}${redirectPath}?integration=${payload.provider}&status=error&reason=${encodeURIComponent(providerError)}`,
      302,
    );
  }

  if (!code) {
    return Response.redirect(
      `${getBaseUrl(request)}${redirectPath}?integration=${payload.provider}&status=error&reason=missing_code`,
      302,
    );
  }

  try {
    if (payload.provider === "google") {
      const tokens = await exchangeGoogleCode(request, code);
      const googleProfile = await fetchGoogleProfile(tokens.access_token as string);
      await upsertConnectedAccount({
        organizationId: payload.organizationId,
        userId: payload.userId,
        provider: "google",
        providerAccountId: googleProfile.id as string,
        providerAccountEmail: (googleProfile.email as string) || "unknown@gmail.com",
        providerAccountName: googleProfile.name as string | undefined,
        scopes: typeof tokens.scope === "string" ? tokens.scope.split(" ") : googleScopes,
        accessToken: tokens.access_token as string,
        refreshToken: tokens.refresh_token as string | undefined,
        expiresIn: tokens.expires_in as number | undefined,
        calendarId: "primary",
      });
    } else {
      const tokens = await exchangeMicrosoftCode(request, code);
      const microsoftProfile = await fetchMicrosoftProfile(tokens.access_token as string);
      await upsertConnectedAccount({
        organizationId: payload.organizationId,
        userId: payload.userId,
        provider: "microsoft",
        providerAccountId: microsoftProfile.id as string,
        providerAccountEmail:
          (microsoftProfile.mail as string) ||
          (microsoftProfile.userPrincipalName as string) ||
          "unknown@outlook.com",
        providerAccountName: microsoftProfile.displayName as string | undefined,
        scopes: typeof tokens.scope === "string" ? tokens.scope.split(" ") : microsoftScopes,
        accessToken: tokens.access_token as string,
        refreshToken: tokens.refresh_token as string | undefined,
        expiresIn: tokens.expires_in as number | undefined,
        calendarId: "primary",
      });
    }

    return Response.redirect(
      `${getBaseUrl(request)}${redirectPath}?integration=${payload.provider}&status=connected`,
      302,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The provider account could not be connected.";
    return Response.redirect(
      `${getBaseUrl(request)}${redirectPath}?integration=${payload.provider}&status=error&reason=${encodeURIComponent(message)}`,
      302,
    );
  }
}

export async function disconnectConnectedAccount(request: Request, accountId: string) {
  const profile = await getAuthenticatedProfile(request);
  assertStaff(profile);
  const account = await getConnectedAccountForUser(profile, accountId);
  const { error } = await supabaseAdmin.from("connected_accounts").delete().eq("id", account.id);
  if (error) throw error;
  return { success: true };
}

export async function syncConnectedMailbox(request: Request, accountId: string) {
  const profile = await getAuthenticatedProfile(request);
  assertStaff(profile);
  const account = await getConnectedAccountForUser(profile, accountId);
  const accessToken = await getFreshAccessToken(account, request);

  try {
    return account.provider === "google"
      ? await syncMailboxGoogle(request, profile, account, accessToken)
      : await syncMailboxMicrosoft(profile, account, accessToken);
  } catch (error) {
    await updateConnectedAccountStatus(
      account.id,
      "Error",
      error instanceof Error ? error.message : "Mailbox sync failed.",
    );
    throw error;
  }
}

export async function sendProjectEmail(request: Request, input: SendProjectEmailInput) {
  const profile = await getAuthenticatedProfile(request);
  assertStaff(profile);

  const idempotencyKey =
    input.idempotencyKey ||
    `email-${input.threadId ?? input.thread?.eventId ?? input.eventId}-${createHash("sha256")
      .update(`${input.subject}:${input.body}:${input.to.join(",")}`)
      .digest("hex")
      .slice(0, 24)}`;

  const { data: existingMessage } = await supabaseAdmin
    .from("communication_messages")
    .select("*")
    .eq("organization_id", profile.organizationId)
    .contains("metadata", { idempotency_key: idempotencyKey })
    .maybeSingle();

  if (existingMessage) {
    return {
      threadId: existingMessage.thread_id,
      messageId: existingMessage.id,
      deliveryStatus: existingMessage.delivery_status ?? "Queued",
      deliveryMode: existingMessage.delivery_mode ?? getConfiguredEmailMode(),
      duplicate: true,
    };
  }

  let thread: any | null = null;
  if (input.threadId) {
    const { data, error } = await supabaseAdmin
      .from("communication_threads")
      .select("*")
      .eq("id", input.threadId)
      .eq("organization_id", profile.organizationId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Response("Communication thread not found.", { status: 404 });
    thread = data;
  } else if (input.thread) {
    const { data, error } = await supabaseAdmin
      .from("communication_threads")
      .insert({
        organization_id: profile.organizationId,
        project_id: input.thread.projectId ?? null,
        lead_id: input.thread.leadId ?? null,
        event_id: input.thread.eventId,
        assigned_to_id: input.thread.assignedToId ?? profile.id,
        subject: input.thread.subject,
        client_name_snapshot: input.thread.clientName,
        participants: input.thread.participants.length ? input.thread.participants : input.to,
        channel: "Email",
        status: "Waiting on Client",
        integration_source: "EaseEvents email",
        preview: input.body,
        unread_count: 0,
        last_activity_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    thread = data;
  } else {
    throw new Response("A thread id or thread draft is required.", { status: 400 });
  }

  const mode = getConfiguredEmailMode();
  const now = new Date().toISOString();
  const intendedRecipients = {
    to: input.to.map(normalizeEmail).filter(Boolean),
    cc: (input.cc ?? []).map(normalizeEmail).filter(Boolean),
    bcc: (input.bcc ?? []).map(normalizeEmail).filter(Boolean),
  };
  let actualRecipients = intendedRecipients;
  let subject = input.subject;
  let body = input.body;
  let htmlBody: string | undefined;
  let deliveryStatus = "Suppressed";
  let deliveryError: string | null = null;
  let account: ConnectedAccountRow | null = null;
  let externalMessageId: string | null = null;
  let externalThreadId: string | null = thread.external_thread_id ?? null;

  if (!intendedRecipients.to.length) {
    deliveryStatus = "Retry Required";
    deliveryError = "At least one recipient is required.";
  } else if (mode !== "disabled") {
    try {
      if (!input.accountId) {
        throw new Response("Select a connected mailbox before sending email.", { status: 400 });
      }
      account = await getConnectedAccountForUser(profile, input.accountId);
      assertSendScopes(account);
      const accessToken = await getFreshAccessToken(account, request);
      const organizationEmailSettings = await getOrganizationEmailSettings(profile.organizationId);
      const senderName =
        organizationEmailSettings.emailSenderName ||
        account.provider_account_name?.trim() ||
        profile.fullName ||
        account.provider_account_email;
      body = appendEmailSignature(input.body, organizationEmailSettings.emailSignature);
      htmlBody = textBodyToHtml(
        appendEmailSignatureForHtml(input.body, organizationEmailSettings.emailSignature),
      );

      if (mode === "test") {
        const testRecipient = normalizeEmail(process.env.EASE_EVENTS_TEST_EMAIL);
        if (!testRecipient) {
          deliveryStatus = "Retry Required";
          deliveryError = "EASE_EVENTS_TEST_EMAIL is required when EASE_EVENTS_EMAIL_MODE=test.";
        } else {
          actualRecipients = { to: [testRecipient], cc: [], bcc: [] };
          subject = `${process.env.EASE_EVENTS_TEST_EMAIL_PREFIX ?? "[EaseEvents Test]"} ${subject}`;
        }
      }

      if (!deliveryError) {
        const providerResult =
          account.provider === "google"
            ? await sendViaGoogleMailbox(accessToken, account, {
                ...actualRecipients,
                subject,
                body,
                htmlBody,
                fromName: senderName,
                externalThreadId,
              })
            : await sendViaMicrosoftMailbox(accessToken, {
                ...actualRecipients,
                subject,
                body,
                htmlBody,
              });
        externalMessageId = providerResult.id ?? null;
        externalThreadId = providerResult.threadId ?? externalThreadId;
        deliveryStatus = mode === "test" ? "Test Redirected" : "Sent";
      }
    } catch (error) {
      deliveryStatus = "Retry Required";
      if (error instanceof Response) {
        deliveryError = await error.text().catch(() => "Email send failed.");
      } else {
        deliveryError = error instanceof Error ? error.message : "Email send failed.";
      }
    }
  }

  const { data: message, error: messageError } = await supabaseAdmin
    .from("communication_messages")
    .insert({
      organization_id: profile.organizationId,
      project_id: input.projectId ?? thread.project_id ?? null,
      lead_id: input.leadId ?? thread.lead_id ?? null,
      event_id: input.eventId || thread.event_id || null,
      thread_id: thread.id,
      author_id: profile.id,
      direction: "Outbound",
      body,
      summary: `${deliveryStatus}: ${body.slice(0, 100)}`,
      visibility: input.visibility ?? "Client",
      external_provider: account?.provider ?? null,
      external_message_id: externalMessageId,
      delivery_status: deliveryStatus,
      delivery_mode: mode,
      delivery_error: deliveryError,
      sent_at: now,
      metadata: {
        idempotency_key: idempotencyKey,
        intended_recipients: intendedRecipients,
        actual_recipients: actualRecipients,
        subject,
        selected_account_id: input.accountId ?? null,
      },
    })
    .select("*")
    .single();

  if (messageError) throw messageError;

  await supabaseAdmin
    .from("communication_threads")
    .update({
      status: deliveryStatus === "Retry Required" ? "Needs Reply" : "Waiting on Client",
      preview: `${deliveryStatus}: ${body.slice(0, 140)}`,
      last_activity_at: now,
      external_provider: account?.provider ?? thread.external_provider ?? null,
      external_thread_id: externalThreadId,
      integration_source: account ? `${account.provider} send` : "EaseEvents email",
    })
    .eq("id", thread.id);

  return {
    threadId: thread.id,
    messageId: message.id,
    deliveryStatus,
    deliveryMode: mode,
    deliveryError,
    externalMessageId,
    externalThreadId,
  };
}

export async function syncConnectedCalendar(request: Request, accountId: string) {
  const profile = await getAuthenticatedProfile(request);
  assertStaff(profile);
  const account = await getConnectedAccountForUser(profile, accountId);
  const accessToken = await getFreshAccessToken(account, request);
  const startedAt = new Date().toISOString();
  let syncRunId: string | undefined;

  try {
    const { data } = await supabaseAdmin
      .from("calendar_sync_runs")
      .insert({
        organization_id: profile.organizationId,
        connected_account_id: account.id,
        provider: account.provider,
        status: "Started",
        started_at: startedAt,
      })
      .select("id")
      .single();
    syncRunId = data?.id;
  } catch (error) {
    if (!isMissingCalendarSchema(error)) throw error;
  }

  try {
    const result =
      account.provider === "google"
        ? await syncCalendarGoogle(profile, account, accessToken)
        : await syncCalendarMicrosoft(profile, account, accessToken);

    const completedAt = new Date().toISOString();
    const statePayload = {
      organization_id: profile.organizationId,
      connected_account_id: account.id,
      provider: account.provider,
      calendar_id: account.calendar_id || "primary",
      last_successful_sync_at: completedAt,
      last_attempted_sync_at: completedAt,
      last_error: null,
      metadata: {
        createdMeetings: result.createdMeetings,
        updatedMeetings: result.updatedMeetings,
        cachedExternalEvents: result.cachedExternalEvents ?? 0,
        skipped: result.skipped,
      },
    };

    await supabaseAdmin
      .from("calendar_sync_states")
      .upsert(statePayload, {
        onConflict: "organization_id,provider,calendar_id,connected_account_id",
      })
      .then(({ error }) => {
        if (error && !isMissingCalendarSchema(error)) throw error;
      });

    if (syncRunId) {
      await supabaseAdmin
        .from("calendar_sync_runs")
        .update({
          status: "Completed",
          completed_at: completedAt,
          imported_count: result.createdMeetings + (result.cachedExternalEvents ?? 0),
          updated_count: result.updatedMeetings,
          metadata: { skipped: result.skipped },
        })
        .eq("id", syncRunId);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar sync failed.";
    try {
      await supabaseAdmin.from("calendar_sync_states").upsert(
        {
          organization_id: profile.organizationId,
          connected_account_id: account.id,
          provider: account.provider,
          calendar_id: account.calendar_id || "primary",
          last_attempted_sync_at: new Date().toISOString(),
          last_error: message,
        },
        { onConflict: "organization_id,provider,calendar_id,connected_account_id" },
      );

      if (syncRunId) {
        await supabaseAdmin
          .from("calendar_sync_runs")
          .update({
            status: "Failed",
            completed_at: new Date().toISOString(),
            error_message: message,
          })
          .eq("id", syncRunId);
      }
    } catch (stateError) {
      if (!isMissingCalendarSchema(stateError)) throw stateError;
    }

    await updateConnectedAccountStatus(account.id, "Error", message);
    throw error;
  }
}

export async function createIntegratedMeeting(
  request: Request,
  input: CreateMeetingInput,
): Promise<MeetingRecord> {
  const profile = await getAuthenticatedProfile(request);
  assertStaff(profile);

  const { data: eventRecord, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("id", input.eventId)
    .eq("organization_id", profile.organizationId)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!eventRecord) {
    throw new Response("Event not found for this organization.", { status: 404 });
  }

  let externalData:
    | {
        externalProvider?: IntegrationProvider;
        externalCalendarId?: string;
        externalEventId?: string;
        externalConferenceUrl?: string;
        link?: string;
        connectedAccountId?: string;
      }
    | undefined;

  if (input.connectedAccountId) {
    const account = await getConnectedAccountForUser(profile, input.connectedAccountId);
    const accessToken = await getFreshAccessToken(account, request);

    if (input.meetingType === "Google Meet" && account.provider !== "google") {
      throw new Response("Select a Google-connected account to create a Google Meet.", {
        status: 400,
      });
    }

    if (input.meetingType === "Microsoft Teams" && account.provider !== "microsoft") {
      throw new Response("Select a Microsoft-connected account to create a Teams meeting.", {
        status: 400,
      });
    }

    try {
      externalData =
        account.provider === "google"
          ? await createGoogleCalendarMeeting(accessToken, account, input)
          : await createMicrosoftCalendarMeeting(accessToken, account, input);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "External calendar meeting creation failed.";
      await updateConnectedAccountStatus(account.id, "Error", message);
      throw new Error(message);
    }

    externalData.connectedAccountId = account.id;
    await updateConnectedAccountStatus(account.id, "Connected", null);
  }

  const payload = {
    organization_id: profile.organizationId,
    project_id: input.projectId ?? null,
    lead_id: input.leadId ?? null,
    event_id: input.eventId,
    title: input.title,
    meeting_type: input.meetingType,
    status: input.status,
    start_at: input.startAt,
    end_at: input.endAt,
    organizer_id: profile.id,
    connected_account_id: externalData?.connectedAccountId ?? input.connectedAccountId ?? null,
    external_provider: externalData?.externalProvider ?? input.externalProvider ?? null,
    external_calendar_id: externalData?.externalCalendarId ?? input.externalCalendarId ?? null,
    external_event_id: externalData?.externalEventId ?? input.externalEventId ?? null,
    external_conference_url:
      externalData?.externalConferenceUrl ?? input.externalConferenceUrl ?? null,
    synced_at:
      externalData?.externalEventId || input.connectedAccountId ? new Date().toISOString() : null,
    attendees: input.attendees,
    agenda: input.agenda,
    link: externalData?.link ?? input.link ?? null,
    transcript: input.transcript,
    internal_summary: input.internalSummary,
    client_summary: input.clientSummary,
    notes: input.notes,
    action_items: input.actionItems,
    timezone: input.timezone ?? "America/Toronto",
    sync_status:
      externalData?.externalEventId || input.connectedAccountId
        ? "Synced"
        : (input.syncStatus ?? "Not Synced"),
    sync_error: input.syncError ?? null,
    fathom_expected: input.fathomExpected ?? false,
    idempotency_key: input.idempotencyKey ?? null,
  };

  const { data, error } = await supabaseAdmin.from("meetings").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("Unable to save meeting.");
  return mapMeetingRow(data);
}
