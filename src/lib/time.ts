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
