import { create } from 'zustand';
import { getDb, type AppSettingRecord } from '../lib/db';

interface SettingsStoreState {
  onboardingCompleted: boolean;
  plannerModel: string;
  coderModel: string;
  fixerModel: string;
  accentTheme: 'android' | 'violet' | 'amber' | 'cyan';
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setModelRole: (role: 'planner' | 'coder' | 'fixer', modelId: string) => Promise<void>;
  setAccentTheme: (theme: 'android' | 'violet' | 'amber' | 'cyan') => Promise<void>;
  exportBackupData: () => Promise<string>;
  importBackupData: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  clearAllData: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettingRecord = {
  id: 'general',
  onboardingCompleted: false,
  plannerModel: 'gemini-2.5-flash',
  coderModel: 'gemini-2.5-flash',
  fixerModel: 'gemini-2.5-flash',
  accentTheme: 'android',
  updatedAt: Date.now(),
};

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  onboardingCompleted: false,
  plannerModel: 'gemini-2.5-flash',
  coderModel: 'gemini-2.5-flash',
  fixerModel: 'gemini-2.5-flash',
  accentTheme: 'android',
  isLoading: true,

  loadSettings: async () => {
    if (typeof window === 'undefined') return;
    try {
      set({ isLoading: true });
      const db = getDb();
      let record = await db.appSettings.get('general');

      if (!record) {
        record = DEFAULT_SETTINGS;
        await db.appSettings.put(record);
      }

      set({
        onboardingCompleted: record.onboardingCompleted,
        plannerModel: record.plannerModel || 'gemini-2.5-flash',
        coderModel: record.coderModel || 'gemini-2.5-flash',
        fixerModel: record.fixerModel || 'gemini-2.5-flash',
        accentTheme: record.accentTheme || 'android',
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load settings from Dexie:', err);
      set({ isLoading: false });
    }
  },

  setOnboardingCompleted: async (completed: boolean) => {
    try {
      const db = getDb();
      const current = (await db.appSettings.get('general')) || DEFAULT_SETTINGS;
      const updated: AppSettingRecord = {
        ...current,
        onboardingCompleted: completed,
        updatedAt: Date.now(),
      };
      await db.appSettings.put(updated);
      set({ onboardingCompleted: completed });
    } catch (err) {
      console.error('Failed to save onboarding state:', err);
    }
  },

  setModelRole: async (role: 'planner' | 'coder' | 'fixer', modelId: string) => {
    try {
      const db = getDb();
      const current = (await db.appSettings.get('general')) || DEFAULT_SETTINGS;
      const updated: AppSettingRecord = {
        ...current,
        plannerModel: role === 'planner' ? modelId : current.plannerModel,
        coderModel: role === 'coder' ? modelId : current.coderModel,
        fixerModel: role === 'fixer' ? modelId : current.fixerModel,
        updatedAt: Date.now(),
      };
      await db.appSettings.put(updated);

      if (role === 'planner') set({ plannerModel: modelId });
      if (role === 'coder') set({ coderModel: modelId });
      if (role === 'fixer') set({ fixerModel: modelId });
    } catch (err) {
      console.error('Failed to update model role:', err);
    }
  },

  setAccentTheme: async (theme: 'android' | 'violet' | 'amber' | 'cyan') => {
    try {
      const db = getDb();
      const current = (await db.appSettings.get('general')) || DEFAULT_SETTINGS;
      const updated: AppSettingRecord = {
        ...current,
        accentTheme: theme,
        updatedAt: Date.now(),
      };
      await db.appSettings.put(updated);
      set({ accentTheme: theme });
    } catch (err) {
      console.error('Failed to set accent theme:', err);
    }
  },

  exportBackupData: async () => {
    const db = getDb();
    const projects = await db.projects.toArray();
    const usage = await db.usageRecords.toArray();
    const settings = await db.appSettings.toArray();
    const rawKeys = await db.apiKeys.toArray();

    // Export metadata and keys metadata without raw cipher secrets for safety
    const safeKeys = rawKeys.map((k) => ({
      id: k.id,
      provider: k.provider,
      label: k.label,
      maskedValue: k.maskedValue,
      status: k.status,
      modelsCount: k.modelsCount,
    }));

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      app: 'DroidForge',
      projects,
      usage,
      settings,
      configuredKeysCount: safeKeys.length,
    };

    return JSON.stringify(backup, null, 2);
  },

  importBackupData: async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || data.app !== 'DroidForge') {
        return { success: false, message: 'Invalid backup JSON file: Must be a DroidForge export.' };
      }

      const db = getDb();

      if (Array.isArray(data.projects)) {
        await db.projects.bulkPut(data.projects);
      }

      if (Array.isArray(data.usage)) {
        await db.usageRecords.bulkPut(data.usage);
      }

      if (Array.isArray(data.settings) && data.settings[0]) {
        await db.appSettings.put(data.settings[0]);
        await get().loadSettings();
      }

      return { success: true, message: `Successfully restored ${data.projects?.length || 0} projects.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Malformed JSON backup.' };
    }
  },

  clearAllData: async () => {
    const db = getDb();
    await db.projects.clear();
    await db.usageRecords.clear();
    await db.apiKeys.clear();
    await db.appSettings.clear();
    await get().loadSettings();
  },
}));
