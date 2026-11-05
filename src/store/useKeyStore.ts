import { create } from 'zustand';
import { getDb, type StoredApiKey, type ModelMetadata } from '../lib/db';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../lib/crypto';
import { getProviderAdapter, type KeyTestResult, type KeyValidationResult } from '../lib/ai/provider';

interface KeyStoreState {
  keys: StoredApiKey[];
  isLoading: boolean;
  isValidating: boolean;
  isTesting: Record<string, boolean>;
  error: string | null;

  loadKeys: () => Promise<void>;
  saveKey: (provider: 'gemini' | 'openrouter', plainKey: string, label?: string) => Promise<KeyValidationResult>;
  deleteKey: (id: string) => Promise<void>;
  testKey: (id: string, modelToTest?: string) => Promise<KeyTestResult>;
  getDecryptedKey: (id: string) => Promise<string | null>;
  getAllAvailableModels: () => ModelMetadata[];
}

export const useKeyStore = create<KeyStoreState>((set, get) => ({
  keys: [],
  isLoading: true,
  isValidating: false,
  isTesting: {},
  error: null,

  loadKeys: async () => {
    if (typeof window === 'undefined') return;
    try {
      set({ isLoading: true, error: null });
      const db = getDb();
      const allKeys = await db.apiKeys.toArray();
      set({ keys: allKeys, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load keys from Dexie:', err);
      set({ error: err.message || 'Failed to read keys', isLoading: false });
    }
  },

  saveKey: async (provider: 'gemini' | 'openrouter', plainKey: string, label?: string) => {
    set({ isValidating: true, error: null });
    const cleanKey = plainKey.trim();

    try {
      const adapter = getProviderAdapter(provider);
      // Validate key with provider API
      const validation = await adapter.validateKey(cleanKey);

      // Encrypt key with non-extractable WebCrypto AES-GCM
      const { ciphertext, iv } = await encryptApiKey(cleanKey);
      const masked = maskApiKey(cleanKey);

      const db = getDb();
      const keyId = `key_${provider}_${cleanKey.slice(-4)}`;

      const storedItem: StoredApiKey = {
        id: keyId,
        provider,
        label: label || (provider === 'gemini' ? 'Google Gemini API' : 'OpenRouter API'),
        encryptedValue: ciphertext,
        iv,
        maskedValue: masked,
        status: validation.valid ? 'valid' : 'invalid',
        modelsCount: validation.models.length,
        modelsList: validation.models,
        quotaInfo: validation.quotaInfo,
        lastValidatedAt: Date.now(),
        lastError: validation.valid ? undefined : validation.error,
      };

      await db.apiKeys.put(storedItem);

      // Refresh keys in store
      const allKeys = await db.apiKeys.toArray();
      set({ keys: allKeys, isValidating: false });

      return validation;
    } catch (err: any) {
      set({ isValidating: false, error: err.message });
      return {
        valid: false,
        provider,
        models: [],
        error: err.message || 'Key validation error',
      };
    }
  },

  deleteKey: async (id: string) => {
    try {
      const db = getDb();
      await db.apiKeys.delete(id);
      const allKeys = await db.apiKeys.toArray();
      set({ keys: allKeys });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  testKey: async (id: string, modelToTest?: string) => {
    set((state) => ({ isTesting: { ...state.isTesting, [id]: true } }));

    try {
      const db = getDb();
      const keyRecord = await db.apiKeys.get(id);
      if (!keyRecord) {
        throw new Error('Key not found in database.');
      }

      const plainKey = await decryptApiKey(keyRecord.encryptedValue, keyRecord.iv);
      const adapter = getProviderAdapter(keyRecord.provider);

      const result = await adapter.testKey(plainKey, modelToTest);

      // Update record in IndexedDB
      const updated: StoredApiKey = {
        ...keyRecord,
        status: result.success ? 'valid' : 'invalid',
        testLatencyMs: result.latencyMs,
        lastTestedAt: Date.now(),
        lastError: result.success ? undefined : result.error,
      };

      await db.apiKeys.put(updated);
      const allKeys = await db.apiKeys.toArray();
      set((state) => ({
        keys: allKeys,
        isTesting: { ...state.isTesting, [id]: false },
      }));

      return result;
    } catch (err: any) {
      set((state) => ({ isTesting: { ...state.isTesting, [id]: false } }));
      return {
        success: false,
        latencyMs: 0,
        error: err.message || 'Failed to decrypt and test key.',
      };
    }
  },

  getDecryptedKey: async (id: string) => {
    try {
      const db = getDb();
      const keyRecord = await db.apiKeys.get(id);
      if (!keyRecord) return null;
      return await decryptApiKey(keyRecord.encryptedValue, keyRecord.iv);
    } catch (err) {
      console.error('Failed to decrypt key:', err);
      return null;
    }
  },

  getAllAvailableModels: () => {
    const keys = get().keys;
    const modelMap = new Map<string, ModelMetadata>();

    for (const key of keys) {
      if (key.status === 'valid' && Array.isArray(key.modelsList)) {
        for (const m of key.modelsList) {
          if (!modelMap.has(m.id)) {
            modelMap.set(m.id, m);
          }
        }
      }
    }

    return Array.from(modelMap.values());
  },
}));
