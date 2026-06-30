function readProcessEnv(name: string) {
  if (typeof process === "undefined") return undefined;
  return process.env[name];
}

export function hasSupabaseConfig() {
  return Boolean(
    (import.meta.env.VITE_SUPABASE_URL || readProcessEnv("SUPABASE_URL")) &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || readProcessEnv("SUPABASE_PUBLISHABLE_KEY")),
  );
}

export function hasOpenAIConfig() {
  return import.meta.env.VITE_OPENAI_ENABLED === "true";
}

export function hasStripeConfig() {
  return Boolean(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || readProcessEnv("STRIPE_PUBLISHABLE_KEY"),
  );
}

export function hasGoogleWorkspaceConfig() {
  return Boolean(
    import.meta.env.VITE_GOOGLE_WORKSPACE_ENABLED === "true" &&
    (import.meta.env.VITE_GOOGLE_CLIENT_ID || readProcessEnv("GOOGLE_CLIENT_ID")) &&
    (import.meta.env.VITE_GOOGLE_REDIRECT_URI || readProcessEnv("GOOGLE_REDIRECT_URI")),
  );
}

export function hasGoogleMeetConfig() {
  return hasGoogleWorkspaceConfig();
}

export function hasMicrosoft365Config() {
  return Boolean(
    import.meta.env.VITE_MICROSOFT_365_ENABLED === "true" &&
    (import.meta.env.VITE_MICROSOFT_CLIENT_ID || readProcessEnv("MICROSOFT_CLIENT_ID")) &&
    (import.meta.env.VITE_MICROSOFT_REDIRECT_URI || readProcessEnv("MICROSOFT_REDIRECT_URI")),
  );
}

export function getPublicEaseEventsOrganizationId() {
  return (
    import.meta.env.VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
    readProcessEnv("EASE_EVENTS_PUBLIC_ORGANIZATION_ID") ||
    ""
  );
}
