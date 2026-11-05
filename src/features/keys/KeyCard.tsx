'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type { StoredApiKey } from '../../lib/db';
import { useKeyStore } from '../../store/useKeyStore';
import { GlassCard } from '../../components/ui/GlassCard';

interface KeyCardProps {
  apiKey: StoredApiKey;
  onOpenTestModal: (key: StoredApiKey) => void;
  onSelectModels: (key: StoredApiKey) => void;
}

export const KeyCard: React.FC<KeyCardProps> = ({ apiKey, onOpenTestModal, onSelectModels }) => {
  const deleteKey = useKeyStore((state) => state.deleteKey);
  const testKey = useKeyStore((state) => state.testKey);
  const isTesting = useKeyStore((state) => !!state.isTesting[apiKey.id]);
  const [isDeleting, setIsDeleting] = useState(false);

  const isGemini = apiKey.provider === 'gemini';
  const isValid = apiKey.status === 'valid';

  const handleQuickTest = async () => {
    await testKey(apiKey.id);
  };

  const handleDelete = async () => {
    if (confirm(`Remove this ${apiKey.label} from your local browser vault?`)) {
      setIsDeleting(true);
      await deleteKey(apiKey.id);
      setIsDeleting(false);
    }
  };

  return (
    <GlassCard radius={20} className="p-5 flex flex-col justify-between relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-10 pointer-events-none ${
          isGemini ? 'bg-[#3DDC84]' : 'bg-[#8B5CF6]'
        }`}
      />

      {/* Header: Provider, Masked Key & Status */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                isGemini
                  ? 'bg-[#3DDC84]/10 text-[#3DDC84] border border-[#3DDC84]/20'
                  : 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20'
              }`}
            >
              {isGemini ? 'GEM' : 'OR'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white tracking-tight">{apiKey.label}</h4>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isValid
                      ? 'bg-[#3DDC84]/10 text-[#3DDC84]'
                      : apiKey.status === 'untested'
                      ? 'bg-[#F5B84B]/10 text-[#F5B84B]'
                      : 'bg-[#FF5C6C]/10 text-[#FF5C6C]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isValid
                        ? 'bg-[#3DDC84]'
                        : apiKey.status === 'untested'
                        ? 'bg-[#F5B84B]'
                        : 'bg-[#FF5C6C]'
                    }`}
                  />
                  {isValid ? 'Valid' : apiKey.status === 'untested' ? 'Untested' : 'Error'}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-mono text-[#8B93A7] tracking-wider">
                {apiKey.maskedValue}
              </p>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete key"
            className="p-1.5 rounded-lg text-white/40 hover:text-[#FF5C6C] hover:bg-white/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Quota & Live Metrics */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#141722]/60 border border-white/6">
            <span className="text-[10px] text-[#8B93A7]">Models Available</span>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-white">
                {apiKey.modelsCount || 0}
              </span>
              <button
                onClick={() => onSelectModels(apiKey)}
                className="text-[10px] text-[#3DDC84] hover:underline flex items-center gap-0.5"
              >
                View
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#141722]/60 border border-white/6">
            <span className="text-[10px] text-[#8B93A7]">Last Latency</span>
            <div className="mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#22D3EE]" />
              <span className="font-mono text-sm font-semibold text-white">
                {apiKey.testLatencyMs ? `${apiKey.testLatencyMs} ms` : 'Not tested'}
              </span>
            </div>
          </div>
        </div>

        {/* OpenRouter specific quota or Gemini note */}
        {apiKey.quotaInfo && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-white/4 border border-white/6 text-[11px] text-[#8B93A7] flex items-center justify-between">
            <span>Quota Info:</span>
            <div className="font-mono text-white/90">
              {typeof apiKey.quotaInfo.usage === 'number'
                ? `$${apiKey.quotaInfo.usage.toFixed(2)} spent ${
                    apiKey.quotaInfo.limit ? `/ $${apiKey.quotaInfo.limit.toFixed(2)}` : ''
                  }`
                : isGemini
                ? 'Standard Free BYOK Tier'
                : 'Active Key'}
            </div>
          </div>
        )}

        {/* Last error message if failed */}
        {apiKey.lastError && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-[#FF5C6C]/10 border border-[#FF5C6C]/20 text-[11px] text-[#FF5C6C] leading-snug">
            {apiKey.lastError}
          </div>
        )}
      </div>

      {/* Card Actions: Test Key */}
      <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#8B93A7] font-mono">
          {apiKey.lastTestedAt
            ? `Tested ${new Date(apiKey.lastTestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Not pinged yet'}
        </span>

        <button
          onClick={handleQuickTest}
          disabled={isTesting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs font-medium text-white transition-all active:scale-95 disabled:opacity-50 min-h-[36px]"
        >
          <Zap className={`w-3.5 h-3.5 text-[#22D3EE] ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Pinging...' : 'Test Key'}</span>
        </button>
      </div>
    </GlassCard>
  );
};
