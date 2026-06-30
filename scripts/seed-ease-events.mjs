import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const orgId = "00000000-0000-4000-8000-000000000001";

const authUsers = [
  {
    key: "admin",
    email: "owner@cococabana.demo",
    password: "demo123",
    fullName: "Ava Montero",
    role: "admin",
    phone: "416-555-0101",
  },
  {
    key: "planner",
    email: "planner@cococabana.demo",
    password: "demo123",
    fullName: "Maya Singh",
    role: "planner",
    phone: "416-555-0102",
  },
  {
    key: "planner2",
    email: "talia@cococabana.demo",
    password: "demo123",
    fullName: "Talia Brooks",
    role: "planner",
    phone: "416-555-0103",
  },
  {
    key: "client",
    email: "client@cococabana.demo",
    password: "demo123",
    fullName: "Nisha Patel",
    role: "client",
    phone: "416-555-0138",
  },
  {
    key: "client2",
    email: "sofia@cococabana.demo",
    password: "demo123",
    fullName: "Sofia Rivera",
    role: "client",
    phone: "416-555-0197",
  },
  {
    key: "vendor",
    email: "vendor@cococabana.demo",
    password: "demo123",
    fullName: "Elena Brooks",
    role: "vendor",
    phone: "416-555-0160",
  },
];

async function ensureAuthUser(user) {
  const created = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.fullName, role: user.role },
  });

  if (!created.error && created.data.user) return created.data.user.id;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const existing = data.users.find(
    (item) => item.email?.toLowerCase() === user.email.toLowerCase(),
  );
  if (!existing) throw created.error;
  return existing.id;
}

async function upsert(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  const userIds = {};
  for (const user of authUsers) {
    userIds[user.key] = await ensureAuthUser(user);
  }

  await upsert("organizations", [
    {
      id: orgId,
      name: "Coco Cabana Events",
      slug: "coco-cabana",
      timezone: "America/Toronto",
      currency: "CAD",
    },
  ]);

  await upsert(
    "users",
    authUsers.map((user) => ({
      id: userIds[user.key],
      organization_id: orgId,
      role: user.role,
      full_name: user.fullName,
      email: user.email,
      phone: user.phone,
    })),
  );

  const leads = [
    [
      "10000000-0000-4000-8000-000000000001",
      userIds.planner,
      "New Inquiry",
      "Grace Wilson",
      "grace.wilson@example.com",
      "416-555-0184",
      "Luxury birthday dinner",
      "2026-08-22",
      70,
      "$12k-$18k",
      "Interested in tropical dinner styling, lounge rentals, florals, and a champagne wall.",
      "Instagram",
    ],
    [
      "10000000-0000-4000-8000-000000000002",
      userIds.admin,
      "Consultation Scheduled",
      "Jordan Miles",
      "jordan.miles@example.com",
      "647-555-0122",
      "Engagement party",
      "2026-09-05",
      120,
      "$25k-$35k",
      "Venue shortlisted. Needs decor concept, vendor coordination, and budget guardrails.",
      "Referral",
    ],
    [
      "10000000-0000-4000-8000-000000000003",
      userIds.planner,
      "Proposal Sent",
      "Amara Cole",
      "amara.cole@example.com",
      "289-555-0131",
      "Brand launch",
      "2026-10-02",
      180,
      "$45k-$60k",
      "Proposal should separate must-have and stretch options with a media wall.",
      "Website",
    ],
    [
      "10000000-0000-4000-8000-000000000004",
      userIds.admin,
      "Booked",
      "Nisha Patel",
      "nisha.patel@example.com",
      "416-555-0138",
      "Sangeet and reception",
      "2026-06-28",
      260,
      "$40k-$55k",
      "Converted from HoneyBook. Requires vendor handoffs and client approval lane.",
      "HoneyBook import",
    ],
    [
      "10000000-0000-4000-8000-000000000005",
      userIds.planner,
      "Lost",
      "Evan Martin",
      "evan.martin@example.com",
      "905-555-0110",
      "Corporate holiday party",
      "2026-12-12",
      220,
      "$20k-$28k",
      "Paused planning until Q4 budgets are approved.",
      "Google Search",
    ],
  ].map(
    ([
      id,
      owner_id,
      stage,
      client_name,
      email,
      phone,
      event_type,
      event_date,
      estimated_guest_count,
      budget_range,
      notes,
      source,
    ]) => ({
      id,
      organization_id: orgId,
      owner_id,
      stage,
      client_name,
      email,
      phone,
      event_type,
      event_date,
      estimated_guest_count,
      budget_range,
      notes,
      source,
    }),
  );
  await upsert("leads", leads);

  const events = [
    [
      "20000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000004",
      userIds.client,
      userIds.admin,
      "Nisha Patel",
      "nisha.patel@example.com",
      "416-555-0138",
      "Patel Sangeet & Reception",
      "Wedding celebration",
      "2026-06-28",
      "17:00",
      "01:00",
      "Arlington Estate, Vaughan",
      260,
      "Awaiting Client Approval",
      42000,
      "Client wants warm modern palette with high-impact florals.",
      "Vendor load-in begins at 8:00 AM. Client reveal targeted for 4:15 PM.",
    ],
    [
      "20000000-0000-4000-8000-000000000002",
      null,
      userIds.client2,
      userIds.planner,
      "Sofia Rivera",
      "sofia@example.com",
      "416-555-0197",
      "Rivera Garden Bridal Shower",
      "Bridal shower",
      "2026-07-12",
      "12:30",
      "16:30",
      "Graydon Hall Manor, Toronto",
      84,
      "Planning",
      16800,
      "Garden party palette approved. Keep rentals compact for venue access.",
      "Install florals by 10:30 AM. Dessert table photos before guests enter.",
    ],
    [
      "20000000-0000-4000-8000-000000000003",
      null,
      null,
      userIds.admin,
      "Lena Chen",
      "lena.chen@example.com",
      "647-555-0170",
      "Chen Foundation Summer Gala",
      "Fundraising gala",
      "2026-08-09",
      "18:00",
      "23:30",
      "Evergreen Brick Works, Toronto",
      310,
      "Confirmed",
      73500,
      "High sponsor visibility. Production run-of-show needs one owner.",
      "Silent auction opens at 6:15 PM. Main program starts at 8:00 PM.",
    ],
    [
      "20000000-0000-4000-8000-000000000004",
      null,
      null,
      userIds.planner,
      "Priya Morrison",
      "priya.morrison@example.com",
      "905-555-0144",
      "Morrison Baby Shower",
      "Baby shower",
      "2026-05-30",
      "13:00",
      "17:00",
      "Private residence, Oakville",
      52,
      "Completed",
      9250,
      "Post-event summary should capture referral opportunity.",
      "Completed with no outstanding vendor issues.",
    ],
  ].map(
    ([
      id,
      lead_id,
      client_user_id,
      planner_id,
      client_name,
      client_email,
      client_phone,
      event_name,
      event_type,
      event_date,
      start_time,
      end_time,
      location,
      guest_count,
      status,
      client_price,
      internal_notes,
      timeline_notes,
    ]) => ({
      id,
      organization_id: orgId,
      lead_id,
      client_user_id,
      planner_id,
      client_name,
      client_email,
      client_phone,
      event_name,
      event_type,
      event_date,
      start_time,
      end_time,
      location,
      guest_count,
      status,
      client_price,
      internal_notes,
      timeline_notes,
    }),
  );
  await upsert("events", events);
  await supabase
    .from("leads")
    .update({ converted_event_id: "20000000-0000-4000-8000-000000000001" })
    .eq("id", "10000000-0000-4000-8000-000000000004");

  await upsert("event_team_members", [
    {
      id: "21000000-0000-4000-8000-000000000001",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000001",
      user_id: userIds.admin,
      role_label: "Lead planner",
    },
    {
      id: "21000000-0000-4000-8000-000000000002",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000001",
      user_id: userIds.planner,
      role_label: "Production planner",
    },
    {
      id: "21000000-0000-4000-8000-000000000003",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000001",
      user_id: userIds.planner2,
      role_label: "Vendor coordinator",
    },
    {
      id: "21000000-0000-4000-8000-000000000004",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000002",
      user_id: userIds.planner,
      role_label: "Lead planner",
    },
    {
      id: "21000000-0000-4000-8000-000000000005",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000002",
      user_id: userIds.planner2,
      role_label: "Design support",
    },
    {
      id: "21000000-0000-4000-8000-000000000006",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000003",
      user_id: userIds.admin,
      role_label: "Lead planner",
    },
    {
      id: "21000000-0000-4000-8000-000000000007",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000003",
      user_id: userIds.planner2,
      role_label: "Logistics planner",
    },
    {
      id: "21000000-0000-4000-8000-000000000008",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000004",
      user_id: userIds.planner,
      role_label: "Lead planner",
    },
  ]);

  const vendors = [
    [
      "30000000-0000-4000-8000-000000000001",
      "Bloom Haven Floral",
      "Florals",
      "Elena Brooks",
      "hello@bloomhaven.example",
      "416-555-0160",
      "https://bloomhaven.example",
      "Strong with large-scale floral moments and modern ceremony arches.",
      5,
    ],
    [
      "30000000-0000-4000-8000-000000000002",
      "Luxe Linen & Rentals",
      "Rentals",
      "Marco Di Luca",
      "orders@luxelinen.example",
      "416-555-0152",
      "https://luxelinen.example",
      "Reliable delivery windows. Ask for inventory holds two weeks out.",
      4,
    ],
    [
      "30000000-0000-4000-8000-000000000003",
      "Saffron Table Catering",
      "Catering",
      "Rina Shah",
      "events@saffrontable.example",
      "905-555-0164",
      null,
      "Best fit for South Asian fusion menus and late-night stations.",
      5,
    ],
    [
      "30000000-0000-4000-8000-000000000004",
      "BrightBox Photo",
      "Photography",
      "Theo Grant",
      "studio@brightbox.example",
      "647-555-0165",
      null,
      "Fast turnaround for social preview galleries.",
      4,
    ],
    [
      "30000000-0000-4000-8000-000000000005",
      "Sonic Arc Entertainment",
      "Entertainment",
      "Naomi Lee",
      "bookings@sonicarc.example",
      "416-555-0140",
      null,
      "DJ plus percussion add-on available.",
      5,
    ],
    [
      "30000000-0000-4000-8000-000000000006",
      "Evergreen Venue Group",
      "Venue",
      "Claire An",
      "events@evergreenvenue.example",
      "416-555-0129",
      null,
      "Strict dock schedule.",
      4,
    ],
    [
      "30000000-0000-4000-8000-000000000007",
      "Event Staffing Co.",
      "Staffing",
      "Dev Patel",
      "crew@eventstaffing.example",
      "289-555-0107",
      null,
      "Great captain pool for high-touch guest experiences.",
      4,
    ],
    [
      "30000000-0000-4000-8000-000000000008",
      "Cabana Customs Fabrication",
      "Decor",
      "Mila Torres",
      "builds@cabanacustoms.example",
      "647-555-0199",
      null,
      "Builds statement bars, plinths, signage, and photo moments.",
      5,
    ],
  ].map(([id, name, service_category, contact_name, email, phone, website, notes, rating]) => ({
    id,
    organization_id: orgId,
    name,
    service_category,
    contact_name,
    email,
    phone,
    website,
    notes,
    rating,
  }));
  await upsert("vendors", vendors);

  const eventVendors = [
    [
      "40000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000001",
      "Florals",
      7800,
      8200,
      "Deposit Paid",
      "Add mandap floral refresh between ceremony and reception.",
    ],
    [
      "40000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000003",
      "Catering",
      14200,
      14500,
      "Partially Paid",
      "Confirm late-night dosa station headcount.",
    ],
    [
      "40000000-0000-4000-8000-000000000003",
      "20000000-0000-4000-8000-000000000002",
      "30000000-0000-4000-8000-000000000002",
      "Rentals",
      3800,
      3800,
      "Deposit Paid",
      "Hold garden chairs and blush linens.",
    ],
    [
      "40000000-0000-4000-8000-000000000004",
      "20000000-0000-4000-8000-000000000003",
      "30000000-0000-4000-8000-000000000006",
      "Venue",
      18500,
      18500,
      "Partially Paid",
      "Venue balance due after final guest count.",
    ],
  ].map(
    ([
      id,
      event_id,
      vendor_id,
      service_category,
      quoted_amount,
      actual_amount,
      payment_status,
      notes,
    ]) => ({
      id,
      organization_id: orgId,
      event_id,
      vendor_id,
      service_category,
      quoted_amount,
      actual_amount,
      payment_status,
      notes,
    }),
  );
  await upsert("event_vendors", eventVendors);

  const budgetItems = [
    [
      "50000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000001",
      "Decor",
      "Custom stage, bar wrap, signage, and lounge styling",
      9500,
      10200,
      "30000000-0000-4000-8000-000000000008",
      5000,
      "2026-06-20",
      4200,
    ],
    [
      "50000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000001",
      "Florals",
      "Mandap florals, centerpieces, and entry installation",
      7800,
      8200,
      "30000000-0000-4000-8000-000000000001",
      3500,
      "2026-06-18",
      2100,
    ],
    [
      "50000000-0000-4000-8000-000000000003",
      "20000000-0000-4000-8000-000000000001",
      "Catering",
      "Dinner, late-night station, and staff meals",
      14200,
      14500,
      "30000000-0000-4000-8000-000000000003",
      9000,
      "2026-06-24",
      3200,
    ],
    [
      "50000000-0000-4000-8000-000000000004",
      "20000000-0000-4000-8000-000000000001",
      "Staffing",
      "Lead planner, assistants, and strike crew",
      4200,
      3900,
      "30000000-0000-4000-8000-000000000007",
      1200,
      "2026-06-28",
      2500,
    ],
    [
      "50000000-0000-4000-8000-000000000005",
      "20000000-0000-4000-8000-000000000002",
      "Rentals",
      "Garden chairs, linens, parasols, and glassware",
      3800,
      3800,
      "30000000-0000-4000-8000-000000000002",
      1900,
      "2026-07-01",
      1200,
    ],
    [
      "50000000-0000-4000-8000-000000000006",
      "20000000-0000-4000-8000-000000000002",
      "Florals",
      "Tablescape blooms and dessert display florals",
      3200,
      3100,
      "30000000-0000-4000-8000-000000000001",
      1500,
      "2026-07-05",
      1400,
    ],
    [
      "50000000-0000-4000-8000-000000000007",
      "20000000-0000-4000-8000-000000000003",
      "Venue",
      "Venue rental, dock access, and security",
      18500,
      18500,
      "30000000-0000-4000-8000-000000000006",
      9000,
      "2026-07-20",
      3500,
    ],
    [
      "50000000-0000-4000-8000-000000000008",
      "20000000-0000-4000-8000-000000000003",
      "Catering",
      "Reception canapes, plated dinner, bar package",
      26500,
      27100,
      "30000000-0000-4000-8000-000000000003",
      12000,
      "2026-08-03",
      5200,
    ],
    [
      "50000000-0000-4000-8000-000000000009",
      "20000000-0000-4000-8000-000000000004",
      "Decor",
      "Balloon wall, dessert backdrop, and tabletop styling",
      3100,
      3000,
      "30000000-0000-4000-8000-000000000008",
      3000,
      "2026-05-25",
      1700,
    ],
    [
      "50000000-0000-4000-8000-000000000010",
      "20000000-0000-4000-8000-000000000004",
      "Rentals",
      "Dessert stands, linens, and lounge vignette",
      1650,
      1600,
      "30000000-0000-4000-8000-000000000002",
      1600,
      "2026-05-28",
      600,
    ],
  ].map(
    ([
      id,
      event_id,
      category,
      description,
      planned_amount,
      actual_amount,
      vendor_id,
      paid_amount,
      due_date,
      margin_estimate,
    ]) => ({
      id,
      organization_id: orgId,
      event_id,
      category,
      description,
      planned_amount,
      actual_amount,
      vendor_id,
      paid_amount,
      due_date,
      margin_estimate,
    }),
  );
  await upsert("budget_items", budgetItems);

  const tasks = [
    [
      "60000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000001",
      userIds.admin,
      "Send final budget approval packet",
      "Bundle budget summary, variance notes, and vendor balance schedule.",
      "2026-06-10",
      "In Progress",
      "Urgent",
    ],
    [
      "60000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000001",
      userIds.planner2,
      "Host vendor production call",
      "Walk through load-in, reveal timing, and strike path.",
      "2026-06-14",
      "To Do",
      "High",
    ],
    [
      "60000000-0000-4000-8000-000000000003",
      "20000000-0000-4000-8000-000000000002",
      userIds.planner2,
      "Upload revised moodboard",
      "Swap linen image and add cocktail table reference.",
      "2026-06-21",
      "To Do",
      "Medium",
    ],
    [
      "60000000-0000-4000-8000-000000000004",
      "20000000-0000-4000-8000-000000000003",
      userIds.admin,
      "Approve sponsor wall fabrication",
      "Review logo layout and confirm production timeline.",
      "2026-06-19",
      "In Progress",
      "High",
    ],
    [
      "60000000-0000-4000-8000-000000000005",
      "20000000-0000-4000-8000-000000000004",
      userIds.planner,
      "Write post-event summary",
      "Capture wins, issues, referrals, and budget performance.",
      "2026-06-03",
      "Done",
      "Low",
    ],
  ].map(([id, event_id, owner_id, title, description, due_date, status, priority]) => ({
    id,
    organization_id: orgId,
    event_id,
    owner_id,
    title,
    description,
    due_date,
    status,
    priority,
  }));
  await upsert("tasks", tasks);

  await upsert("task_checklist_items", [
    {
      id: "70000000-0000-4000-8000-000000000001",
      organization_id: orgId,
      task_id: "60000000-0000-4000-8000-000000000001",
      title: "Review updated catering quote",
      is_complete: true,
      sort_order: 1,
    },
    {
      id: "70000000-0000-4000-8000-000000000002",
      organization_id: orgId,
      task_id: "60000000-0000-4000-8000-000000000001",
      title: "Attach approval PDF",
      is_complete: false,
      sort_order: 2,
    },
  ]);

  const approvals = [
    [
      "80000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000001",
      "Budget",
      "Final budget and variance approval",
      "Client approval required before remaining vendor deposits.",
      "Pending",
      "2026-06-15",
    ],
    [
      "80000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000001",
      "Timeline",
      "Production timeline",
      "Confirm reveal, speeches, entertainment, and late-night station timing.",
      "Pending",
      "2026-06-16",
    ],
    [
      "80000000-0000-4000-8000-000000000003",
      "20000000-0000-4000-8000-000000000002",
      "Moodboard",
      "Garden party moodboard",
      "Client requested one linen image change before approval.",
      "Changes Requested",
      "2026-06-18",
    ],
    [
      "80000000-0000-4000-8000-000000000004",
      "20000000-0000-4000-8000-000000000003",
      "Budget",
      "Gala production budget",
      "Finance lead needs approval view by category and vendor.",
      "Pending",
      "2026-06-22",
    ],
  ].map(([id, event_id, type, title, description, status, due_date]) => ({
    id,
    organization_id: orgId,
    event_id,
    type,
    title,
    description,
    status,
    due_date,
    requested_by: userIds.admin,
  }));
  await upsert("approvals", approvals);

  await upsert("files", [
    {
      id: "90000000-0000-4000-8000-000000000001",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000001",
      uploaded_by: userIds.admin,
      category: "Contracts",
      storage_path: `${orgId}/20000000-0000-4000-8000-000000000001/contracts/planning-agreement.pdf`,
      name: "Patel signed planning agreement.pdf",
      mime_type: "application/pdf",
      size_bytes: 410000,
    },
    {
      id: "90000000-0000-4000-8000-000000000002",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000002",
      uploaded_by: userIds.planner,
      category: "Vendor Quotes",
      storage_path: `${orgId}/20000000-0000-4000-8000-000000000002/vendor-quotes/luxe-linen.pdf`,
      name: "Luxe Linen quote - Rivera.pdf",
      mime_type: "application/pdf",
      size_bytes: 320000,
    },
  ]);

  await upsert("comments", [
    {
      id: "91000000-0000-4000-8000-000000000001",
      organization_id: orgId,
      event_id: "20000000-0000-4000-8000-000000000001",
      author_id: userIds.admin,
      body: "Need client confirmation on whether the family wants cold sparks during the grand entrance.",
      visibility: "Internal",
    },
  ]);

  const { error: bucketError } = await supabase.storage.createBucket("event-files", {
    public: false,
  });
  if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
    throw bucketError;
  }

  console.log("EaseEvents seed complete.");
  console.log("Demo login: owner@cococabana.demo / demo123");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
