/**
 * formatters.js
 * Currency, date, and helper formatters used across all components.
 */

/**
 * Format a number as Indian Rupee string.
 * formatCurrency(100000) → "₹1,00,000"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a date string or Date object as "15 Jan 2025"
 */
export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Days until expiry (negative = overdue).
 * @param {string|Date} expiryDate
 * @returns {number}
 */
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry - today) / 86400000)
}

/**
 * Derive status from days remaining.
 * @param {number} daysLeft
 * @returns {'expired'|'expiring'|'active'}
 */
export function getStatusFromDays(daysLeft) {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 30) return 'expiring'
  return 'active'
}

/**
 * Status badge styling config.
 */
export const STATUS_STYLES = {
  active:   { bg: 'bg-green-100', text: 'text-green-700', label: 'Active',        dot: '#16A34A' },
  expiring: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Expiring Soon', dot: '#F59E0B' },
  expired:  { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Expired',       dot: '#DC2626' },
  unknown:  { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Unknown',       dot: '#6B7280' },
}

/**
 * Pluralise a word.
 * pluralise(1, 'day') → '1 day'
 * pluralise(5, 'day') → '5 days'
 */
export function pluralise(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/**
 * Truncate a string to maxLength characters.
 */
export function truncate(str, maxLength = 40) {
  if (!str) return ''
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str
}

/**
 * Get greeting based on current hour.
 */
export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
