import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE_MS, VersionBanner } from './versionBanner.svelte';
import { MONIKER, TAB_TITLE, VERSION, VERSION_TEXT } from '../version';
import pkg from '../../../package.json';

describe('the version banner (^787)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is shown at load and stays until the first input', () => {
    const banner = new VersionBanner();
    vi.advanceTimersByTime(IDLE_MS * 10);
    expect(banner.visible).toBe(true);
  });

  it('is hidden by an input and comes back after the time without input', () => {
    const banner = new VersionBanner();
    banner.used();
    expect(banner.visible).toBe(false);
    vi.advanceTimersByTime(IDLE_MS - 1);
    expect(banner.visible).toBe(false);
    vi.advanceTimersByTime(1);
    expect(banner.visible).toBe(true);
  });

  it('starts the time again with every input', () => {
    const banner = new VersionBanner();
    banner.used();
    vi.advanceTimersByTime(IDLE_MS - 1);
    banner.used();
    vi.advanceTimersByTime(IDLE_MS - 1);
    expect(banner.visible).toBe(false);
  });
});

describe('the version text (^367, ^788)', () => {
  it('comes from package.json', () => {
    expect(VERSION).toBe(`v${pkg.version}`);
    expect(VERSION_TEXT).toBe(`${VERSION}: ${MONIKER}`);
    expect(TAB_TITLE).toBe(`modelcity ${VERSION_TEXT}`);
  });

  it('is v0.<PR number>.0 with a moniker', () => {
    expect(pkg.version).toMatch(/^0\.\d+\.0$/);
    expect(pkg.moniker.length).toBeGreaterThan(0);
  });
});
