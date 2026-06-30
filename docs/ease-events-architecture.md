# EaseEvents Architecture

```mermaid
flowchart TB
  subgraph Users["Users"]
    Admin["Admin / Owner"]
    Planner["Planner"]
    Client["Client"]
    Vendor["Vendor"]
    PublicLead["Public inquiry submitter"]
  end

  subgraph App["EaseEvents Web App - Next.js / TanStack Start / React"]
    PublicRoutes["Public routes\nInquiry form, consultation"]
    ProtectedRoutes["Protected app routes\nDashboard, Leads, Events, Tasks, Budgets,\nVendors, Calendar, Communications, Files, Reports"]
    ClientPortal["Client portal\nApprovals, files, meetings, payments"]
    VendorPortal["Vendor views\nAssignments, event context"]
    UIState["EaseEvents store\nRole-aware data access, demo fallback,\nSupabase-backed refresh"]
  end

  subgraph ServerRoutes["Backend API Routes"]
    AuthBridge["Supabase auth/profile checks"]
    CheckoutAPI["Stripe checkout API\nPayment session creation"]
    ClientInviteAPI["Client portal access API\nAuth invite + event link"]
    MeetingAPI["Meeting creation API\nGoogle Meet / Teams / local meeting"]
    OAuthAPI["OAuth start/callback APIs\nGoogle Workspace + Microsoft 365"]
    SyncAPI["Mail + calendar sync APIs"]
    FathomAPI["Fathom ingestion APIs\nMeetings, import, sync"]
    AIAPI["AI summary API\nMeeting summary enrichment"]
  end

  subgraph Supabase["Supabase"]
    SupabaseAuth["Auth\nEmail/password, invited clients, staff users"]
    Postgres["Postgres\nMulti-tenant organization_id tables"]
    Storage["Storage\nContracts, inspiration images, receipts,\nvendor quotes, event documents"]
    RLS["RLS policies\nRole + organization scoped access"]
  end

  subgraph DataModel["Core Data Model"]
    Organizations["organizations"]
    UsersTable["users"]
    Leads["leads"]
    Events["events"]
    EventTeam["event_team_members"]
    Tasks["tasks + task_checklist_items"]
    Budgets["budget_items"]
    Vendors["vendors + event_vendors"]
    Approvals["approvals"]
    Files["files"]
    Communications["communication_threads + communication_messages"]
    Meetings["meetings + meeting_notes"]
    ConnectedAccounts["connected_accounts"]
  end

  subgraph Integrations["External Services"]
    Stripe["Stripe\nCheckout-ready payments"]
    Google["Google Workspace\nGmail, Calendar, Meet"]
    Microsoft["Microsoft 365\nOutlook, Calendar, Teams"]
    Fathom["Fathom\nMeeting summaries, transcripts,\naction items"]
    OpenAI["OpenAI\nOptional low-cost AI enrichment"]
  end

  Admin --> ProtectedRoutes
  Planner --> ProtectedRoutes
  Client --> ClientPortal
  Vendor --> VendorPortal
  PublicLead --> PublicRoutes

  PublicRoutes --> UIState
  ProtectedRoutes --> UIState
  ClientPortal --> UIState
  VendorPortal --> UIState

  UIState --> AuthBridge
  UIState --> CheckoutAPI
  UIState --> ClientInviteAPI
  UIState --> MeetingAPI
  UIState --> OAuthAPI
  UIState --> SyncAPI
  UIState --> FathomAPI
  UIState --> AIAPI

  AuthBridge --> SupabaseAuth
  AuthBridge --> Postgres
  CheckoutAPI --> Stripe
  CheckoutAPI --> Postgres
  ClientInviteAPI --> SupabaseAuth
  ClientInviteAPI --> Postgres
  MeetingAPI --> Google
  MeetingAPI --> Microsoft
  MeetingAPI --> Postgres
  OAuthAPI --> Google
  OAuthAPI --> Microsoft
  OAuthAPI --> ConnectedAccounts
  SyncAPI --> Google
  SyncAPI --> Microsoft
  SyncAPI --> Communications
  SyncAPI --> Meetings
  FathomAPI --> Fathom
  FathomAPI --> Meetings
  FathomAPI --> Communications
  AIAPI --> OpenAI
  AIAPI --> Meetings

  Postgres --> RLS
  Storage --> RLS
  Postgres --> Organizations
  Postgres --> UsersTable
  Postgres --> Leads
  Postgres --> Events
  Postgres --> EventTeam
  Postgres --> Tasks
  Postgres --> Budgets
  Postgres --> Vendors
  Postgres --> Approvals
  Postgres --> Files
  Postgres --> Communications
  Postgres --> Meetings
  Postgres --> ConnectedAccounts

  Files --> Storage
  Leads --> Events
  Events --> EventTeam
  Events --> Tasks
  Events --> Budgets
  Events --> Vendors
  Events --> Approvals
  Events --> Files
  Events --> Communications
  Events --> Meetings
```

## Key Flows

```mermaid
sequenceDiagram
  actor Lead as Inquiry submitter
  actor Planner as Planner/Admin
  actor Client as Client
  participant App as EaseEvents app
  participant DB as Supabase Postgres
  participant Auth as Supabase Auth
  participant Google as Google/Microsoft
  participant Fathom as Fathom
  participant Stripe as Stripe

  Lead->>App: Submit inquiry
  App->>DB: Create lead scoped by organization_id
  Planner->>App: Qualify lead and edit details
  App->>DB: Update lead stage/details
  Planner->>App: Book + create event
  App->>DB: Create event, kickoff task, proposal approval, event team member
  Planner->>App: Create client portal access
  App->>Auth: Invite or reuse client auth account
  App->>DB: Link client_user_id to event
  Client->>App: Open client portal
  App->>DB: Read only assigned client event
  Planner->>App: Schedule meeting
  App->>Google: Create calendar event / Meet or Teams link
  App->>DB: Store meeting
  Fathom->>App: Meeting data pulled by API key sync
  App->>DB: Store meeting notes and communication thread
  Planner->>App: Request payment
  App->>Stripe: Create checkout session
  Stripe-->>Client: Hosted checkout
```

## Deployment Notes

- The app is multi-tenant from day one through `organization_id` on EaseEvents records.
- Browser clients never receive server-only credentials such as `SUPABASE_SERVICE_ROLE_KEY`, Google/Microsoft client secrets, `FATHOM_API_KEY`, Stripe secret key, or OpenAI API key.
- Supabase RLS protects tenant and role boundaries; server API routes use service-level access only for privileged workflows such as client invites, OAuth token sync, and checkout creation.
- Demo mode remains a local fallback for walkthroughs, but production behavior is Supabase-backed.
