/** The size of a piece of text that is read at a time (^1256). */
export const PIECE = 1 << 20;

/** A text as pieces, the way a file arrives. */
export async function* piecesOfText(text: string): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += PIECE) yield text.slice(i, i + PIECE);
}

/** The text of a stream of bytes as pieces (a piece never ends inside a letter). */
export async function* piecesOfBytes(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) yield text;
    }
    const rest = decoder.decode();
    if (rest) yield rest;
  } finally {
    reader.releaseLock();
  }
}

/** The text of a file the user picked as pieces: a file that has a stream is never read whole (^1256). */
export async function* piecesOfFile(file: {
  text(): Promise<string>;
  stream?(): ReadableStream<Uint8Array>;
}): AsyncGenerator<string> {
  if (file.stream) yield* piecesOfBytes(file.stream());
  else yield* piecesOfText(await file.text());
}
