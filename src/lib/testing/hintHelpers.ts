import type { Hint, HintTarget } from '../hints/hints';

/** A readable form of a hint: "LMB drag: pan". */
export const show = (h: Hint) =>
  `${h.inputs
    .map((i) =>
      i.kind === 'key'
        ? i.label
        : i.kind === 'keys'
          ? i.labels.join('+')
          : i.kind === 'wheel'
            ? 'Wheel'
            : `${i.alt ? 'Alt+' : ''}${i.shift ? 'Shift+' : ''}${i.button.toUpperCase()}${i.drag ? ' drag' : ''}`,
    )
    .join(' or ')}: ${h.text}${h.note ? ` (${h.note.key} ${h.note.text})` : ''}`;

/** A node under the pointer: the last one of the road being drawn, a leaf, or any. */
export const node = (last: boolean, leaf = last): HintTarget => ({
  kind: 'handle',
  type: 'node',
  act: last ? 'finish' : leaf ? 'extend' : null,
});
