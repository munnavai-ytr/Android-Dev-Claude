'use client';

import React, { useState } from 'react';
import { Zap, Clock, CheckCircle2, AlertTriangle, ShieldX, RefreshCw } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import type { StoredApiKey } from '../../lib/db';
import { useKeyStore } from '../../store/useKeyStore';
import type { KeyTestResult } from '../../lib/ai/provider';

interface KeyTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: StoredApiKey | null;
}

export const KeyTestModal: React.FC<KeyTestModalProps> = ({ isOpen, onClose, apiKey }) => {
  const testKey = useKeyStore((state) => state.testKey);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<KeyTestResult | null>(null);

  if (!apiKey) return null;

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const modelToUse =
      selectedModel ||
      (apiKey.provider === 'gemini'
        ? 'gemini-2.5-flash'
        : 'meta-llama/llama-3.2-3b-instruct:free');

    const res = await testKey(apiKey.id, modelToUse);
    setTestResult(res);
    setIsTesting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Test ${apiKey.label}`}
      subtitle="Sends a 1-token probe request directly to the provider endpoint to measure round-trip latency and authorization."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Key Info Strip */}
        <div className="p-3 rounded-xl bg-[#141722] border border-white/8 flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-[#8B93A7]">Key Fingerprint</span>
            <span className="font-mono text-white text-xs mt-0.5">{apiKey.maskedValue}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[#8B93A7]">Provider</span>
            <span className="text-white font-medium capitalize mt-0.5">{apiKey.provider}</span>
          </div>
        </div>

        {/* Model Selector for Test */}
        {apiKey.modelsList && apiKey.modelsList.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
              Select Probe Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none focus:border-[#3DDC84] min-h-[42px]"
            >
              <option value="">Default Quick Probe Model</option>
              {apiKey.modelsList.slice(0, 30).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.isFree ? '(Free)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Result Area */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border ${
              testResult.success
                ? 'bg-[#3DDC84]/10 border-[#3DDC84]/30'
                : 'bg-[#FF5C6C]/10 border-[#FF5C6C]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-[#3DDC84]" />
                ) : (
                  <ShieldX className="w-5 h-5 text-[#FF5C6C]" />
                )}
                <span className="text-sm font-semibold text-white">
                  {testResult.success ? 'Probe Succeeded' : 'Probe Failed'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 text-xs font-mono text-white">
                <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>{testResult.latencyMs} ms</span>
              </div>
            </div>

            {testResult.success ? (
              <div className="mt-3 text-xs text-[#8B93A7]">
                <p>Provider responded with output:</p>
                <div className="mt-1 p-2 rounded-lg bg-black/50 font-mono text-white/90 text-[11px]">
                  &quot;{testResult.resultText}&quot;
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-[#FF5C6C] space-y-1.5">
                <p className="font-medium">{testResult.error}</p>
                {testResult.retryAfterSeconds && (
                  <div className="p-2 rounded-lg bg-black/40 text-[11px] text-[#F5B84B] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Retry-After recommendation: wait {testResult.retryAfterSeconds}s</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8B93A7] hover:text-white hover:bg-white/5 transition-colors min-h-[44px]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 active:scale-95 transition-all min-h-[44px] shadow-sm disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Probing Latency...' : 'Run Test Ping'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
