// IndexedDB wrapper. Every write is its own committed transaction, so data
// survives the app being killed at any moment.
const DB_NAME = 'counter-pos';
const VERSION = 1;
let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('profiles', { keyPath: 'id' });
        db.createObjectStore('menu', { keyPath: 'id' }).createIndex('profileId', 'profileId');
        db.createObjectStore('orders', { keyPath: 'id' }).createIndex('profileTime', ['profileId', 'createdAt']);
        db.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const result = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const db = {
  get: (store, key) => run(store, 'readonly', s => s.get(key)),
  put: (store, value, key) => run(store, 'readwrite', s => (key === undefined ? s.put(value) : s.put(value, key))),
  del: (store, key) => run(store, 'readwrite', s => s.delete(key)),
  all: (store) => run(store, 'readonly', s => s.getAll()),
  byIndex: (store, index, query) => run(store, 'readonly', s => s.index(index).getAll(query)),
  putMany: (store, values) => run(store, 'readwrite', s => { values.forEach(v => s.put(v)); }),
  delMany: (store, keys) => run(store, 'readwrite', s => { keys.forEach(k => s.delete(k)); }),
  // Several writes across stores in ONE transaction: all land or none do.
  // ops: [{ store, value, key? } | { store, del: key }]
  async batch(ops) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([...new Set(ops.map(o => o.store))], 'readwrite');
      for (const op of ops) {
        const s = tx.objectStore(op.store);
        if ('del' in op) s.delete(op.del);
        else if (op.key === undefined) s.put(op.value);
        else s.put(op.value, op.key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },
};
