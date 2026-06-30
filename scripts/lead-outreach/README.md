# Lead Outreach Scraper

Scrapes public business directory pages, enriches leads with contact emails when available, and writes manual-review outreach drafts for EaseOps.

It does not send email. Review every draft before sending and keep your unsubscribe/suppression process up to date.

## Run

```bash
node scripts/lead-outreach/scrape-outreach.mjs \
  --source https://365etobicoke.com/business-directory \
  --max-pages 3 \
  --limit 25 \
  --visit-websites
```

Add more directories by repeating `--source`:

```bash
node scripts/lead-outreach/scrape-outreach.mjs \
  --source https://365etobicoke.com/business-directory \
  --source https://example.com/local-directory \
  --max-pages 2 \
  --limit 50
```

## Outputs

- `scripts/lead-outreach/out/leads.csv`
- `scripts/lead-outreach/out/leads.jsonl`
- `scripts/lead-outreach/out/summary.md`
- `scripts/lead-outreach/out/drafts/*.txt`

Each lead includes:

- business name, category, address, phone, website, source URL
- contact email and where it was found
- researched signals from the listing and website
- a specific inferred operational problem
- credibility points and examples
- a draft email with your website and opt-out line

## Notes

- Use `--visit-websites` only when you want the script to fetch each business website for missing emails and extra context.
- Use `--limit` for test runs.
- The default sender website is `https://easeops.ca`; override it with `--website`.
- The default sign-off name is `Ugo`; override it with `--from-name`.
