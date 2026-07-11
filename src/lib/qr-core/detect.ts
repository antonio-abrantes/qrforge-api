import type { DataTemplate, TemplateDataMap } from './templates.js'

export interface DetectResult {
  type: DataTemplate | 'unknown'
  parsedData: Record<string, unknown>
}

export function detectDataType(data: string): DetectResult {
  const trimmed = data.trim()

  if (/^WIFI:/i.test(trimmed)) {
    return { type: 'wifi', parsedData: parseWifi(trimmed) }
  }
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    return { type: 'vcard', parsedData: parseVcard(trimmed) }
  }
  if (/^BEGIN:VCALENDAR/i.test(trimmed) || /BEGIN:VEVENT/i.test(trimmed)) {
    return { type: 'event', parsedData: parseEvent(trimmed) }
  }
  if (/^mailto:/i.test(trimmed)) {
    return { type: 'email', parsedData: parseMailto(trimmed) }
  }
  if (/^tel:/i.test(trimmed)) {
    return { type: 'phone', parsedData: { phone: trimmed.slice(4) } }
  }
  if (/^SMSTO:/i.test(trimmed)) {
    const rest = trimmed.slice(6)
    const idx = rest.indexOf(':')
    if (idx === -1) return { type: 'sms', parsedData: { phone: rest, message: '' } }
    return {
      type: 'sms',
      parsedData: { phone: rest.slice(0, idx), message: rest.slice(idx + 1) },
    }
  }
  if (/^geo:/i.test(trimmed)) {
    const [lat, lon] = trimmed.slice(4).split(',')
    return {
      type: 'location',
      parsedData: { latitude: Number(lat), longitude: Number(lon) },
    }
  }
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    return { type: 'url', parsedData: { url: trimmed } }
  }

  return { type: 'text', parsedData: { text: trimmed } }
}

function parseWifi(raw: string): TemplateDataMap['wifi'] {
  const body = raw.replace(/^WIFI:/i, '').replace(/;;$/, '')
  const fields: Record<string, string> = {}
  const re = /([TSPH]):((?:[^\\;]|\\.)*)/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    fields[match[1]!.toUpperCase()] = match[2]!.replace(/\\([\\;,:"'])/g, '$1')
  }
  const enc = (fields.T ?? 'nopass').toUpperCase()
  return {
    ssid: fields.S ?? '',
    encryption: enc === 'WEP' ? 'WEP' : enc === 'WPA' || enc === 'WPA2' ? 'WPA' : 'nopass',
    password: fields.P,
    hidden: (fields.H ?? '').toLowerCase() === 'true',
  }
}

function parseMailto(raw: string): TemplateDataMap['email'] {
  const without = raw.slice('mailto:'.length)
  const [address, qs] = without.split('?')
  const params = new URLSearchParams(qs ?? '')
  return {
    address: address ?? '',
    subject: params.get('subject') ?? undefined,
    body: params.get('body') ?? undefined,
    cc: params.get('cc') ?? undefined,
    bcc: params.get('bcc') ?? undefined,
  }
}

function parseVcard(raw: string): TemplateDataMap['vcard'] {
  const lines = raw.split(/\r?\n/)
  const get = (key: string) =>
    lines.find((l) => l.toUpperCase().startsWith(`${key}:`))?.slice(key.length + 1)

  const n = get('N')?.split(';') ?? []
  const version = (get('VERSION') as '2.1' | '3.0' | '4.0' | undefined) ?? '3.0'
  const adr = get('ADR')?.split(';') ?? []
  return {
    version,
    lastName: n[0] || undefined,
    firstName: n[1] || undefined,
    organization: get('ORG') || undefined,
    title: get('TITLE') || undefined,
    phone: get('TEL') || undefined,
    email: get('EMAIL') || undefined,
    url: get('URL') || undefined,
    street: adr[2] || undefined,
    city: adr[3] || undefined,
    state: adr[4] || undefined,
    zip: adr[5] || undefined,
    country: adr[6] || undefined,
  }
}

function parseEvent(raw: string): TemplateDataMap['event'] {
  const get = (key: string) => {
    const line = raw.split(/\r?\n/).find((l) => l.toUpperCase().startsWith(`${key}:`))
    return line?.slice(key.length + 1)
  }
  return {
    title: get('SUMMARY') ?? '',
    location: get('LOCATION') || undefined,
    startTime: get('DTSTART') ?? '',
    endTime: get('DTEND') || undefined,
  }
}
