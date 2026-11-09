import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

/** Guards the UI principle "good contrast, always" (^32) for the color tokens in app.css. */
type Tokens = Record<string, string>;

function tokensIn(block: string): Tokens {
  const out: Tokens = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]!] = m[2]!;
  return out;
}

const dark = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
const light = tokensIn(css.slice(0, css.indexOf('@media')));
const themes: Record<string, Tokens> = { light, dark: { ...light, ...tokensIn(dark) } };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** [foreground, background, minimum ratio]: 4.5 for text, 3 for graphics and component edges. */
const PAIRS: [string, string, number][] = [
  ['ink', 'bg', 4.5],
  ['ink', 'surface', 4.5],
  ['muted', 'surface', 4.5],
  ['muted', 'bg', 4.5],
  ['muted', 'panel', 4.5],
  ['ink', 'panel', 4.5],
  ['red-ink', 'bg', 4.5],
  ['orange-ink', 'bg', 4.5],
  ['key-ink', 'key-bg', 4.5],
  ['key-on-ink', 'key-on-bg', 4.5],
  ['btn-on-text', 'btn-on', 4.5],
  ['key-edge', 'bg', 3],
  ['key-edge', 'key-bg', 3],
  ['key-on-bg', 'bg', 3],
  ['blue', 'bg', 3],
  ['orange', 'bg', 3],
  ['turquoise', 'bg', 3],
  ['red', 'bg', 3],
];

describe.each(Object.entries(themes))('%s theme contrast', (_name, t) => {
  it.each(PAIRS)('%s on %s is at least %f:1', (fg, bg, min) => {
    expect(t[fg], `--${fg}`).toBeDefined();
    expect(t[bg], `--${bg}`).toBeDefined();
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(min);
  });
});

describe('one font size for all text (^83)', () => {
  it('app.css and the canvas text use the same size', async () => {
    const { FONT_PX } = await import('./render/paint');
    expect(css).toContain(`--font-size: ${FONT_PX}px;`);
  });
});
