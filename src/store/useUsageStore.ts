import { create } from 'zustand';
import { getAggregatedUsage } from '../lib/ai/usage';
import { getDb } from '../lib/db';

interface UsageStoreState {
  today: { requests: number; promptTokens: number; completionTokens: number; totalTokens: number };
  thisMonth: { requests: number; promptTokens: number; completionTokens: number; totalTokens: number };
  byKey: Record<string, { requests: number; totalTokens: number }>;
  isLoading: boolean;

  refreshUsage: () => Promise<void>;
  resetUsageCounters: () => Promise<void>;
}

export const useUsageStore = create<UsageStoreState>((set) => ({
  today: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  thisMonth: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  byKey: {},
  isLoading: false,

  refreshUsage: async () => {
    if (typeof window === 'undefined') return;
    try {
      set({ isLoading: true });
      const stats = await getAggregatedUsage();
      set({ ...stats, isLoading: false });
    } catch (err) {
      console.error('Failed to refresh usage:', err);
      set({ isLoading: false });
    }
  },

  resetUsageCounters: async () => {
    try {
      const db = getDb();
      await db.usageRecords.clear();
      set({
        today: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        thisMonth: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        byKey: {},
      });
    } catch (err) {
      console.error('Failed to reset usage counters:', err);
    }
  },
}));
