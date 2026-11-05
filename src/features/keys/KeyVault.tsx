'use client';

import React, { useState } from 'react';
import { KeyRound, Plus, ShieldCheck, Zap, Layers, RefreshCw, Github, CheckCircle2 } from 'lucide-react';
import { useKeyStore } from '../../store/useKeyStore';
import { useGithubStore } from '../../store/useGithubStore';
import type { StoredApiKey } from '../../lib/db';
import { KeyCard } from './KeyCard';
import { AddKeyModal } from './AddKeyModal';
import { KeyTestModal } from './KeyTestModal';
import { GithubConnectModal } from '../github/GithubConnectModal';
import { LimitsDashboard } from '../dashboard/LimitsDashboard';
import { Modal } from '../../components/ui/Modal';
import { GlassCard } from '../../components/ui/GlassCard';

export const KeyVault: React.FC = () => {
  const keys = useKeyStore((state) => state.keys);
  const isLoading = useKeyStore((state) => state.isLoading);
  const loadKeys = useKeyStore((state) => state.loadKeys);

  const { credential, loadCredential } = useGithubStore();
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);

  React.useEffect(() => {
    loadCredential().catch(console.warn);
  }, [loadCredential]);

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
            BYOK Key Vault & Integrations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#8B93A7]">
            Non-extractable AES-GCM encrypted browser storage. Direct calls to Gemini, OpenRouter & GitHub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGithubModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all min-h-[44px]"
          >
            <Github className="w-4 h-4" />
            <span>{credential ? 'GitHub Connected' : 'Connect GitHub'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 active:scale-95 transition-all min-h-[44px] shadow-sm shadow-[#3DDC84]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add AI Key</span>
          </button>
        </div>
      </div>

      {/* GitHub Integration Status Banner */}
      <GlassCard radius={20} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-white/8 bg-[#0E1016]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
            <Github className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">GitHub CI/CD Integration</span>
              {credential ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3DDC84]/10 text-[#3DDC84] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  @{credential.username} ({credential.maskedToken})
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#8B93A7]">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8B93A7] mt-0.5">
              Required for cloud assembleDebug compilation, Appetize streaming, and release APK downloads.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsGithubModalOpen(true)}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#22D3EE] bg-[#22D3EE]/10 hover:bg-[#22D3EE]/20 transition-colors shrink-0"
        >
          {credential ? 'Manage Credentials' : 'Configure PAT'}
        </button>
      </GlassCard>

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

      {/* GitHub Connect Modal */}
      <GithubConnectModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
      />
    </div>
  );
};
