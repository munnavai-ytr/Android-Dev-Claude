'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Github,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Loader2,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useGithubStore } from '../../store/useGithubStore';

interface GithubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GithubConnectModal: React.FC<GithubConnectModalProps> = ({ isOpen, onClose }) => {
  const { credential, connectToken, disconnect, isConnecting, error } = useGithubStore();
  const [tokenInput, setTokenInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLocalError(null);
    try {
      await connectToken(tokenInput.trim());
      setTokenInput('');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to authenticate token with GitHub API.');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl">
        <GlassCard radius={28} className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Connect GitHub Account</h3>
                <p className="text-xs text-[#8B93A7]">
                  Enable automated cloud Gradle compilation, releases, and streaming previews
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#8B93A7] hover:text-white text-lg p-1 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Current Connected Status */}
          {credential ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0E1016] border border-[#3DDC84]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={credential.avatarUrl}
                    alt={credential.username}
                    width={48}
                    height={48}
                    referrerPolicy="no-referrer"
                    unoptimized
                    className="w-12 h-12 rounded-xl border border-white/10"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {credential.name || credential.username}
                      </span>
                      <span className="text-xs text-[#8B93A7]">@{credential.username}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#3DDC84] mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Authenticated & Encrypted ({credential.maskedToken})</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[#FF5C6C] text-xs font-medium border border-red-500/20 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

              {/* Security info */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/6 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-white/90 font-medium">
                  <Shield className="w-3.5 h-3.5 text-[#3DDC84]" />
                  <span>Non-Extractable In-Browser Storage</span>
                </div>
                <p className="text-[#8B93A7] leading-relaxed text-[11px]">
                  Your GitHub token is encrypted via WebCrypto AES-GCM and stored only inside your
                  browser&apos;s IndexedDB. It is sent exclusively to{' '}
                  <code className="text-[#22D3EE]">https://api.github.com</code>.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[#3DDC84] text-black font-semibold text-xs hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Token Guidelines Accordion / Box */}
              <div className="p-4 rounded-xl bg-[#141722]/70 border border-white/8 space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#22D3EE] shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <span className="font-medium text-white block">
                      Creating a Fine-Grained Personal Access Token (PAT)
                    </span>
                    <p className="text-[#8B93A7] text-[11px] leading-relaxed">
                      Visit{' '}
                      <a
                        href="https://github.com/settings/tokens?type=beta"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#22D3EE] inline-flex items-center gap-1 underline"
                      >
                        github.com/settings/tokens
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      and create a token with:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-white/80 font-mono">
                      <li>
                        <strong className="text-white">Contents:</strong> Read & Write (to commit
                        project code)
                      </li>
                      <li>
                        <strong className="text-white">Actions:</strong> Read & Write (to run CI
                        builds)
                      </li>
                      <li>
                        <strong className="text-white">Secrets:</strong> Read & Write (for Appetize
                        tokens)
                      </li>
                      <li>
                        <strong className="text-white">Administration:</strong> Read & Write (if
                        creating repos)
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/6 flex items-center justify-between text-[11px] text-[#8B93A7]">
                  <span>Public repos get unlimited free GitHub Actions minutes</span>
                  <span className="text-[#3DDC84] font-medium">Free Tier Friendly</span>
                </div>
              </div>

              {/* Token Form */}
              <form onSubmit={handleConnect} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
                    Personal Access Token (starts with <code>github_pat_</code> or <code>ghp_</code>)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="github_pat_11A... or ghp_..."
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-[#8B93A7]/50 text-xs font-mono focus:outline-none focus:border-[#22D3EE]"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {(error || localError) && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#FF5C6C] text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error || localError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#8B93A7] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting || !tokenInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] text-black font-semibold text-xs flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validating with GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Connect & Validate Token</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
