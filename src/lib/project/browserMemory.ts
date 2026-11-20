/** What the app remembers in the browser besides the projects (^166, ^189). */
const LAST_KEY = 'modelcity.project';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 8;

/**
 * A new id for a project: 8 letters and digits, from the random numbers of the browser (^1249). The id is in the key of every
 * record of the project and of every index entry, so a long one (a UUID) was half of what a big
 * project takes in the storage. Projects that have a longer id keep it.
 */
export const uid = () => {
  const random = globalThis.crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(random, (n) => ALPHABET[n % ALPHABET.length]).join('');
};

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
