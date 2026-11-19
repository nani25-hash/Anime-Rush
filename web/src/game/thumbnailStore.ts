const DB_NAME = 'anime_rush_thumbs_v2';
const STORE_NAME = 'thumbs';
const MAX_LOCAL_CACHE_ENTRIES = 64;

const memoryCache = new Map<string, string>();
const listeners = new Set<() => void>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
let hydrationStarted = false;

function notifyListeners(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // Ignore subscriber errors
    }
  });
}

function openThumbDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export async function hydrateThumbnailCache(): Promise<void> {
  if (hydrationStarted) return;
  hydrationStarted = true;
  const db = await openThumbDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      tx.oncomplete = () => {
        const keys = keysReq.result ?? [];
        const vals = valsReq.result ?? [];
        let changed = false;
        for (let i = 0; i < keys.length && i < MAX_LOCAL_CACHE_ENTRIES; i++) {
          const k = String(keys[i]);
          const v = vals[i];
          if (typeof v === 'string' && v.startsWith('data:image/') && !memoryCache.has(k)) {
            memoryCache.set(k, v);
            changed = true;
          }
        }
        if (changed) notifyListeners();
        resolve();
      };
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function getCachedThumbnail(key: string): string | undefined {
  return memoryCache.get(key);
}

export function hasCachedThumbnail(key: string): boolean {
  return memoryCache.has(key);
}

export function getAllCachedThumbnails(): Record<string, string> {
  const out: Record<string, string> = {};
  memoryCache.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export function setCachedThumbnail(key: string, dataUrl: string): void {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return;
  memoryCache.set(key, dataUrl);
  notifyListeners();
  void persistThumbnailToIdb(key, dataUrl);
}

async function persistThumbnailToIdb(key: string, dataUrl: string): Promise<void> {
  const db = await openThumbDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataUrl, key);
  } catch {
    // Ignore IDB quota/privacy errors
  }
}

export function subscribeThumbnails(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function encodeCanvasThumbnail(canvas: HTMLCanvasElement): string {
  try {
    const webp = canvas.toDataURL('image/webp', 0.85);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
  } catch {
    // Fallback below if WebP encoder is unavailable
  }
  return canvas.toDataURL('image/png');
}
