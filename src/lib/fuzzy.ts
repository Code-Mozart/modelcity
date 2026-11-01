const isWordStart = (text: string, i: number) => i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1]!);

/**
 * How well `query` matches `text` as a fuzzy search (^178): all its characters appear in the text in
 * the same order, case ignored. Higher is better: characters that follow each other and characters
 * at the start of a word score more, gaps cost. Null if it does not match; 0 for an empty query.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const [q, t] = [query.trim().toLowerCase(), text.toLowerCase()];
  let [score, prev] = [0, -1];
  for (const ch of q) {
    const at = t.indexOf(ch, prev + 1);
    if (at < 0) return null;
    score +=
      10 + (at === prev + 1 ? 8 : 0) + (isWordStart(t, at) ? 6 : 0) - Math.min(at - prev - 1, 5);
    prev = at;
  }
  return score;
}

/** The items that match, best first; equally good ones keep their order (so the newest stay first). */
export function fuzzyFilter<T>(items: T[], query: string, textOf: (item: T) => string): T[] {
  if (!query.trim()) return items;
  return items
    .map((item, i) => ({ item, i, score: fuzzyScore(query, textOf(item)) }))
    .filter((m): m is { item: T; i: number; score: number } => m.score !== null)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((m) => m.item);
}
