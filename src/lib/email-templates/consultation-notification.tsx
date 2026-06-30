import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface ConsultationNotificationProps {
  fullName?: string
  companyName?: string
  workEmail?: string
  phoneNumber?: string
  businessDescription?: string
  teamSize?: string
  operationalChallenges?: string[]
  currentTools?: string
  biggestOpportunity?: string
  lookingFor?: string
  timeline?: string
}

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <Section style={rowSection}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </Section>
  ) : null

const ConsultationNotificationEmail = ({
  fullName,
  companyName,
  workEmail,
  phoneNumber,
  businessDescription,
  teamSize,
  operationalChallenges,
  currentTools,
  biggestOpportunity,
  lookingFor,
  timeline,
}: ConsultationNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      New consultation request from {fullName ?? 'a prospect'}
      {companyName ? ` (${companyName})` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New consultation request</Heading>
        <Text style={intro}>
          A new consultation request just came in via easeops.ca.
        </Text>

        <Hr style={hr} />
        <Heading as="h2" style={h2}>Contact</Heading>
        <Row label="Full name" value={fullName} />
        <Row label="Company" value={companyName} />
        <Row label="Work email" value={workEmail} />
        <Row label="Phone" value={phoneNumber} />

        <Hr style={hr} />
        <Heading as="h2" style={h2}>Business</Heading>
        <Row label="What the business does" value={businessDescription} />
        <Row label="Team size" value={teamSize} />

        <Hr style={hr} />
        <Heading as="h2" style={h2}>Challenges & stack</Heading>
        <Row
          label="Operational challenges"
          value={operationalChallenges?.length ? operationalChallenges.join(', ') : undefined}
        />
        <Row label="Current tools" value={currentTools} />

        <Hr style={hr} />
        <Heading as="h2" style={h2}>Opportunity & goals</Heading>
        <Row label="Biggest opportunity" value={biggestOpportunity} />
        <Row label="Looking for" value={lookingFor} />
        <Row label="Timeline" value={timeline} />

        <Hr style={hr} />
        <Text style={footer}>EaseOps Solutions Inc. — internal notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ConsultationNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New consultation request — ${data.fullName ?? 'Unknown'}${data.companyName ? ` (${data.companyName})` : ''}`,
  displayName: 'Consultation request (internal)',
  to: 'hello@easeops.ca',
  previewData: {
    fullName: 'Jane Doe',
    companyName: 'Acme Inc.',
    workEmail: 'jane@acme.com',
    phoneNumber: '+1 (555) 123-4567',
    businessDescription: 'B2B SaaS helping fintech teams reconcile transactions.',
    teamSize: '21–50',
    operationalChallenges: ['Too much manual work', 'Disconnected systems/tools'],
    currentTools: 'HubSpot, Airtable, QuickBooks',
    biggestOpportunity: 'Automating client onboarding (currently 3 days of manual work).',
    lookingFor: 'Workflow audit',
    timeline: 'Within 30 days',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Jost", "Century Gothic", "URW Gothic", "Avenir Next", Avenir, Futura, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 12px', letterSpacing: '-0.01em' }
const h2 = { fontSize: '13px', fontWeight: 600, color: '#0a0a0a', margin: '20px 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const intro = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#eaeaea', margin: '20px 0' }
const rowSection = { margin: '0 0 12px' }
const labelStyle = { fontSize: '11px', color: '#8a8d92', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }
const valueStyle = { fontSize: '14px', color: '#0a0a0a', margin: 0, lineHeight: '1.55', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
