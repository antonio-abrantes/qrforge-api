export type DataTemplate =
  | 'text'
  | 'url'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'vcard'
  | 'location'
  | 'event'

export type TemplateDataMap = {
  text: { text: string }
  url: { url: string }
  email: {
    address: string
    subject?: string
    body?: string
    cc?: string
    bcc?: string
  }
  phone: { phone: string }
  sms: { phone: string; message?: string }
  wifi: {
    ssid: string
    encryption: 'nopass' | 'WEP' | 'WPA'
    password?: string
    hidden?: boolean
  }
  vcard: {
    firstName?: string
    lastName?: string
    organization?: string
    title?: string
    phone?: string
    email?: string
    url?: string
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    version?: '2.1' | '3.0' | '4.0'
  }
  location: { latitude: number; longitude: number }
  event: {
    title: string
    location?: string
    startTime: string
    endTime?: string
  }
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"'])/g, '\\$1')
}

function ensureHttps(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  return `https://${url}`
}

export function encodeFromTemplate<T extends DataTemplate>(
  template: T,
  data: TemplateDataMap[T],
): string {
  switch (template) {
    case 'text': {
      const d = data as TemplateDataMap['text']
      return d.text
    }
    case 'url': {
      const d = data as TemplateDataMap['url']
      return ensureHttps(d.url)
    }
    case 'email': {
      const d = data as TemplateDataMap['email']
      const params = new URLSearchParams()
      if (d.subject) params.set('subject', d.subject)
      if (d.body) params.set('body', d.body)
      if (d.cc) params.set('cc', d.cc)
      if (d.bcc) params.set('bcc', d.bcc)
      const qs = params.toString()
      return `mailto:${d.address}${qs ? `?${qs}` : ''}`
    }
    case 'phone': {
      const d = data as TemplateDataMap['phone']
      return `tel:${d.phone}`
    }
    case 'sms': {
      const d = data as TemplateDataMap['sms']
      return `SMSTO:${d.phone}:${d.message ?? ''}`
    }
    case 'wifi': {
      const d = data as TemplateDataMap['wifi']
      const t = d.encryption === 'nopass' ? 'nopass' : d.encryption
      const parts = [
        `T:${t}`,
        `S:${escapeWifi(d.ssid)}`,
        d.password ? `P:${escapeWifi(d.password)}` : '',
        d.hidden ? 'H:true' : '',
      ].filter(Boolean)
      return `WIFI:${parts.join(';')};;`
    }
    case 'vcard': {
      const d = data as TemplateDataMap['vcard']
      const version = d.version ?? '3.0'
      const fn = [d.firstName, d.lastName].filter(Boolean).join(' ')
      const n = `${d.lastName ?? ''};${d.firstName ?? ''};;;`
      const lines = [
        'BEGIN:VCARD',
        `VERSION:${version}`,
        `N:${n}`,
        `FN:${fn}`,
      ]
      if (d.organization) lines.push(`ORG:${d.organization}`)
      if (d.title) lines.push(`TITLE:${d.title}`)
      if (d.phone) lines.push(`TEL:${d.phone}`)
      if (d.email) lines.push(`EMAIL:${d.email}`)
      if (d.url) lines.push(`URL:${d.url}`)
      if (d.street || d.city || d.state || d.zip || d.country) {
        lines.push(
          `ADR:;;${d.street ?? ''};${d.city ?? ''};${d.state ?? ''};${d.zip ?? ''};${d.country ?? ''}`,
        )
      }
      lines.push('END:VCARD')
      return lines.join('\n')
    }
    case 'location': {
      const d = data as TemplateDataMap['location']
      return `geo:${d.latitude},${d.longitude}`
    }
    case 'event': {
      const d = data as TemplateDataMap['event']
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `SUMMARY:${d.title}`,
        `DTSTART:${toIcalDate(d.startTime)}`,
      ]
      if (d.endTime) lines.push(`DTEND:${toIcalDate(d.endTime)}`)
      if (d.location) lines.push(`LOCATION:${d.location}`)
      lines.push('END:VEVENT', 'END:VCALENDAR')
      return lines.join('\n')
    }
    default:
      throw new Error(`Unsupported template: ${template}`)
  }
}

function toIcalDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return value.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
