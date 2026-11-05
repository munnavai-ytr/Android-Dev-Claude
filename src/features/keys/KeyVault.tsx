'use client';

import React, { useState } from 'react';
import { KeyRound, Plus, ShieldCheck, Zap, Layers, RefreshCw } from 'lucide-react';
import { useKeyStore } from '../../store/useKeyStore';
import type { StoredApiKey } from '../../lib/db';
import { KeyCard } from './KeyCard';
import { AddKeyModal } from './AddKeyModal';
import { KeyTestModal } from './KeyTestModal';
import { LimitsDashboard } from '../dashboard/LimitsDashboard';
import { Modal } from '../../components/ui/Modal';
import { GlassCard } from '../../components/ui/GlassCard';

export const KeyVault: React.FC = () => {
  const keys = useKeyStore((state) => state.keys);
  const isLoading = useKeyStore((state) => state.isLoading);
  const loadKeys = useKeyStore((state) => state.loadKeys);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedKeyForTest, setSelectedKeyForTest] = useState<StoredApiKey | null>(null);
  const [selectedKeyForModels, setSelectedKeyForModels] = useState<StoredApiKey | null>(null);

  const hasGemini = keys.some((k) => k.provider === 'gemini');
  const hasOpenRouter = keys.some((k) => k.provider === 'openrouter');

  return (
    <div className="space-y-6 max-w-5xl w-full">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-[#3DDC84]" />
            BYOK Key Vault
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#8B93A7]">
            Non-extractable AES-GCM encrypted browser storage. Direct calls to Gemini & OpenRouter.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 active:scale-95 transition-all min-h-[44px] shadow-sm shadow-[#3DDC84]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add API Key</span>
        </button>
      </div>

      {/* Keys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keys.map((key) => (
          <KeyCard
            key={key.id}
            apiKey={key}
            onOpenTestModal={(k) => setSelectedKeyForTest(k)}
            onSelectModels={(k) => setSelectedKeyForModels(k)}
          />
        ))}

        {/* Empty / Suggestions if missing Gemini or OpenRouter */}
        {keys.length === 0 && !isLoading && (
          <div className="col-span-full">
            <GlassCard radius={20} className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto text-[#3DDC84]">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No Keys Configured</h3>
              <p className="text-xs text-[#8B93A7] max-w-md mx-auto leading-relaxed">
                DroidForge operates client-side only. Add your Google Gemini or OpenRouter API key
                to start generating native Android Compose code.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 transition-opacity"
                >
                  Configure First Key
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Limits & Quota Telemetry Section */}
      <div className="pt-4 border-t border-white/8">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider font-mono text-[#8B93A7] mb-3">
          Usage & Local Limits Dashboard
        </h2>
        <LimitsDashboard />
      </div>

      {/* Add Key Modal */}
      <AddKeyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Test Key Modal */}
      <KeyTestModal
        isOpen={!!selectedKeyForTest}
        onClose={() => setSelectedKeyForTest(null)}
        apiKey={selectedKeyForTest}
      />

      {/* Models List Inspector Modal */}
      <Modal
        isOpen={!!selectedKeyForModels}
        onClose={() => setSelectedKeyForModels(null)}
        title={selectedKeyForModels ? `${selectedKeyForModels.label} Models` : 'Models'}
        subtitle={
          selectedKeyForModels
            ? `Verified ${selectedKeyForModels.modelsList?.length || 0} models available for code generation.`
            : ''
        }
        maxWidth="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/6 pr-1">
          {selectedKeyForModels?.modelsList?.map((m) => (
            <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">{m.name}</span>
                  {m.isFree && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3DDC84]/10 text-[#3DDC84]">
                      Free
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-[#8B93A7] block truncate">
                  {m.id} {m.contextLength ? `· ${m.contextLength.toLocaleString()} tokens` : ''}
                </span>
                {m.description && (
                  <p className="mt-0.5 text-[11px] text-[#8B93A7]/70 line-clamp-1">
                    {m.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
