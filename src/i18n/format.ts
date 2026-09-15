import { interpolate } from './locale.ts'
import type { Messages } from './types.ts'

const IDENTITY_ERRORS: Record<string, keyof Messages> = {
  'Add a product URL or @handle.': 'errorIdentityEmpty',
  'Enter a valid public URL or @handle.': 'errorIdentityInvalid',
  'Enter a valid public http(s) URL.': 'errorIdentityHttp',
  'Invite links are not allowed. Use a product URL or @handle.': 'errorIdentityInvite',
  'Checkout could not start.': 'errorCheckoutStart',
  'Mock settlement failed.': 'errorMockSettle',
}

export function localizeError(message: string, copy: Messages): string {
  const key = IDENTITY_ERRORS[message]
  return key ? String(copy[key]) : message
}

export function formatRelativeAge(settledAt: string, nowIso: string, copy: Messages): string {
  const deltaMs = Date.parse(nowIso) - Date.parse(settledAt)
  if (!Number.isFinite(deltaMs) || deltaMs < 45_000) return copy.ageNow
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 60) return minutes === 1 ? copy.ageMinute : interpolate(copy.ageMinutes, { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? copy.ageHour : interpolate(copy.ageHours, { count: hours })
  const days = Math.floor(hours / 24)
  return days === 1 ? copy.ageDay : interpolate(copy.ageDays, { count: days })
}

export function formatCount(value: number, htmlLang: string): string {
  return value.toLocaleString(htmlLang)
}

export function formatDaysLeft(days: number, copy: Messages): string {
  const rounded = Math.max(0, Math.ceil(days))
  if (rounded === 1) return copy.dayLeft
  return interpolate(copy.daysLeft, { count: rounded })
}

export function formatDurationShort(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`
}
