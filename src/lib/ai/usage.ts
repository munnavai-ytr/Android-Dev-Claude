import { getDb, type UsageRecord } from '../db';

/**
 * Records an AI usage event into IndexedDB.
 * Used for local usage counter dashboard (today / month / tokens).
 */
export async function recordUsage(params: {
  keyId: string;
  provider: 'gemini' | 'openrouter';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCost?: number;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = getDb();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const monthStr = dateStr.slice(0, 7); // "YYYY-MM"

    const record: UsageRecord = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      keyId: params.keyId,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens || 0,
      completionTokens: params.completionTokens || 0,
      totalTokens: params.totalTokens || (params.promptTokens + params.completionTokens) || 0,
      latencyMs: params.latencyMs || 0,
      timestamp: Date.now(),
      dateStr,
      monthStr,
      estimatedCost: params.estimatedCost || 0,
    };

    await db.usageRecords.add(record);
  } catch (err) {
    console.warn('Failed to persist local usage record to IndexedDB:', err);
  }
}

/**
 * Query aggregated usage stats for today and current month.
 */
export async function getAggregatedUsage(): Promise<{
  today: { requests: number; promptTokens: number; completionTokens: number; totalTokens: number };
  thisMonth: { requests: number; promptTokens: number; completionTokens: number; totalTokens: number };
  byKey: Record<string, { requests: number; totalTokens: number }>;
}> {
  if (typeof window === 'undefined') {
    return {
      today: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      thisMonth: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      byKey: {},
    };
  }

  try {
    const db = getDb();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.slice(0, 7);

    const allRecords = await db.usageRecords.toArray();

    const today = { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const thisMonth = { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const byKey: Record<string, { requests: number; totalTokens: number }> = {};

    for (const r of allRecords) {
      if (!byKey[r.keyId]) {
        byKey[r.keyId] = { requests: 0, totalTokens: 0 };
      }
      byKey[r.keyId].requests += 1;
      byKey[r.keyId].totalTokens += r.totalTokens;

      if (r.monthStr === monthStr) {
        thisMonth.requests += 1;
        thisMonth.promptTokens += r.promptTokens;
        thisMonth.completionTokens += r.completionTokens;
        thisMonth.totalTokens += r.totalTokens;
      }

      if (r.dateStr === todayStr) {
        today.requests += 1;
        today.promptTokens += r.promptTokens;
        today.completionTokens += r.completionTokens;
        today.totalTokens += r.totalTokens;
      }
    }

    return { today, thisMonth, byKey };
  } catch (err) {
    console.error('Failed to get aggregated usage:', err);
    return {
      today: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      thisMonth: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      byKey: {},
    };
  }
}
