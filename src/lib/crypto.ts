/**
 * DroidForge WebCrypto AES-GCM Key Encryption
 * 
 * Non-negotiable security invariant:
 * - API keys are encrypted client-side using a NON-EXTRACTABLE WebCrypto AES-GCM 256-bit key.
 * - The CryptoKey is stored directly in IndexedDB via structured clone, ensuring it cannot
 *   be exported to raw bytes via crypto.subtle.exportKey.
 * - Raw keys are never logged, never exposed to server code, and only decrypted in-memory
 *   immediately before dispatch to provider HTTPS endpoints.
 */

const DB_NAME = 'droidforge_secure_store';
const STORE_NAME = 'master_keys';
const MASTER_KEY_ID = 'droidforge_master_aes_gcm';

function openCryptoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in current environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves the non-extractable master AES-GCM key, or generates and saves a new one.
 */
export async function getMasterCryptoKey(): Promise<CryptoKey> {
  const db = await openCryptoDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(MASTER_KEY_ID);

    getReq.onsuccess = async () => {
      if (getReq.result && getReq.result.key) {
        resolve(getReq.result.key as CryptoKey);
        return;
      }

      try {
        // Generate a non-extractable 256-bit AES-GCM key
        const newKey = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256,
          },
          false, // extractable: false (CANNOT be exported from browser memory)
          ['encrypt', 'decrypt']
        );

        const putReq = store.put({ id: MASTER_KEY_ID, key: newKey, createdAt: Date.now() });
        putReq.onsuccess = () => resolve(newKey);
        putReq.onerror = () => reject(putReq.error);
      } catch (err) {
        reject(err);
      }
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

// Base64 buffer conversion utilities
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts an API key string with the non-extractable master key.
 */
export async function encryptApiKey(plainKey: string): Promise<{ ciphertext: string; iv: string }> {
  if (!plainKey || typeof plainKey !== 'string') {
    throw new Error('Invalid key provided for encryption');
  }

  const masterKey = await getMasterCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for AES-GCM
  const encoded = new TextEncoder().encode(plainKey.trim());

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    masterKey,
    encoded as unknown as BufferSource
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts an encrypted API key in-memory.
 */
export async function decryptApiKey(ciphertext: string, iv: string): Promise<string> {
  const masterKey = await getMasterCryptoKey();
  const cipherBytes = base64ToBuffer(ciphertext);
  const ivBytes = base64ToBuffer(iv);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as unknown as BufferSource,
    },
    masterKey,
    cipherBytes as unknown as BufferSource
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Masks an API key for safe UI display (e.g., sk-or-v1-...4f2a or AIzaSy...9x0B)
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }

  if (trimmed.startsWith('sk-or-v1-')) {
    const end = trimmed.slice(-4);
    return `sk-or-v1-••••${end}`;
  }

  if (trimmed.startsWith('sk-')) {
    const end = trimmed.slice(-4);
    return `sk-••••${end}`;
  }

  if (trimmed.startsWith('AIza')) {
    const end = trimmed.slice(-4);
    return `AIza••••${end}`;
  }

  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-4);
  return `${start}••••${end}`;
}
