import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODAL_CONTROLS } from '../project/modalHints';
import { HISTORY_CONTROLS } from './hints';
import { AREA_CONTROLS, DRAG_CONTROLS, PANEL_CONTROLS, VIEW_CONTROLS } from './areaControls';
import {
  effect,
  factsOf,
  present,
  ready,
  SCENARIOS,
  type Scenario,
} from '../testing/controlScenarios';

function checkScenario(s: Scenario) {
  describe(s.name, () => {
    for (const selection of s.selections) {
      const label = selection.length ? `selected ${selection.join(' ')}` : 'nothing selected';
      for (const c of present(s, selection)) {
        it(`${label}: ^${c.hat} listens exactly where the editor does something, and a hint only where it listens`, () => {
          const ed = ready(s, selection);
          const f = factsOf(ed);
          if (c.says(f) !== null) expect(c.listens(f)).toBe(true);
          expect(effect(ed, c, s)).toBe(c.listens(f));
        });
      }
    }
  });
}

describe('the pointer controls and the editor (^783)', () => {
  for (const s of SCENARIOS) checkScenario(s);
});

/** The hats of the controls that are on in a scenario, in every selection. */
const hatsIn = (s: Scenario) => s.selections.flatMap((sel) => present(s, sel).map((c) => c.hat));

describe('what the scenarios cover (^783)', () => {
  it('every pointer control of the table is tried somewhere', () => {
    const tried = new Set(SCENARIOS.flatMap(hatsIn));
    const untried = AREA_CONTROLS.filter((c) => !tried.has(c.hat)).map((c) => c.hat);
    expect(untried).toEqual([]);
  });
});

/** What listens but has no hint in one state: `^hat | the scenario | the selection`. */
function silentIn(s: Scenario, sel: number[]): string[] {
  const f = factsOf(ready(s, sel));
  const quiet = present(s, sel).filter((c) => c.listens(f) && c.says(f) === null);
  return quiet.map((c) => `^${c.hat} | ${s.name} | ${sel.join(' ') || 'nothing selected'}`);
}

/** What listens but has no hint, in every state of the scenarios. */
const silent = () => SCENARIOS.flatMap((s) => s.selections.flatMap((sel) => silentIn(s, sel)));

describe('what listens without a hint (^783)', () => {
  it('is known and few', () => {
    expect(silent()).toEqual([
      // Redundant by design: with nothing selected `Shift` adds nothing to the click, and `Alt+Shift` is `Alt`.
      '^688 | select: node B | nothing selected',
      '^689 | select: node B | nothing selected',
      '^685 | select: curve B C | nothing selected',
      '^691 | select: curve B C | nothing selected',
      '^689 | select: curve B C | nothing selected',
      '^685 | select: the void | nothing selected',
    ]);
  });
});

describe('the hats of the controls (^392, ^783)', () => {
  it('every control of every table is a row of docs/controls.md with its hat', () => {
    const doc = readFileSync(new URL('../../../docs/controls.md', import.meta.url), 'utf8');
    const all = [
      ...PANEL_CONTROLS,
      ...VIEW_CONTROLS,
      ...DRAG_CONTROLS,
      ...HISTORY_CONTROLS,
      ...MODAL_CONTROLS,
    ];
    const missing = all.filter((c) => !new RegExp(`^\\| (= )?\\^${c.hat} \\|`, 'm').test(doc));
    expect(missing.map((c) => c.hat)).toEqual([]);
  });
});
