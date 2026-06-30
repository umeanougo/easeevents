import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/components'
import * as React from 'react'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'EaseOps'
const SENDER_DOMAIN = 'notify.easeops.ca'
const FROM_DOMAIN = 'easeops.ca'

const SHEETS_SPREADSHEET_ID = '1ug1u8jEskPTwsTYf9m1hE_WDDfmsRh9xhcis_S6ldZ0'
const SHEETS_TAB_NAME = 'Sheet1'
const SHEETS_GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_sheets/v4'

async function appendToSheet(data: z.infer<typeof ConsultationSchema>, submissionId: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')
  const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY
  if (!GOOGLE_SHEETS_API_KEY) throw new Error('GOOGLE_SHEETS_API_KEY is not configured')

  const range = `${SHEETS_TAB_NAME}!A:N`
  const url = `${SHEETS_GATEWAY_URL}/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

  const row = [
    new Date().toISOString(),
    submissionId,
    data.fullName,
    data.companyName,
    data.workEmail,
    data.phoneNumber || '',
    data.teamSize,
    data.lookingFor,
    data.timeline,
    (data.operationalChallenges || []).join(', '),
    data.currentTools || '',
    data.businessDescription,
    data.biggestOpportunity,
  ]

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_SHEETS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Sheets append failed [${res.status}]: ${body}`)
  }
}

const ConsultationSchema = z.object({
  fullName: z.string().min(1).max(120),
  companyName: z.string().min(1).max(180),
  workEmail: z.string().email().max(255),
  phoneNumber: z.string().max(60).optional().default(''),
  businessDescription: z.string().max(4000).optional().default(''),
  teamSize: z.string().max(40).optional().default(''),
  operationalChallenges: z.array(z.string().max(120)).max(40).optional().default([]),
  currentTools: z.string().max(2000).optional().default(''),
  biggestOpportunity: z.string().min(1).max(4000),
  lookingFor: z.string().max(120).optional().default('Workflow audit'),
  timeline: z.string().min(1).max(120),
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function enqueueOne(
  supabase: any,
  templateName: string,
  recipient: string,
  templateData: Record<string, any>,
  idempotencyKey: string,
) {
  const template = TEMPLATES[templateName]
  if (!template) throw new Error(`Template '${templateName}' not found`)

  const effectiveRecipient = (template.to || recipient).toLowerCase()
  const messageId = crypto.randomUUID()

  // Suppression check
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient)
    .maybeSingle()
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })
    return { skipped: true }
  }

  // Get/create unsubscribe token
  let unsubscribeToken: string
  const { data: existingToken } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', effectiveRecipient)
    .maybeSingle()

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    await supabase.from('email_unsubscribe_tokens').upsert(
      { token: unsubscribeToken, email: effectiveRecipient },
      { onConflict: 'email', ignoreDuplicates: true },
    )
    const { data: stored } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', effectiveRecipient)
      .maybeSingle()
    unsubscribeToken = stored?.token ?? unsubscribeToken
  } else {
    return { skipped: true }
  }

  // Render
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  // Log pending
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (error) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    throw error
  }
  return { queued: true, messageId }
}

export const Route = createFileRoute('/api/public/consultation')({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      },
      POST: async ({ request }) => {
        const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500, headers: corsHeaders },
          )
        }

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json(
            { error: 'Invalid JSON' },
            { status: 400, headers: corsHeaders },
          )
        }

        const parsed = ConsultationSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { error: 'Validation failed', issues: parsed.error.issues },
            { status: 400, headers: corsHeaders },
          )
        }
        const data = parsed.data

        const supabase = createClient(supabaseUrl, serviceKey)
        const submissionId = crypto.randomUUID()

        try {
          // Notification to internal team (template has fixed `to`)
          await enqueueOne(
            supabase,
            'consultation-notification',
            'hello@easeops.ca',
            data,
            `consultation-notify-${submissionId}`,
          )
          // Confirmation to prospect
          await enqueueOne(
            supabase,
            'consultation-confirmation',
            data.workEmail,
            { fullName: data.fullName },
            `consultation-confirm-${submissionId}`,
          )
        } catch (err) {
          console.error('Consultation email enqueue failed', err)
          return Response.json(
            { error: 'Failed to send notification emails' },
            { status: 500, headers: corsHeaders },
          )
        }

        // Append to Google Sheet (non-fatal: log but don't fail the request)
        try {
          await appendToSheet(data, submissionId)
        } catch (err) {
          console.error('Google Sheets append failed', err)
        }

        return Response.json(
          { success: true },
          { status: 200, headers: corsHeaders },
        )
      },
    },
  },
})
