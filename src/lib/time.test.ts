import { describe, expect, it } from 'vitest';
import { formatAgo, formatAt, offsetText } from './time';

describe('dates (^190)', () => {
  it('shows the local time as YYYY-MM-DD hh:mm:ss for an offset', () => {
    expect(formatAt('2026-11-01T17:18:09Z', 0)).toBe('2026-11-01 17:18:09');
    expect(formatAt('2026-11-01T17:18:09Z', 60)).toBe('2026-11-01 18:18:09');
    expect(formatAt('2026-12-31T23:30:00Z', 90)).toBe('2027-01-01 01:00:00');
    expect(formatAt('2026-01-01T02:05:07Z', -330)).toBe('2025-12-31 20:35:07');
  });

  it('writes an offset in minutes east of UTC like ISO 8601', () => {
    expect(offsetText(0)).toBe('+00:00');
    expect(offsetText(60)).toBe('+01:00');
    expect(offsetText(-330)).toBe('-05:30');
  });
});

describe('time ago (^214)', () => {
  const now = Date.parse('2026-11-01T12:00:00Z');
  const ago = (seconds: number) => formatAgo(new Date(now - seconds * 1000).toISOString(), now);

  it('counts seconds, minutes, hours, days and weeks, rounding down', () => {
    expect(ago(0)).toBe('0 seconds ago');
    expect(ago(1)).toBe('1 second ago');
    expect(ago(59)).toBe('59 seconds ago');
    expect(ago(60)).toBe('1 minute ago');
    expect(ago(17 * 60 + 40)).toBe('17 minutes ago');
    expect(ago(3600)).toBe('1 hour ago');
    expect(ago(23 * 3600)).toBe('23 hours ago');
    expect(ago(86400)).toBe('1 day ago');
    expect(ago(6 * 86400)).toBe('6 days ago');
    expect(ago(14 * 86400)).toBe('2 weeks ago');
    expect(ago(7 * 604800)).toBe('7 weeks ago');
  });

  it('is a date again after eight weeks, and for a time in the future', () => {
    expect(ago(8 * 604800)).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
    expect(formatAgo('2026-11-02T12:00:00Z', now)).toMatch(/^\d{4}-\d\d-\d\d /);
  });
});
