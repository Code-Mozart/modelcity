import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { deleteIds, done, request } from './idbRows';

globalThis.IDBKeyRange = IDBKeyRange;

function dice(seed: number) {
  let s = seed;
  return (n: number) =>
    Math.floor(((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * n);
}

async function store() {
  const open = indexedDB.open('x', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('rows', { keyPath: ['p', 'id'] });
  return request(open);
}

describe('deleting rows by id, runs of ids with one request (^1260)', () => {
  it('deletes exactly those ids of that project, whatever their runs and gaps, and nothing of another project (random)', async () => {
    const rand = dice(3);
    for (let run = 0; run < 60; run++) {
      globalThis.indexedDB = new IDBFactory();
      const db = await store();
      const all = Array.from({ length: 40 }, (_, i) => i - 5);
      const tx = db.transaction('rows', 'readwrite');
      for (const p of ['a', 'b', 'c']) for (const id of all) tx.objectStore('rows').put({ p, id });
      await done(tx);
      const gone = [...new Set(Array.from({ length: rand(30) }, () => all[rand(all.length)]!))];
      const del = db.transaction('rows', 'readwrite');
      deleteIds(del.objectStore('rows'), 'b', gone);
      await done(del);
      const left = await request<{ p: string; id: number }[]>(
        db.transaction('rows').objectStore('rows').getAll(),
      );
      for (const p of ['a', 'b', 'c']) {
        const want = p === 'b' ? all.filter((id) => !gone.includes(id)) : all;
        expect(
          left
            .filter((r) => r.p === p)
            .map((r) => r.id)
            .sort((x, y) => x - y),
        ).toEqual(want);
      }
      db.close();
    }
  });

  it('with no ids does nothing', async () => {
    globalThis.indexedDB = new IDBFactory();
    const db = await store();
    const tx = db.transaction('rows', 'readwrite');
    tx.objectStore('rows').put({ p: 'a', id: 1 });
    deleteIds(tx.objectStore('rows'), 'a', []);
    await done(tx);
    expect(await request(db.transaction('rows').objectStore('rows').count())).toBe(1);
  });
});
