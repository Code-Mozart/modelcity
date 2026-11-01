const pad = (n: number, size = 2) => String(n).padStart(size, '0');

/** `+01:00`, `-05:30`, `+00:00`: an offset in minutes east of UTC. */
export function offsetText(minutes: number): string {
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Local date and time of an instant for an offset in minutes: `YYYY-MM-DD hh:mm:ss`. */
export function formatAt(iso: string, offsetMinutes: number): string {
  const d = new Date(Date.parse(iso) + offsetMinutes * 60_000);
  const date = `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** The offset of this computer's time zone at that instant, minutes east of UTC. */
const localOffset = (iso: string) => -new Date(iso).getTimezoneOffset();

/** An instant in this computer's local time, `YYYY-MM-DD hh:mm:ss` (^190). */
export const formatLocal = (iso: string) => formatAt(iso, localOffset(iso));

/** The same with the offset, ISO 8601 style: `YYYY-MM-DDThh:mm:ss+01:00` (the tooltip of a date). */
export function formatLocalIso(iso: string): string {
  const offset = localOffset(iso);
  return `${formatAt(iso, offset).replace(' ', 'T')}${offsetText(offset)}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 1],
  ['minute', 60],
  ['hour', 3600],
  ['day', 86400],
  ['week', 604800],
];
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

/** After this many weeks a time is shown as a date again (^214). */
const AGO_WEEKS = 8;

/**
 * How long ago an instant was, `just now`, `1 second ago`, `17 minutes ago`, `2 weeks ago` (^214), up to
 * `AGO_WEEKS` weeks; after that, or for a time in the future, the date as in `formatLocal`.
 */
export function formatAgo(iso: string, nowMs: number): string {
  const seconds = Math.floor((nowMs - Date.parse(iso)) / 1000);
  if (seconds < 0 || seconds >= AGO_WEEKS * 604800) return formatLocal(iso);
  const [unit, size] = [...UNITS].reverse().find(([, s]) => seconds >= s) ?? UNITS[0]!;
  return seconds < 1 ? 'just now' : relative.format(-Math.floor(seconds / size), unit);
}
