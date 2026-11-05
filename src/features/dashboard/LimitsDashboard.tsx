'use client';

import React from 'react';
import { Activity, BarChart3, Clock, Database, Info, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useUsageStore } from '../../store/useUsageStore';
import { useKeyStore } from '../../store/useKeyStore';

export const LimitsDashboard: React.FC = () => {
  const { today, thisMonth, resetUsageCounters } = useUsageStore();
  const keys = useKeyStore((state) => state.keys);

  const handleResetCounters = async () => {
    if (confirm('Reset local request and token counters? This clears only local usage metrics stored in IndexedDB.')) {
      await resetUsageCounters();
    }
  };

  return (
    <div className="space-y-4">
      {/* Honesty Banner */}
      <div className="p-3.5 rounded-2xl bg-[#141722]/80 border border-white/8 text-xs text-[#8B93A7] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#22D3EE] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">Honest Quota Note:</strong> Google Gemini does not expose remaining quota
          or tokens via its public REST API; token and request counters are tracked locally in your browser.
          OpenRouter credit balances and limits are queried directly from its official key-info endpoint.
        </div>
      </div>

      {/* Aggregate Usage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard radius={14} className="p-4">
          <span className="text-[11px] text-[#8B93A7] block">Today Requests</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
              {today.requests}
            </span>
            <span className="text-[10px] text-[#8B93A7]">calls</span>
          </div>
        </GlassCard>

        <GlassCard radius={14} className="p-4">
          <span className="text-[11px] text-[#8B93A7] block">Today Tokens</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#3DDC84] tabular-nums">
              {today.totalTokens.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#8B93A7]">tok</span>
          </div>
        </GlassCard>

        <GlassCard radius={14} className="p-4">
          <span className="text-[11px] text-[#8B93A7] block">Month Requests</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
              {thisMonth.requests}
            </span>
            <span className="text-[10px] text-[#8B93A7]">calls</span>
          </div>
        </GlassCard>

        <GlassCard radius={14} className="p-4">
          <span className="text-[11px] text-[#8B93A7] block">Month Tokens</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#22D3EE] tabular-nums">
              {thisMonth.totalTokens.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#8B93A7]">tok</span>
          </div>
        </GlassCard>
      </div>

      {/* Key Status & Storage Details */}
      <GlassCard radius={20} className="p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3DDC84]" />
            <h4 className="text-sm font-semibold text-white">Local Vault Telemetry</h4>
          </div>
          <button
            onClick={handleResetCounters}
            className="flex items-center gap-1.5 text-xs text-[#8B93A7] hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Counters</span>
          </button>
        </div>

        <div className="mt-4 divide-y divide-white/6">
          {keys.length === 0 ? (
            <p className="text-xs text-[#8B93A7] py-3 text-center">
              No keys configured in vault. Add a Gemini or OpenRouter key to start building.
            </p>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      k.status === 'valid'
                        ? 'bg-[#3DDC84]'
                        : k.status === 'untested'
                        ? 'bg-[#F5B84B]'
                        : 'bg-[#FF5C6C]'
                    }`}
                  />
                  <div>
                    <span className="text-white font-medium">{k.label}</span>
                    <span className="text-[#8B93A7] font-mono text-[11px] ml-2">
                      ({k.maskedValue})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[#8B93A7] block text-[10px]">Latency</span>
                    <span className="font-mono text-white text-[11px]">
                      {k.testLatencyMs ? `${k.testLatencyMs}ms` : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#8B93A7] block text-[10px]">Models</span>
                    <span className="font-mono text-white text-[11px]">{k.modelsCount || 0}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
};
