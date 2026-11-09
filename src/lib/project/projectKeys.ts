/** What a key does to the projects (^168, ^222, ^223, ^226, ^746). */
export type ProjectKey = 'save' | 'open' | 'export' | 'projects';

interface Press {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * `Ctrl+S` saves, `Ctrl+Shift+S` exports a file (the usual *save as*, ^746), `Ctrl+O` opens the file
 * window, `P` the projects; null for any other key.
 */
export function projectKeyOf(e: Press): ProjectKey | null {
  if (e.altKey) return null;
  const ctrl = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (ctrl) return withCtrl(key, e.shiftKey);
  return key === 'p' && !e.shiftKey ? 'projects' : null;
}

const withCtrl = (key: string, shift: boolean): ProjectKey | null => {
  if (key === 's') return shift ? 'export' : 'save';
  return key === 'o' && !shift ? 'open' : null;
};
