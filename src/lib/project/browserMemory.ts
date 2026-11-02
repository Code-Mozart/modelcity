/** What the app remembers in the browser besides the projects (^166, ^189). */
const LAST_KEY = 'modelcity.project';

/** A new id for a project (the browser makes one if it can). */
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Remember which project was open last. */
export const remember = (id: string) => {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* private mode: the app then opens a new project next time */
  }
};

/** The project that was open last, if the browser still knows. */
export const lastId = () => {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
};
