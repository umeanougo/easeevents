import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ClientPortalAccessSchema = z.object({
  eventId: z.string().min(1),
});

type SupabaseAdminClient = ReturnType<typeof createClient>;

function getBaseUrl(request: Request) {
  const configured = process.env.EASE_EVENTS_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findAuthUserByEmail(supabase: SupabaseAdminClient, email: string) {
  const targetEmail = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((item) => normalizeEmail(item.email ?? "") === targetEmail);
    if (user) return user;
    if (data.users.length < 100) return null;
  }

  return null;
}

export const Route = createFileRoute("/api/ease-events/client-portal-access")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
            { error: "Sign in with a Supabase staff account before inviting clients." },
            { status: 401 },
          );
        }

        const parsed = ClientPortalAccessSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid client portal request.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const token = authHeader.slice("Bearer ".length).trim();
        const {
          data: { user: requester },
          error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !requester) {
          return Response.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, organization_id, role")
          .eq("id", requester.id)
          .maybeSingle();

        if (profileError || !profile) {
          return Response.json({ error: "EaseEvents user profile not found." }, { status: 403 });
        }

        if (profile.role !== "admin" && profile.role !== "planner") {
          return Response.json(
            { error: "Only admins and planners can create client portal access." },
            { status: 403 },
          );
        }

        const { data: event, error: eventError } = await supabase
          .from("events")
          .select(
            "id, organization_id, client_name_snapshot, client_email, client_phone, client_user_id, event_name, clients(display_name)",
          )
          .eq("id", parsed.data.eventId)
          .maybeSingle();

        if (eventError || !event || event.organization_id !== profile.organization_id) {
          return Response.json({ error: "Event not found." }, { status: 404 });
        }

        const clientDisplayName = event.clients?.display_name ?? event.client_name_snapshot;
        const clientEmail = normalizeEmail(event.client_email ?? "");
        if (!clientEmail) {
          return Response.json(
            { error: "Add a client email to this event before creating portal access." },
            { status: 400 },
          );
        }

        const { data: existingProfile, error: existingProfileError } = await supabase
          .from("users")
          .select("id, organization_id, role, full_name, email, phone")
          .eq("organization_id", event.organization_id)
          .ilike("email", clientEmail)
          .maybeSingle();

        if (existingProfileError) {
          return Response.json(
            { error: "Unable to check existing client profile." },
            { status: 500 },
          );
        }

        let clientProfile = existingProfile;
        let inviteSent = false;
        let inviteError: string | undefined;

        if (!clientProfile) {
          let authUser = await findAuthUserByEmail(supabase, clientEmail);

          if (!authUser) {
            const redirectTo = `${getBaseUrl(request)}/ease-events/client-portal`;
            const invite = await supabase.auth.admin.inviteUserByEmail(clientEmail, {
              data: {
                full_name: clientDisplayName,
                organization_id: event.organization_id,
                role: "client",
                source: "ease-events-client-portal",
              },
              redirectTo,
            });

            if (invite.error) {
              inviteError = invite.error.message;
              authUser = await findAuthUserByEmail(supabase, clientEmail);
              if (!authUser) {
                return Response.json(
                  {
                    error:
                      "Unable to create the Supabase Auth invite for this client. Check Auth email settings, then try again.",
                    inviteError,
                  },
                  { status: 502 },
                );
              }
            } else {
              authUser = invite.data.user;
              inviteSent = true;
            }
          }

          const { data: createdProfile, error: createProfileError } = await supabase
            .from("users")
            .upsert(
              {
                id: authUser.id,
                organization_id: event.organization_id,
                role: "client",
                full_name: clientDisplayName,
                email: clientEmail,
                phone: event.client_phone ?? null,
              },
              { onConflict: "id" },
            )
            .select("id, organization_id, role, full_name, email, phone")
            .single();

          if (createProfileError || !createdProfile) {
            return Response.json(
              { error: "Unable to create the EaseEvents client profile." },
              { status: 500 },
            );
          }

          clientProfile = createdProfile;
        }

        const { error: updateEventError } = await supabase
          .from("events")
          .update({ client_user_id: clientProfile.id })
          .eq("id", event.id);

        if (updateEventError) {
          return Response.json(
            { error: "Client profile was created, but the event could not be linked." },
            { status: 500 },
          );
        }

        return Response.json({
          user: {
            id: clientProfile.id,
            organizationId: clientProfile.organization_id,
            role: clientProfile.role,
            fullName: clientProfile.full_name,
            email: clientProfile.email,
            phone: clientProfile.phone ?? undefined,
          },
          inviteSent,
          inviteError,
          clientPortalPath: "/ease-events/client-portal",
        });
      },
    },
  },
});
