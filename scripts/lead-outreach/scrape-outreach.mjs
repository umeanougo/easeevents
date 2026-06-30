#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_SOURCE = "https://365etobicoke.com/business-directory";
const DEFAULT_OUT_DIR = "scripts/lead-outreach/out";
const DEFAULT_WEBSITE = "https://easeops.ca";
const DEFAULT_FROM_NAME = "Ugo";
const DEFAULT_COMPANY = "EaseOps";
const USER_AGENT = "EaseOps lead research bot (+https://easeops.ca; manual review before outreach)";

const args = parseArgs(process.argv.slice(2));
const sources = args.source.length ? args.source : [DEFAULT_SOURCE];
const outDir = args.out ?? DEFAULT_OUT_DIR;
const maxPages = Number(args["max-pages"] ?? 5);
const limit = args.limit ? Number(args.limit) : Infinity;
const visitWebsites = Boolean(args["visit-websites"]);
const website = args.website ?? DEFAULT_WEBSITE;
const fromName = args["from-name"] ?? DEFAULT_FROM_NAME;
const company = args.company ?? DEFAULT_COMPANY;

if (args.help) {
  printHelp();
  process.exit(0);
}

const leads = [];
const seen = new Set();

for (const source of sources) {
  const sourceLeads = await scrapeSource(source, { maxPages });
  for (const lead of sourceLeads) {
    const key = `${lead.name}|${lead.website || lead.address || lead.phone}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    leads.push(lead);
    if (leads.length >= limit) break;
  }
  if (leads.length >= limit) break;
}

if (visitWebsites) {
  await enrichFromWebsites(leads);
}

const researched = leads.map((lead) => buildLeadResearch(lead, { website, fromName, company }));

await writeOutputs(researched, outDir);

console.log(`Scraped ${researched.length} lead(s).`);
console.log(`Wrote:`);
console.log(`- ${join(outDir, "leads.csv")}`);
console.log(`- ${join(outDir, "leads.jsonl")}`);
console.log(`- ${join(outDir, "summary.md")}`);
console.log(`- ${join(outDir, "drafts")}`);

function parseArgs(argv) {
  const parsed = { source: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const name = token.slice(2);
    if (["visit-websites", "help"].includes(name)) {
      parsed[name] = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }
    i += 1;
    if (name === "source") parsed.source.push(value);
    else parsed[name] = value;
  }
  return parsed;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/lead-outreach/scrape-outreach.mjs \\
    --source https://365etobicoke.com/business-directory \\
    --max-pages 3 \\
    --limit 25 \\
    --visit-websites

Options:
  --source URL          Directory URL. Repeat for multiple sources.
  --max-pages N        Query paginated directories with ?p=1..N. Default: 5.
  --limit N            Stop after N unique leads.
  --visit-websites     Visit business sites to find missing emails and page context.
  --out DIR            Output directory. Default: scripts/lead-outreach/out.
  --website URL        Your website in drafts. Default: https://easeops.ca.
  --from-name NAME     Sign-off name. Default: Ugo.
  --company NAME       Company name. Default: EaseOps.
`);
}

async function scrapeSource(source, options) {
  const found = [];
  const seenPageSignatures = new Set();

  for (let page = 1; page <= options.maxPages; page += 1) {
    const pageUrl = withPage(source, page);
    const html = await fetchHtml(pageUrl);
    const listings = extractListings(html, pageUrl);
    const signature = listings.map((listing) => listing.url || listing.name).join("|");
    if (!listings.length || seenPageSignatures.has(signature)) break;
    seenPageSignatures.add(signature);
    found.push(...listings);
  }

  return found;
}

function withPage(source, page) {
  const url = new URL(source);
  if (page > 1 || url.searchParams.has("p")) url.searchParams.set("p", String(page));
  if (!url.searchParams.has("view")) url.searchParams.set("view", "list");
  return url.toString();
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractListings(html, sourceUrl) {
  const blocks = blockByEntity(html);
  return blocks
    .map((block) => parseListingBlock(block, sourceUrl))
    .filter((listing) => listing.name);
}

function blockByEntity(html) {
  const starts = [
    ...html.matchAll(/<div id="sabai-entity-content-\d+"[^>]*directory-listing[^>]*>/g),
  ];
  return starts.map((match, index) => {
    const start = match.index;
    const end =
      starts[index + 1]?.index ?? html.indexOf('<div class="sabai-navigation-bottom"', start);
    return html.slice(start, end > start ? end : undefined);
  });
}

function parseListingBlock(block, sourceUrl) {
  const titleAnchor =
    matchFirst(
      block,
      /<div class="sabai-directory-title">[\s\S]*?<a\s+([^>]*?)>([\s\S]*?)<\/a>/i,
    ) ?? [];
  const titleAttrs = titleAnchor[1] ?? "";
  const name = cleanText(titleAnchor[2] ?? "");
  const url = absolutize(getAttr(titleAttrs, "href"), sourceUrl);

  const category = cleanText(
    matchFirst(
      block,
      /<div class="sabai-directory-category">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    )?.[1] ?? "",
  );

  const address = cleanText(
    matchFirst(
      block,
      /<span class="sabai-googlemaps-address[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    )?.[1] ?? "",
  );

  const phone =
    cleanText(matchFirst(block, /itemprop="telephone">([\s\S]*?)<\/span>/i)?.[1] ?? "") ||
    cleanText(matchFirst(block, /href="tel:[^"]+">([\s\S]*?)<\/a>/i)?.[1] ?? "");

  const emailText = cleanText(
    matchFirst(block, /sabai-directory-contact-email[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "",
  );
  const mailto = decodeEntityText(
    getAttr(
      matchFirst(block, /sabai-directory-contact-email[\s\S]*?<a\s+([^>]*?)>/i)?.[1] ?? "",
      "href",
    ).replace(/^mailto:/i, ""),
  );
  const email = firstValidEmail(emailText) ?? firstValidEmail(mailto) ?? "";

  const website = absolutize(
    getAttr(
      matchFirst(block, /sabai-directory-contact-website[\s\S]*?<a\s+([^>]*?)>/i)?.[1] ?? "",
      "href",
    ),
    sourceUrl,
  );

  const directoryDescription = cleanText(
    matchFirst(block, /<div class="sabai-directory-body">\s*([\s\S]*?)<\/div>/i)?.[1] ?? "",
  );

  return {
    sourceUrl,
    name,
    category,
    address,
    phone,
    email,
    emailSource: email ? "directory" : "",
    website,
    url,
    directoryDescription,
    researchedPages: [],
  };
}

async function enrichFromWebsites(leads) {
  for (const lead of leads) {
    if (!lead.website) continue;

    const pages = [lead.website];
    const homepage = await safeFetch(lead.website);
    if (!homepage) continue;

    lead.researchedPages.push(summarizePage(lead.website, homepage));
    for (const link of extractContactLinks(homepage, lead.website).slice(0, 3)) {
      if (!pages.includes(link)) pages.push(link);
    }

    for (const pageUrl of pages.slice(1)) {
      const html = await safeFetch(pageUrl);
      if (html) lead.researchedPages.push(summarizePage(pageUrl, html));
    }

    if (!lead.email) {
      const emails = lead.researchedPages.flatMap((page) => page.emails);
      lead.email = emails.find((email) => isLikelyBusinessEmail(email)) ?? emails[0] ?? "";
      lead.emailSource = lead.email ? "business website" : "";
    }
  }
}

async function safeFetch(url) {
  try {
    return await fetchHtml(url);
  } catch {
    return "";
  }
}

function summarizePage(url, html) {
  return {
    url,
    title: cleanText(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    metaDescription: cleanText(
      matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
        "",
    ),
    h1: cleanText(matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ""),
    emails: extractEmails(html),
    textSample: cleanText(html).slice(0, 800),
  };
}

function extractContactLinks(html, baseUrl) {
  const links = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  return links
    .map(([, href, label]) => ({
      href: absolutize(decodeEntityText(href), baseUrl),
      label: cleanText(label),
    }))
    .filter(
      ({ href, label }) =>
        href &&
        !href.startsWith("mailto:") &&
        new URL(href).origin === new URL(baseUrl).origin &&
        /contact|about|team|book|quote|service/i.test(`${href} ${label}`),
    )
    .map(({ href }) => href);
}

function buildLeadResearch(lead, settings) {
  const research = summarizeResearch(lead);
  const problem = identifyOperationalProblem(lead, research);
  const credibility = [
    "EaseOps builds automation, integrations, dashboards, and documentation for operators who are outgrowing manual handoffs.",
    "Example: a Moventory phase-one operations dashboard proposal consolidated multi-store Shopify fulfillment into one workspace for order status, queues, and exceptions.",
    "Common builds include intake forms, quote follow-up, CRM cleanup, appointment reminders, dashboard reporting, and tool-to-tool integrations.",
  ];
  const draft = buildDraft(lead, research, problem, credibility, settings);

  return {
    ...lead,
    research,
    operationalProblem: problem,
    credibility,
    outreachSubject: draft.subject,
    outreachBody: draft.body,
    reviewStatus: lead.email ? "ready_for_manual_review" : "missing_email",
  };
}

function summarizeResearch(lead) {
  const snippets = [
    lead.category ? `Listed category: ${lead.category}.` : "",
    lead.address ? `Local presence: ${lead.address}.` : "",
    lead.directoryDescription ? `Directory note: ${lead.directoryDescription}` : "",
    ...lead.researchedPages
      .map((page) => page.metaDescription || page.h1 || page.title || page.textSample)
      .filter(Boolean)
      .slice(0, 2)
      .map((text) => `Website signal: ${text}`),
  ].filter(Boolean);

  return snippets.join(" ");
}

function identifyOperationalProblem(lead, research) {
  const haystack = `${lead.name} ${lead.category} ${research}`.toLowerCase();
  const rules = [
    {
      match: /toastmasters|association|club|community|nonprofit|charity|church|volunteer/,
      problem:
        "member inquiries, meeting reminders, guest follow-up, volunteer coordination, and attendance tracking can get scattered across email threads and spreadsheets.",
    },
    {
      match: /restaurant|bakery|bar|pub|food|dining|winery|brewery|burger|pizza|seafood/,
      problem:
        "online orders, event inquiries, supplier tasks, and staff updates can easily scatter across phone calls, inboxes, and spreadsheets.",
    },
    {
      match:
        /contractor|construction|landscaping|plumbing|electric|bathroom|doors|windows|home|garden|lawn/,
      problem:
        "quote requests, site visits, materials, scheduling, and follow-ups can get hard to track once jobs are moving at different stages.",
    },
    {
      match: /pet|grooming|fitness|hearing|dental|medical|massage|chiropractic|clinic|pharmacy/,
      problem:
        "appointments, reminders, intake notes, and follow-ups can create a lot of manual admin between the front desk and service delivery.",
    },
    {
      match: /retail|shopping|gifts|sporting|books|clothing|supplies|store|pharmacy|appliances/,
      problem:
        "inventory, customer requests, purchase follow-ups, and online inquiries can become fragmented across POS, email, and supplier systems.",
    },
    {
      match: /real estate|legal|accounting|insurance|advertising|professional|financial|architect/,
      problem:
        "lead intake, qualification, document collection, follow-up, and reporting can be inconsistent when prospects arrive from many channels.",
    },
  ];

  return (
    rules.find((rule) => rule.match.test(haystack))?.problem ??
    "customer inquiries, follow-ups, reporting, and internal handoffs can become too manual as volume grows."
  );
}

function buildDraft(lead, research, problem, credibility, settings) {
  const subject = `${lead.name} operations idea`;
  const firstLine = lead.email ? `To: ${lead.email}` : "To: [find best contact email]";
  const opening = buildOpening(lead, research);
  const entityNoun = describeEntityNoun(lead, research);
  const body = `${firstLine}
Subject: ${subject}

Hi ${lead.name} team,

${opening}

One operational issue I would look for in a ${entityNoun} like yours: ${problem}

I run ${settings.company} (${settings.website}), where I build practical systems for small operators: workflow automation, CRM/intake cleanup, dashboards, and tool integrations. A recent example was a Moventory operations dashboard concept for consolidating multi-store Shopify fulfillment into one view; other examples include quote follow-up flows, appointment reminders, and real-time ops reporting.

Would it be useful if I mapped one workflow for ${lead.name} and sent over 2-3 specific automation ideas? No pressure, just a quick local operator-to-operator note.

Best,
${settings.fromName}
${settings.company}
${settings.website}

If this is not relevant, reply "not interested" and I will not follow up.`;

  return { subject, body };
}

function buildOpening(lead, research) {
  const category = usefulCategory(lead.category);
  const entityType = describeEntityType(lead, category, research);
  const intro = `I came across ${lead.name} while looking through local Etobicoke ${entityType}.`;
  const compliment = buildCompliment(lead, research);

  return `${intro} ${compliment} My business is also based in Etobicoke, and I am looking to see where I can be genuinely useful to other local operators.`;
}

function usefulCategory(category) {
  if (!category || /^(other|general)$/i.test(category.trim())) return "";
  return category.trim();
}

function describeEntityType(lead, category, research) {
  const haystack = `${lead.name} ${category} ${research}`.toLowerCase();

  if (/toastmasters|association|club/.test(haystack)) {
    return category && /association|club/i.test(category)
      ? category.toLowerCase()
      : "clubs and associations";
  }

  if (/nonprofit|charity|church|community|volunteer/.test(haystack)) {
    return "community organizations";
  }

  return category ? formatBusinessCategory(category) : "businesses";
}

function describeEntityNoun(lead, research) {
  const haystack = `${lead.name} ${lead.category} ${research}`.toLowerCase();

  if (/toastmasters|association|club/.test(haystack)) return "club";
  if (/nonprofit|charity|church|community|volunteer/.test(haystack))
    return "community organization";
  return "business";
}

function formatBusinessCategory(category) {
  const normalized = category.toLowerCase();
  if (/[,&]|s$/.test(normalized)) return normalized;
  return `${normalized} businesses`;
}

function buildCompliment(lead, research) {
  const haystack =
    `${lead.name} ${lead.category} ${lead.directoryDescription} ${research}`.toLowerCase();

  if (/toastmasters|public speaking|speaking and leadership/.test(haystack)) {
    return "I like that the club is helping people build confidence in public speaking and leadership.";
  }

  if (/winery|winemaking|wine/.test(haystack)) {
    return "I like that you are helping people turn winemaking into something local and hands-on.";
  }

  if (/landscaping|lawn care|new sod|stone walkway|garden/.test(haystack)) {
    return "I like that your work is so practical and visible in the neighbourhood.";
  }

  if (/restaurant|bar|pub|food|dining|burger|pizza|seafood|brewery/.test(haystack)) {
    return "I like seeing local spots that give people in the area a place to gather.";
  }

  if (/bakery|cakes?|cookies?|macarons?/.test(haystack)) {
    return "I like seeing local food businesses that put real craft into what they make.";
  }

  if (/pet grooming|grooming salon/.test(haystack)) {
    return "I like seeing local service businesses that build trust with repeat customers.";
  }

  return "I like seeing local operators putting real work into serving the Etobicoke community.";
}

async function writeOutputs(leads, outDir) {
  const draftsDir = join(outDir, "drafts");
  await mkdir(draftsDir, { recursive: true });

  await writeFile(
    join(outDir, "leads.jsonl"),
    leads.map((lead) => JSON.stringify(lead)).join("\n"),
  );
  await writeFile(join(outDir, "leads.csv"), toCsv(leads));
  await writeFile(join(outDir, "summary.md"), toSummary(leads));

  for (const lead of leads) {
    const slug = slugify(lead.name || "lead");
    await writeFile(join(draftsDir, `${slug}.txt`), lead.outreachBody);
  }
}

function toCsv(leads) {
  const fields = [
    "name",
    "category",
    "email",
    "emailSource",
    "phone",
    "website",
    "address",
    "url",
    "sourceUrl",
    "reviewStatus",
    "operationalProblem",
    "outreachSubject",
  ];
  return [
    fields.join(","),
    ...leads.map((lead) => fields.map((field) => csvCell(lead[field] ?? "")).join(",")),
  ].join("\n");
}

function toSummary(leads) {
  const ready = leads.filter((lead) => lead.email).length;
  const lines = [
    "# Lead Outreach Summary",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Leads: ${leads.length}`,
    `Ready for manual review: ${ready}`,
    `Missing email: ${leads.length - ready}`,
    "",
    "## Compliance Notes",
    "",
    "- Review every draft before sending.",
    "- Do not email suppressed/unsubscribed contacts.",
    "- Include accurate sender identity and a working opt-out path.",
    "- Avoid scraped role inboxes when a better consented or direct contact exists.",
    "",
    "## Leads",
    "",
  ];

  for (const lead of leads) {
    lines.push(
      `- ${lead.name}${lead.email ? ` <${lead.email}>` : " (missing email)"} - ${lead.category || "uncategorized"} - ${lead.operationalProblem}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function matchFirst(text, regex) {
  return regex.exec(text);
}

function getAttr(attrs, name) {
  const match = new RegExp(`${name}=["']([^"']*)["']`, "i").exec(attrs);
  return match ? decodeEntityText(match[1]) : "";
}

function cleanText(value) {
  return decodeEntityText(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function decodeEntityText(value) {
  return String(value)
    .replace(/\\\//g, "/")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractEmails(text) {
  const decoded = decodeEntityText(text);
  return [
    ...new Set(
      [...decoded.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)]
        .map(([email]) => email.toLowerCase())
        .filter(isLikelyBusinessEmail),
    ),
  ];
}

function firstValidEmail(text) {
  return extractEmails(text)[0];
}

function isLikelyBusinessEmail(email) {
  return !/(example\.com|sentry\.io|wixpress\.com|wordpress|schema\.org)/i.test(email);
}

function absolutize(value, baseUrl) {
  if (!value || value.startsWith("mailto:") || value.startsWith("tel:")) return value;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function csvCell(value) {
  const text = String(value).replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
