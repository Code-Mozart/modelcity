import { describe, expect, it } from 'vitest';
import { formatAt, offsetText } from './time';

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
