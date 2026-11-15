import { test } from '@playwright/test';
import { App } from '../e2e/app';

/** What reading a chunk costs for the rows of the chunk alone, and for the strip round it that the indexes on x and y give (^1249): `NODES=100000 bunx playwright test -c playwright.bench.config.ts bench/read.spec.ts` (needs the dev server for the module imports). */
test('reading about 100 rows or about 2200 rows', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await new App(page).ready();
  const text = await page.evaluate(
    async (n) => {
      const { makeMapText } = (await import('/bench/makeMap.ts')) as {
        makeMapText: (n: number, s: number) => string;
      };
      return makeMapText(n, 40);
    },
    Number(process.env.NODES ?? 100_000),
  );
  await page.evaluate((t) => window.__modelcity!.session.importText(t), text);
  await page.waitForFunction(() => window.__modelcity!.index.status === 'ready', undefined, {
    timeout: 300_000,
  });
  const result = await page.evaluate(async () => {
    const project = window.__modelcity!.session.id;
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('modelcity', 3);
      r.onsuccess = () => res(r.result);
    });
    const get = <T>(f: (s: IDBObjectStore) => IDBRequest<T>) =>
      new Promise<T>((res) => {
        const r = f(db.transaction('nodes').objectStore('nodes'));
        r.onsuccess = () => res(r.result);
      });
    const time = async (f: () => Promise<unknown>, times = 20) => {
      await f();
      const t = performance.now();
      for (let i = 0; i < times; i++) await f();
      return Math.round(((performance.now() - t) / times) * 10) / 10;
    };
    const strip = (x: number) => IDBKeyRange.bound([project, x], [project, x + 255_999]);
    const round = async () => ({
      rows100ByKeyMs: await time(() =>
        get((s) => s.getAll(IDBKeyRange.bound([project, 5000], [project, 5098]))),
      ),
      strip2200Ms: await time(() => get((s) => s.index('x').getAll(strip(2_560_000)))),
      fourStripsAtOnceMs: await time(() =>
        Promise.all(
          [0, 1, 2, 3].map((i) => get((s) => s.index('x').getAll(strip(2_560_000 + i * 256_000)))),
        ),
      ),
      fourSmallAtOnceMs: await time(() =>
        Promise.all(
          [0, 1, 2, 3].map((i) =>
            get((s) =>
              s.getAll(IDBKeyRange.bound([project, 5000 + i * 100], [project, 5098 + i * 100])),
            ),
          ),
        ),
      ),
    });
    await round();
    return round();
  });
  console.log(JSON.stringify(result));
});
