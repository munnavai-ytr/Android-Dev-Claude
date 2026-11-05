'use client';

import React, { useState, useEffect } from 'react';
import {
  Github,
  Plus,
  Link as LinkIcon,
  Globe,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useGithubStore } from '../../store/useGithubStore';
import { useProjectStore } from '../../store/useProjectStore';
import type { DroidProject, ProjectGithubConfig } from '../../lib/db';

interface RepoSelectorModalProps {
  isOpen: boolean;
  project: DroidProject;
  onClose: () => void;
  onLinked?: (config: ProjectGithubConfig) => void;
}

export const RepoSelectorModal: React.FC<RepoSelectorModalProps> = ({
  isOpen,
  project,
  onClose,
  onLinked,
}) => {
  const { credential, userRepos, isLoadingRepos, fetchUserRepos, createRepoForProject, saveAppetizeToken, pushCurrentProject } =
    useGithubStore();
  const { updateProjectGithubConfig } = useProjectStore();

  const [tab, setTab] = useState<'create' | 'existing'>('create');
  const [repoName, setRepoName] = useState(() =>
    project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState('');
  const [appetizeToken, setAppetizeToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && credential) {
      fetchUserRepos().catch(console.warn);
    }
  }, [isOpen, credential, fetchUserRepos]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let targetOwner = credential.username;
      let targetRepo = repoName.trim();
      let isRepoPrivate = isPrivate;
      let targetHtmlUrl = `https://github.com/${targetOwner}/${targetRepo}`;

      if (tab === 'create') {
        setStatusMessage('Creating GitHub repository...');
        const newRepo = await createRepoForProject({
          projectId: project.id,
          repoName: targetRepo,
          isPrivate,
          description: `Native Android app (${project.name}) forged with Jetpack Compose & Material 3`,
        });
        targetOwner = newRepo.full_name.split('/')[0];
        targetRepo = newRepo.name;
        isRepoPrivate = newRepo.private;
        targetHtmlUrl = newRepo.html_url;
      } else {
        const found = userRepos.find((r) => r.full_name === selectedRepoFullName);
        if (!found) {
          throw new Error('Please select an existing repository.');
        }
        targetOwner = found.full_name.split('/')[0];
        targetRepo = found.name;
        isRepoPrivate = found.private;
        targetHtmlUrl = found.html_url;
      }

      // Configure Appetize secret if provided
      let appetizeConfigured = false;
      if (appetizeToken.trim()) {
        setStatusMessage('Encrypting & storing APPETIZE_TOKEN in repository secrets via libsodium...');
        await saveAppetizeToken(targetOwner, targetRepo, appetizeToken.trim());
        appetizeConfigured = true;
      }

      // Push initial project commit
      setStatusMessage('Pushing initial commit via GitHub Git Data API...');
      const pushRes = await pushCurrentProject(
        targetOwner,
        targetRepo,
        project.files,
        `feat: initialize ${project.name} native Android app from DroidForge`
      );

      const config: ProjectGithubConfig = {
        repoOwner: targetOwner,
        repoName: targetRepo,
        repoFullName: `${targetOwner}/${targetRepo}`,
        repoUrl: targetHtmlUrl,
        isPrivate: isRepoPrivate,
        defaultBranch: 'main',
        lastPushedSha: pushRes.commitSha,
        lastPushedAt: Date.now(),
        appetizeConfigured,
      };

      await updateProjectGithubConfig(project.id, config);
      onLinked?.(config);
      onClose();
    } catch (err: any) {
      console.error('Failed to link repo:', err);
      setErrorMessage(err.message || 'Failed to complete repository connection.');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg">
        <GlassCard radius={28} className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center text-[#22D3EE]">
                <Github className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Link GitHub Repository</h3>
                <p className="text-xs text-[#8B93A7]">
                  Target repository for cloud compilation & CI/CD
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

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0E1016] border border-white/8 text-xs">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'create'
                  ? 'bg-[#141722] text-[#3DDC84] shadow-sm border border-white/8'
                  : 'text-[#8B93A7] hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Repo</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('existing')}
              className={`py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'existing'
                  ? 'bg-[#141722] text-[#22D3EE] shadow-sm border border-white/8'
                  : 'text-[#8B93A7] hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Select Existing Repo</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'create' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#8B93A7] mb-1">
                    Repository Name
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 rounded-l-xl bg-black/60 border border-r-0 border-white/10 text-xs font-mono text-[#8B93A7]">
                      {credential?.username}/
                    </span>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="my-android-app"
                      className="flex-1 px-3 py-2 rounded-r-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#22D3EE]"
                      required
                    />
                  </div>
                </div>

                {/* Public vs Private with explicit plain note */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#8B93A7]">
                    Repository Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(false)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        !isPrivate
                          ? 'bg-[#3DDC84]/10 border-[#3DDC84]/30 text-white'
                          : 'bg-black/30 border-white/8 text-[#8B93A7]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#3DDC84]">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Public (Recommended)</span>
                      </div>
                      <p className="text-[10px] text-[#8B93A7] mt-1">
                        Unlimited free GitHub Actions minutes for builds.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isPrivate
                          ? 'bg-[#22D3EE]/10 border-[#22D3EE]/30 text-white'
                          : 'bg-black/30 border-white/8 text-[#8B93A7]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#22D3EE]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Private</span>
                      </div>
                      <p className="text-[10px] text-[#8B93A7] mt-1">
                        Uses your personal monthly free minutes allowance (~2,000 min).
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-[#8B93A7]">
                  Choose Existing Repository
                </label>
                {isLoadingRepos ? (
                  <div className="p-6 text-center text-xs text-[#8B93A7] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#22D3EE]" />
                    <span>Loading repositories from GitHub...</span>
                  </div>
                ) : userRepos.length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/8 text-xs text-center text-[#8B93A7]">
                    No repositories found under this account.
                  </div>
                ) : (
                  <select
                    value={selectedRepoFullName}
                    onChange={(e) => setSelectedRepoFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#22D3EE]"
                    required
                  >
                    <option value="">Select a repository...</option>
                    {userRepos.map((repo) => (
                      <option key={repo.id} value={repo.full_name}>
                        {repo.full_name} ({repo.private ? 'Private' : 'Public'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Optional Appetize.io Token Setup */}
            <div className="p-3.5 rounded-xl bg-[#141722]/50 border border-white/8 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-[#3DDC84]" />
                  <span>Interactive Appetize.io Stream (Optional BYOK)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#8B93A7]">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-[#8B93A7] leading-relaxed">
                Appetize provides in-browser interactive streaming of native Android APKs. Free plan
                includes ~30 min/month. Encrypted in browser and saved as repo secret{' '}
                <code className="text-[#3DDC84]">APPETIZE_TOKEN</code>.
              </p>
              <input
                type="password"
                value={appetizeToken}
                onChange={(e) => setAppetizeToken(e.target.value)}
                placeholder="tok_... (Appetize API Token)"
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white placeholder-[#8B93A7]/50 text-xs font-mono focus:outline-none focus:border-[#3DDC84]"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#FF5C6C] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isSubmitting && statusMessage && (
              <div className="p-3 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 text-[#22D3EE] text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#8B93A7] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (tab === 'existing' && !selectedRepoFullName)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] text-black font-semibold text-xs flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Link & Push Initial Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
