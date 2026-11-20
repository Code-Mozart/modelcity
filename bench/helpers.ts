export const ms = (n: number) => Math.round(n);
export const mb = (bytes: number) => Math.round(bytes / 1e5) / 10;

/** The median, the 95th percentile and the greatest of some times. */
export function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  return {
    n: values.length,
    p50: ms(at(0.5) * 10) / 10,
    p95: ms(at(0.95) * 10) / 10,
    max: ms(sorted.at(-1) ?? 0),
  };
}
