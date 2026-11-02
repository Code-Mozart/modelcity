export type TextPart = { text: string } | { key: string };

/** A message with keys in square brackets, `press [S] to pin`: the text and the keys in order, a key is shown as a key cap (^210, ^32). */
export function partsOf(message: string): TextPart[] {
  return message
    .split(/\[([^\]]+)\]/)
    .map((piece, i): TextPart => (i % 2 ? { key: piece } : { text: piece }))
    .filter((p) => !('text' in p) || p.text !== '');
}
