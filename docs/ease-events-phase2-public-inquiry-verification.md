# EaseEvents Phase 2 Public Inquiry Upload Verification

## Architecture Decision

Public inquiry uploads use the existing durable `projects` model. No parallel project model was added.

The anonymous browser can submit inquiry details and file manifests, but it cannot choose `organization_id`, `project_id`, or a Supabase Storage path. The backend resolves the public organization from trusted configuration, creates/reuses the client, lead, project, primary communication thread, acknowledgment record, and upload slots, then returns a short-lived opaque upload token.

Files are uploaded through `/api/ease-events/public-inquiry/upload`. The server validates the upload token, file slot, MIME type, size, filename, and file signature before writing to the private `event-files` bucket. Storage paths are generated as:

```text
{organization_id}/projects/{project_id}/inquiry/{upload_id}-{sanitized_filename}
```

Anonymous users never receive the Supabase service-role key and never get broad storage list/read/write permissions.

## Email Modes

Use one of:

```text
EASE_EVENTS_EMAIL_MODE=disabled
EASE_EVENTS_EMAIL_MODE=test
EASE_EVENTS_EMAIL_MODE=live
```

- `disabled`: records the intended acknowledgment with `Suppressed` delivery status and does not contact the provider.
- `test`: redirects to `EASE_EVENTS_TEST_EMAIL`, prefixes with `EASE_EVENTS_TEST_EMAIL_PREFIX`, and records the intended recipient in metadata.
- `live`: sends to the real prospective client.

Local development and automated tests must use `disabled` or `test`.

## Automated Verification

Apply migrations, run the app, then run:

```bash
supabase db push --linked --include-all --yes
npm run build
npm run dev -- --host 127.0.0.1 --port 8083
npm run events:phase2:e2e
```

The e2e script verifies:

- public inquiry creation with two inspiration links
- two images and one PDF
- one lead, one project, and one primary communication thread
- three project-scoped upload metadata rows and file records
- safe acknowledgment recording in non-live email mode
- lead workspace route availability
- internal note and call logging
- project task with link and attachment
- lead-to-event continuity on the same project
- no guessed invoice creation
- payment-terms setup task
- duplicate submission retry without duplicate records
- anonymous RLS/storage access denial
- unsupported type, too-large file, too many files, duplicate filename, and expired token handling

The script refuses to run when `EASE_EVENTS_EMAIL_MODE=live`.

## Cleanup

The e2e script cleans up automatically unless `EASE_EVENTS_E2E_KEEP_DATA=true`.

Manual cleanup for retained runs:

```bash
npm run events:phase2:cleanup -- easeevents-e2e-REPLACE_ME
```

Cleanup is narrowly scoped to `public_inquiry_submissions.test_identifier` values that start with `easeevents-e2e-`. It deletes only records and storage objects connected to that test identifier.

## Manual Checklist

1. Open `/ease-events/inquiry`.
2. Submit a new inquiry with two inspiration links.
3. Attach JPG, PNG, WEBP, or PDF files.
4. Confirm previews, remove-before-submit, progress, failure copy, and retry controls are visible.
5. In `disabled` email mode, confirm the lead is created and the acknowledgment is recorded as `Suppressed`.
6. In `test` email mode, confirm the actual recipient is `EASE_EVENTS_TEST_EMAIL` and the prospective client is stored only as intended recipient metadata.
7. Open the lead workspace and confirm inquiry details, inspiration links, files, and communication history are visible.
8. Add an internal note, log a call, add a task with a link/attachment, and convert the lead.
9. Confirm the event uses the same project and retains files, notes, calls, messages, meetings, and tasks.
10. Confirm no invoice is created unless real payment terms are configured.

## Failure Cases

Covered automatically where practical:

- unsupported MIME type
- file too large
- too many files
- duplicate filename
- expired upload token
- double submission/idempotency retry
- anonymous database/storage access

Covered by route behavior and manual/provider simulation:

- interrupted upload: retry the failed file row in the inquiry form
- email provider failure: set test mode without `EASE_EVENTS_TEST_EMAIL`; inquiry still completes with `Retry Required`
- database insert failure after upload: upload route removes the uploaded object when metadata creation fails
- storage failure after project creation: upload slot is marked `failed` and the inquiry remains created
