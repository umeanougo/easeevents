import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as consultationNotification } from './consultation-notification'
import { template as consultationConfirmation } from './consultation-confirmation'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'consultation-notification': consultationNotification,
  'consultation-confirmation': consultationConfirmation,
}
