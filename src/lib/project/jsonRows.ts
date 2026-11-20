/** What a `TopLevelReader` found: a value of the top-level object, or a batch of the rows of an array that is read in pieces. */
export type Found = { key: string; value: unknown } | { key: string; rows: unknown[] };

/** The rows that go out together (^1256). */
export const ROW_BATCH = 5000;

const QUOTE = 34;
const BACKSLASH = 92;
const isSpace = (c: number) => c === 32 || c === 10 || c === 13 || c === 9;

type Begin = (i: number) => void;
type Finish = (i: number) => string;

type State = 'start' | 'key' | 'colon' | 'value' | 'rows' | 'row' | 'nested' | 'scalar' | 'done';

/**
 * Reads the text of a JSON object piece by piece (^1256) without ever holding all of it: a value
 * is parsed when it is complete, and the elements of the arrays named in `rowKeys` (`nodes` and
 * `edges`) are given in batches as they are completed, each parsed on its own. Only what lies
 * between two pieces is kept. Text that is not valid JSON throws a `SyntaxError`.
 */
export class TopLevelReader {
  private state: State = 'start';
  private key = '';
  private depth = 0;
  private inString = false;
  private escaped = false;
  /** What a string that is being read is: the key of a value, or (any other) part of a value. */
  private stringIsKey = false;
  private held = '';
  private collecting = false;
  private batch: unknown[] = [];
  private found: Found[] = [];

  constructor(private rowKeys: ReadonlySet<string>) {}

  /** The next piece of the text: what it completed. */
  push(chunk: string): Found[] {
    let from = this.collecting ? 0 : -1;
    const begin = (i: number) => {
      this.held = '';
      from = i;
      this.collecting = true;
    };
    const finish = (i: number) => {
      const text = this.held + chunk.slice(from, i);
      this.held = '';
      from = -1;
      this.collecting = false;
      return text;
    };
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk.charCodeAt(i);
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (c === BACKSLASH) this.escaped = true;
        else if (c === QUOTE) {
          this.inString = false;
          this.closeString(finish, i + 1);
        }
        continue;
      }
      this.step(c, i, begin, finish);
    }
    if (from >= 0) this.held += chunk.slice(from);
    const out = this.found;
    this.found = [];
    return out;
  }

  /** The text is over: it has to be a whole object. */
  end(): Found[] {
    if (this.state !== 'done') throw new SyntaxError('the text ends before the object does');
    return [];
  }

  /** Give the rows so far; at the end of a list also when there are none, so that an empty list is seen. */
  private flush(end = false) {
    if (!this.batch.length && !end) return;
    this.found.push({ key: this.key, rows: this.batch });
    this.batch = [];
  }

  private closeString(finish: (i: number) => string, i: number) {
    if (this.stringIsKey) {
      this.key = JSON.parse(finish(i)) as string;
      this.stringIsKey = false;
      this.state = 'colon';
    } else if (this.state === 'value') {
      this.found.push({ key: this.key, value: JSON.parse(finish(i)) });
      this.state = 'key';
    }
  }

  private step(c: number, i: number, begin: Begin, finish: Finish) {
    const ch = String.fromCharCode(c);
    const handler: Record<State, () => void> = {
      start: () => this.expect(ch, c, ['{', 'key'], 'before the object'),
      key: () => this.atKey(ch, c, i, begin),
      colon: () => this.expect(ch, c, [':', 'value'], 'after a key'),
      value: () => this.startValue(ch, c, i, begin),
      rows: () => this.inRows(ch, c, i, begin),
      row: () => this.inside(ch, i, finish),
      nested: () => this.inside(ch, i, finish),
      scalar: () => this.inScalar(ch, c, i, finish),
      done: () => this.expect(ch, c, ['', 'done'], 'after the end of the object'),
    };
    handler[this.state]();
  }

  /** Space, or `wanted` (then the state is `next`); anything else is wrong. */
  private expect(ch: string, c: number, [wanted, next]: [string, State], where: string) {
    if (ch === wanted) this.state = next;
    else if (!isSpace(c)) throw new SyntaxError(`unexpected "${ch}" ${where}`);
  }

  private atKey(ch: string, c: number, i: number, begin: Begin) {
    if (ch === '}') this.state = 'done';
    else if (ch === '"') {
      begin(i);
      this.inString = this.stringIsKey = true;
    } else if (ch !== ',' && !isSpace(c)) throw new SyntaxError(`unexpected "${ch}" for a key`);
  }

  private startValue(ch: string, c: number, i: number, begin: (i: number) => void) {
    if (isSpace(c)) return;
    if (ch === '[' && this.rowKeys.has(this.key)) {
      this.state = 'rows';
      return;
    }
    begin(i);
    this.stringIsKey = false;
    if (ch === '"') this.inString = true;
    else if (ch === '[' || ch === '{') {
      this.state = 'nested';
      this.depth = 1;
    } else this.state = 'scalar';
  }

  private inRows(ch: string, c: number, i: number, begin: (i: number) => void) {
    if (ch === '[') {
      begin(i);
      this.state = 'row';
      this.depth = 2;
    } else if (ch === ']') {
      this.flush(true);
      this.state = 'key';
    } else if (ch !== ',' && !isSpace(c)) throw new SyntaxError(`unexpected "${ch}" in a list`);
  }

  private inside(ch: string, i: number, finish: (i: number) => string) {
    if (ch === '"') this.inString = true;
    if (ch === '[' || ch === '{') this.depth++;
    if (ch !== ']' && ch !== '}') return;
    if (--this.depth > (this.state === 'row' ? 1 : 0)) return;
    const value: unknown = JSON.parse(finish(i + 1));
    if (this.state === 'nested') {
      this.found.push({ key: this.key, value });
      this.state = 'key';
      return;
    }
    this.batch.push(value);
    this.state = 'rows';
    if (this.batch.length >= ROW_BATCH) this.flush();
  }

  private inScalar(ch: string, c: number, i: number, finish: (i: number) => string) {
    if (ch !== ',' && ch !== '}' && !isSpace(c)) return;
    this.found.push({ key: this.key, value: JSON.parse(finish(i)) });
    this.state = ch === '}' ? 'done' : 'key';
  }
}
