/**
 * Date utilities for handling timezone-safe local date operations.
 *
 * Problem: `new Date("YYYY-MM-DD")` parses the string as UTC midnight.
 * In UTC-3 (Brazil), that becomes the previous day when displayed locally.
 *
 * Fix: always use the split-and-construct approach to stay in local time.
 */

/**
 * Parses a "YYYY-MM-DD" date string as LOCAL midnight — no timezone offset.
 * Use this instead of `new Date(dateString)` for date-only values.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // local midnight, no UTC shift
}

/**
 * Formats a Date object as "YYYY-MM-DD" using LOCAL date components.
 * Use this instead of `date.toISOString().split('T')[0]` to avoid UTC conversion.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a "YYYY-MM-DD" string for display as "DD/MM/YYYY".
 * Safe for local dates — does not go through UTC.
 */
export function formatLocalDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
