import type { EncryptedVault } from '../crypto/crypto';

const DATABASE_NAME = 'devpass-vault';
const DATABASE_VERSION = 1;
const STORE_NAME = 'vault';
const VAULT_KEY = 'current';

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const getEncryptedVault = async (): Promise<EncryptedVault | null> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(VAULT_KEY);

    request.onsuccess = () => resolve((request.result as EncryptedVault) ?? null);
    request.onerror = () => reject(request.error);
  });
};

export const setEncryptedVault = async (payload: EncryptedVault): Promise<void> => {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(payload, VAULT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearEncryptedVault = async (): Promise<void> => {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(VAULT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
