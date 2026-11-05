'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, ExternalLink, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useKeyStore } from '../../store/useKeyStore';

interface AddKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProvider?: 'gemini' | 'openrouter';
}

export const AddKeyModal: React.FC<AddKeyModalProps> = ({
  isOpen,
  onClose,
  defaultProvider = 'gemini',
}) => {
  const [provider, setProvider] = useState<'gemini' | 'openrouter'>(defaultProvider);
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const saveKey = useKeyStore((state) => state.saveKey);
  const isValidating = useKeyStore((state) => state.isValidating);

  const handleProviderChange = (p: 'gemini' | 'openrouter') => {
    setProvider(p);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!label || label === 'Google Gemini API' || label === 'OpenRouter API') {
      setLabel(p === 'gemini' ? 'Google Gemini API' : 'OpenRouter API');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setErrorMessage('Please enter an API key.');
      return;
    }

    const defaultLabel = provider === 'gemini' ? 'Google Gemini API' : 'OpenRouter API';
    const validation = await saveKey(provider, cleanKey, label.trim() || defaultLabel);

    if (validation.valid) {
      setSuccessMessage(
        `Successfully validated! Loaded ${validation.models.length} native models.`
      );
      setTimeout(() => {
        setApiKey('');
        setLabel('');
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } else {
      setErrorMessage(validation.error || 'Failed to validate API key with provider.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add API Key to Vault"
      subtitle="Keys are encrypted with non-extractable WebCrypto AES-GCM and stored only in your browser."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Segmented Control */}
        <div>
          <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
            Select Provider
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#141722] border border-white/8">
            <button
              type="button"
              onClick={() => handleProviderChange('gemini')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 min-h-[40px] ${
                provider === 'gemini'
                  ? 'bg-[#3DDC84] text-[#07080B] font-semibold shadow-sm'
                  : 'text-[#8B93A7] hover:text-white'
              }`}
            >
              <span>Google Gemini</span>
            </button>
            <button
              type="button"
              onClick={() => handleProviderChange('openrouter')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 min-h-[40px] ${
                provider === 'openrouter'
                  ? 'bg-[#8B5CF6] text-white font-semibold shadow-sm'
                  : 'text-[#8B93A7] hover:text-white'
              }`}
            >
              <span>OpenRouter</span>
            </button>
          </div>
        </div>

        {/* Key Label Input */}
        <div>
          <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
            Key Label (Optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={provider === 'gemini' ? 'Google Gemini API' : 'OpenRouter API'}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141722]/80 border border-white/10 text-xs text-white placeholder:text-[#8B93A7]/50 focus:outline-none focus:border-[#3DDC84] transition-colors min-h-[42px]"
          />
        </div>

        {/* API Key Secret Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-[#8B93A7]">
              Secret API Key
            </label>
            <a
              href={
                provider === 'gemini'
                  ? 'https://aistudio.google.com/app/apikey'
                  : 'https://openrouter.ai/keys'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#22D3EE] hover:underline flex items-center gap-1"
            >
              <span>Get {provider === 'gemini' ? 'Gemini' : 'OpenRouter'} key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-or-v1-...'}
              autoComplete="off"
              spellCheck="false"
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#141722]/80 border border-white/10 text-xs font-mono text-white placeholder:text-[#8B93A7]/50 focus:outline-none focus:border-[#3DDC84] transition-colors min-h-[42px]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/40 hover:text-white transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FF5C6C]/10 border border-[#FF5C6C]/25 text-xs text-[#FF5C6C] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-[#3DDC84]/10 border border-[#3DDC84]/25 text-xs text-[#3DDC84] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Security Invariant Notice */}
        <p className="text-[11px] text-[#8B93A7] leading-relaxed">
          Validation directly checks the provider’s live REST endpoints. On save, keys are
          AES-GCM encrypted and stored exclusively in browser IndexedDB.
        </p>

        {/* Modal Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isValidating}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8B93A7] hover:text-white hover:bg-white/5 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isValidating || !apiKey.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 active:scale-95 transition-all min-h-[44px] shadow-sm disabled:opacity-50"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Validating Key...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Save & Validate</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
