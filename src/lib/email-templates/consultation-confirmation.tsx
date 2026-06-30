import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const LOGO_URL =
  'https://zdcjlsbrenzpjqnrzhuu.supabase.co/storage/v1/object/public/email-assets/easeops-logo.jpg'

interface ConsultationConfirmationProps {
  fullName?: string
}

const ConsultationConfirmationEmail = ({
  fullName,
}: ConsultationConfirmationProps) => {
  const firstName = fullName?.split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>We received your consultation request — EaseOps</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={LOGO_URL}
              alt="EaseOps"
              width="56"
              height="56"
              style={logo}
            />
          </Section>
          <Heading style={h1}>
            {firstName ? `Thanks, ${firstName}.` : 'Thanks for reaching out.'}
          </Heading>
          <Text style={text}>
            We received your consultation request and a member of the EaseOps
            team will get back to you within one business day.
          </Text>
          <Text style={text}>
            In the meantime, here's what to expect:
          </Text>
          <Section style={listSection}>
            <Text style={listItem}>
              <span style={bullet}>01</span> A short reply from us to confirm timing.
            </Text>
            <Text style={listItem}>
              <span style={bullet}>02</span> A 30-minute call — no pitch, just a conversation about your operations.
            </Text>
            <Text style={listItem}>
              <span style={bullet}>03</span> A clear next step tailored to your situation.
            </Text>
          </Section>
          <Text style={text}>
            If anything is time-sensitive, just reply to this email and it will
            reach us directly.
          </Text>
          <Text style={signature}>
            — The EaseOps team
            <br />
            <a href="https://easeops.ca" style={link}>easeops.ca</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ConsultationConfirmationEmail,
  subject: 'We received your consultation request — EaseOps',
  displayName: 'Consultation confirmation (prospect)',
  previewData: { fullName: 'Jane Doe' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Jost", "Century Gothic", "URW Gothic", "Avenir Next", Avenir, Futura, Arial, sans-serif' }
const container = { padding: '40px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 20px', letterSpacing: '-0.015em', lineHeight: '1.2' }
const text = { fontSize: '15px', color: '#3f4147', lineHeight: '1.65', margin: '0 0 18px' }
const listSection = { margin: '20px 0 24px' }
const listItem = { fontSize: '15px', color: '#3f4147', lineHeight: '1.6', margin: '0 0 10px' }
const bullet = { fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#6366f1', marginRight: '10px', letterSpacing: '0.04em' }
const signature = { fontSize: '14px', color: '#0a0a0a', margin: '28px 0 0', lineHeight: '1.6' }
const link = { color: '#6366f1', textDecoration: 'none' }
const logoSection = { margin: '0 0 24px' }
const logo = { borderRadius: '12px', display: 'block' }
