'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  GitBranch,
  Github,
  Play,
  Terminal,
  ExternalLink,
  RotateCw,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  Globe,
  Loader2,
  ShieldAlert,
  Key,
  Layers,
  ChevronRight,
  StopCircle,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import type { DroidProject, ProjectGithubConfig } from '../../lib/db';
import { useGithubStore } from '../../store/useGithubStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useKeyStore } from '../../store/useKeyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { GithubConnectModal } from '../github/GithubConnectModal';
import { RepoSelectorModal } from '../github/RepoSelectorModal';
import { runAutoFixLoop, type AutoFixAttempt } from '../agent/autoFixLoop';

interface PreviewBuildPaneProps {
  project: DroidProject;
  mode?: 'preview' | 'build';
}

export const PreviewBuildPane: React.FC<PreviewBuildPaneProps> = ({
  project,
  mode = 'preview',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'build' | 'release'>(mode);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);

  // Stores
  const {
    credential,
    activeWorkflowRun,
    latestBuilderStatus,
    isPollingBuild,
    isPushing,
    pushCurrentProject,
    triggerBuild,
    pollBuildRun,
    loadCredential,
  } = useGithubStore();
  const { updateProjectFiles } = useProjectStore();
  const { keys, loadKeys } = useKeyStore();
  const { fixerModel } = useSettingsStore();

  // Local build and preview state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPushingNow, setIsPushingNow] = useState(false);
  const [previewMinutesUsed, setPreviewMinutesUsed] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem('droidforge_appetize_minutes');
      return saved ? parseFloat(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [iframeKey, setIframeKey] = useState(0);

  // Auto-Fix loop state
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixAttempt, setAutoFixAttempt] = useState(1);
  const [autoFixMaxAttempts, setAutoFixMaxAttempts] = useState(4);
  const [autoFixStatusText, setAutoFixStatusText] = useState('');
  const [autoFixHistory, setAutoFixHistory] = useState<AutoFixAttempt[]>([]);
  const autoFixAbortControllerRef = useRef<AbortController | null>(null);

  // Load credentials & keys on mount
  useEffect(() => {
    loadCredential().catch(console.warn);
    loadKeys().catch(console.warn);
  }, [loadCredential, loadKeys]);

  // Start polling workflow runs if repo is configured
  const githubConfig = project.githubConfig;
  useEffect(() => {
    if (!githubConfig || !credential) return;

    const stopPolling = pollBuildRun(githubConfig.repoOwner, githubConfig.repoName);
    return () => {
      stopPolling();
    };
  }, [githubConfig, credential, pollBuildRun]);

  // Elapsed timer when build is in progress
  useEffect(() => {
    if (activeWorkflowRun?.status !== 'in_progress' && activeWorkflowRun?.status !== 'queued') {
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [activeWorkflowRun?.status]);

  // Track preview time when viewing iframe
  useEffect(() => {
    let previewInterval: any = null;
    const hasStream = latestBuilderStatus?.appetizePublicKey;
    if (activeTab === 'preview' && hasStream) {
      previewInterval = setInterval(() => {
        setPreviewMinutesUsed((prev) => {
          const updated = +(prev + 0.1).toFixed(1);
          localStorage.setItem('droidforge_appetize_minutes', updated.toString());
          return updated;
        });
      }, 6000); // every 6s = 0.1 min
    }
    return () => {
      if (previewInterval) clearInterval(previewInterval);
    };
  }, [activeTab, latestBuilderStatus?.appetizePublicKey]);

  // Format seconds to mm:ss
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Push project commit & trigger build
  const handlePushAndBuild = async () => {
    if (!githubConfig || !credential) {
      if (!credential) setIsConnectModalOpen(true);
      else setIsRepoModalOpen(true);
      return;
    }

    setIsPushingNow(true);
    try {
      await pushCurrentProject(
        githubConfig.repoOwner,
        githubConfig.repoName,
        project.files,
        `update(android): sync workspace changes (${new Date().toLocaleTimeString()})`
      );
      // Wait 1s and trigger build if push doesn't automatically trigger (push to main triggers it)
      setTimeout(() => {
        pollBuildRun(githubConfig.repoOwner, githubConfig.repoName);
      }, 2000);
    } catch (err: any) {
      alert(`Push failed: ${err.message}`);
    } finally {
      setIsPushingNow(false);
    }
  };

  // Re-run workflow dispatch
  const handleRerun = async () => {
    if (!githubConfig) return;
    try {
      await triggerBuild(githubConfig.repoOwner, githubConfig.repoName);
      pollBuildRun(githubConfig.repoOwner, githubConfig.repoName);
    } catch (err: any) {
      alert(`Build dispatch failed: ${err.message}`);
    }
  };

  // Run Auto-Fix Loop
  const handleStartAutoFix = async () => {
    if (!githubConfig || !latestBuilderStatus?.errors?.length) return;

    // Find active AI key for Fixer model
    const activeKey = keys.find((k) => k.status === 'valid');
    if (!activeKey) {
      alert('Please add a valid AI Key in Key Vault first to run the Auto-Fix model.');
      return;
    }

    setIsAutoFixing(true);
    setAutoFixStatusText('Starting Auto-Fix loop...');
    autoFixAbortControllerRef.current = new AbortController();

    try {
      const result = await runAutoFixLoop({
        project,
        errors: latestBuilderStatus.errors,
        fixerKey: activeKey,
        fixerModel,
        maxAttempts: autoFixMaxAttempts,
        abortSignal: autoFixAbortControllerRef.current.signal,
        onAttemptStart: (attempt, max) => {
          setAutoFixAttempt(attempt);
          setAutoFixStatusText(`Attempt ${attempt} of ${max}: Analyzing build logs...`);
        },
        onAttemptProgress: (attempt, msg) => {
          setAutoFixStatusText(`Attempt ${attempt}: ${msg}`);
        },
        onAttemptComplete: (record) => {
          setAutoFixHistory((prev) => [...prev, record]);
        },
        executePushAndPoll: async (updatedFiles, commitMsg) => {
          // 1. Update project files in local Dexie store
          await updateProjectFiles(project.id, updatedFiles, [
            `Auto-fix commit: ${commitMsg}`,
          ]);

          // 2. Push commit to GitHub
          await pushCurrentProject(
            githubConfig.repoOwner,
            githubConfig.repoName,
            updatedFiles,
            commitMsg
          );

          // 3. Poll for build result
          return new Promise((resolve) => {
            const checkStop = pollBuildRun(
              githubConfig.repoOwner,
              githubConfig.repoName,
              (run, status) => {
                if (status?.state === 'success') {
                  checkStop();
                  resolve({ success: true, newErrors: [] });
                } else if (status?.state === 'failed') {
                  checkStop();
                  resolve({ success: false, newErrors: status.errors || ['Build failed'] });
                }
              }
            );

            // Timeout after 8 minutes if still waiting
            setTimeout(() => {
              checkStop();
              resolve({ success: false, newErrors: ['Build verification timed out.'] });
            }, 480000);
          });
        },
      });

      if (result.success) {
        setAutoFixStatusText('Build fixed and verified successfully!');
      } else {
        setAutoFixStatusText('Auto-fix finished all attempts without complete resolution.');
      }
    } catch (err: any) {
      setAutoFixStatusText(`Auto-fix encountered error: ${err.message}`);
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleStopAutoFix = () => {
    if (autoFixAbortControllerRef.current) {
      autoFixAbortControllerRef.current.abort();
    }
    setIsAutoFixing(false);
    setAutoFixStatusText('Auto-fix stopped by user.');
  };

  const hasAppetizeStream = !!latestBuilderStatus?.appetizePublicKey;
  const isBuildRunning =
    isPushing ||
    isPushingNow ||
    activeWorkflowRun?.status === 'in_progress' ||
    activeWorkflowRun?.status === 'queued';
  const isBuildFailed =
    latestBuilderStatus?.state === 'failed' || activeWorkflowRun?.conclusion === 'failure';
  const isBuildSuccess =
    latestBuilderStatus?.state === 'success' || activeWorkflowRun?.conclusion === 'success';

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Sub-Header Tabs */}
      <div className="flex items-center justify-between p-1 rounded-xl bg-[#0E1016] border border-white/8 text-xs shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-[#141722] text-[#3DDC84] shadow-sm border border-white/8'
                : 'text-[#8B93A7] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Device Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('build')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'build'
                ? 'bg-[#141722] text-[#22D3EE] shadow-sm border border-white/8'
                : 'text-[#8B93A7] hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Build Console</span>
            {isBuildRunning && (
              <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
            )}
            {isBuildFailed && (
              <span className="w-2 h-2 rounded-full bg-[#FF5C6C]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('release')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'release'
                ? 'bg-[#141722] text-[#8B5CF6] shadow-sm border border-white/8'
                : 'text-[#8B93A7] hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Release & Phone</span>
          </button>
        </div>

        {githubConfig ? (
          <a
            href={githubConfig.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-mono text-[#8B93A7] hover:text-white pr-2 transition-colors"
          >
            <Github className="w-3 h-3" />
            <span>{githubConfig.repoName}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : (
          <button
            onClick={() => {
              if (!credential) setIsConnectModalOpen(true);
              else setIsRepoModalOpen(true);
            }}
            className="text-[11px] text-[#22D3EE] hover:underline pr-2 flex items-center gap-1 font-medium"
          >
            <Github className="w-3 h-3" />
            <span>Link GitHub</span>
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* ==================== TAB 1: DEVICE PREVIEW ==================== */}
        {activeTab === 'preview' && (
          <div className="h-full flex flex-col space-y-3">
            {!githubConfig ? (
              <GlassCard radius={20} className="p-6 text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#3DDC84]/10 border border-[#3DDC84]/20 flex items-center justify-center mx-auto text-[#3DDC84]">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">Connect GitHub for Live Preview</h3>
                  <p className="text-xs text-[#8B93A7] max-w-md mx-auto leading-relaxed">
                    DroidForge compiles 100% native Kotlin + Jetpack Compose via GitHub Actions.
                    Connect GitHub to stream the compiled APK directly in your browser.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/6 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#3DDC84] font-medium text-[11px]">
                    <span>True Native Android Execution</span>
                    <span className="font-mono text-white/80">ART / JVM Required</span>
                  </div>
                  <p className="text-[#8B93A7] leading-relaxed text-[11px]">
                    No fake HTML mocks. DroidForge compiles standard APKs and streams them via Appetize.io
                    or direct device installation.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!credential) setIsConnectModalOpen(true);
                    else setIsRepoModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 transition-opacity"
                >
                  <Github className="w-4 h-4" />
                  <span>Connect GitHub & Target Repo</span>
                </button>
              </GlassCard>
            ) : hasAppetizeStream ? (
              <div className="h-full flex flex-col space-y-2">
                {/* Streaming Controls Bar */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0E1016] border border-white/8 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3DDC84] animate-ping" />
                    <span className="text-white font-medium">Appetize Android Stream</span>
                    <span className="text-[10px] text-[#8B93A7] font-mono">
                      (Pixel 7 • Android 14)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#8B93A7]">
                      Session: <strong className="text-white">{previewMinutesUsed} min</strong>
                    </span>
                    <button
                      onClick={() => setIframeKey((k) => k + 1)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs transition-colors"
                      title="Reload Device"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`https://appetize.io/app/${latestBuilderStatus?.appetizePublicKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] hover:bg-[#22D3EE]/20 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>New Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Device Frame */}
                <div className="flex-1 flex items-center justify-center p-2 rounded-2xl bg-black/60 border border-white/8 overflow-hidden">
                  <div className="w-[320px] h-[580px] rounded-[36px] bg-[#0E1016] border-[6px] border-[#1C2030] shadow-2xl relative flex flex-col overflow-hidden">
                    {/* Camera Punchhole */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black z-20 border border-white/10" />

                    {/* IFrame */}
                    <iframe
                      key={iframeKey}
                      src={`https://appetize.io/embed/${latestBuilderStatus?.appetizePublicKey}?device=pixel7&osVersion=14.0&scale=75&autoplay=true`}
                      className="w-full h-full border-0 rounded-[30px]"
                      allow="autoplay; camera"
                      title="Android App Preview"
                    />
                  </div>
                </div>
              </div>
            ) : isBuildSuccess ? (
              <GlassCard radius={20} className="p-6 text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#3DDC84]/10 border border-[#3DDC84]/20 flex items-center justify-center mx-auto text-[#3DDC84]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">Native APK Built Successfully</h3>
                  <p className="text-xs text-[#8B93A7] max-w-md mx-auto leading-relaxed">
                    Your native Android APK is assembled and ready in GitHub Releases.
                  </p>
                </div>

                {latestBuilderStatus?.apkUrl && (
                  <div className="pt-2">
                    <a
                      href={latestBuilderStatus.apkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3DDC84] text-black font-semibold text-xs hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download app-debug.apk</span>
                    </a>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/6 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#22D3EE] font-medium text-[11px]">
                    <span>Enable In-Browser Streaming</span>
                    <span className="font-mono text-white/80">Appetize.io BYOK</span>
                  </div>
                  <p className="text-[#8B93A7] leading-relaxed text-[11px]">
                    To stream this APK interactively inside DroidForge, add your Appetize token under
                    Repo Settings. Free plan includes ~30 min/month.
                  </p>
                </div>
              </GlassCard>
            ) : isBuildRunning ? (
              <GlassCard radius={20} className="p-6 text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">Assembling APK in GitHub Actions</h3>
                  <p className="text-xs text-[#8B93A7] max-w-md mx-auto leading-relaxed">
                    Gradle 8.7 is compiling Kotlin source, Compose UI BOM, and packaging resources.
                  </p>
                </div>
                <div className="font-mono text-xl text-[#22D3EE] font-bold">
                  {formatTimer(elapsedSeconds)}
                </div>
                <button
                  onClick={() => setActiveTab('build')}
                  className="text-xs text-[#22D3EE] hover:underline"
                >
                  View live build logs in Build Console →
                </button>
              </GlassCard>
            ) : (
              <GlassCard radius={20} className="p-6 text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white">
                  <Terminal className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">Ready for First Build</h3>
                  <p className="text-xs text-[#8B93A7] max-w-md mx-auto leading-relaxed">
                    Push your Android project code to trigger automated Gradle assembleDebug on Ubuntu.
                  </p>
                </div>
                <button
                  onClick={handlePushAndBuild}
                  disabled={isPushingNow}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] text-black font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPushingNow ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>Push & Run CI Build</span>
                </button>
              </GlassCard>
            )}
          </div>
        )}

        {/* ==================== TAB 2: BUILD CONSOLE ==================== */}
        {activeTab === 'build' && (
          <div className="space-y-3">
            {/* Build Status Card */}
            <GlassCard radius={20} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#22D3EE]" />
                  <span className="text-xs font-semibold text-white">GitHub Actions CI Pipeline</span>
                </div>

                {activeWorkflowRun && (
                  <a
                    href={activeWorkflowRun.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#22D3EE] hover:underline font-mono"
                  >
                    <span>Run #{activeWorkflowRun.run_number}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {/* Status Indicator */}
              <div className="p-3 rounded-xl bg-black/50 border border-white/8 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {isBuildRunning ? (
                    <Loader2 className="w-4 h-4 text-[#22D3EE] animate-spin" />
                  ) : isBuildSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-[#3DDC84]" />
                  ) : isBuildFailed ? (
                    <AlertCircle className="w-4 h-4 text-[#FF5C6C]" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#8B93A7]" />
                  )}

                  <div>
                    <span className="font-medium text-white block">
                      {isPushingNow
                        ? 'Pushing code to GitHub...'
                        : isBuildRunning
                        ? `Building APK (${activeWorkflowRun?.status || 'queued'})`
                        : isBuildSuccess
                        ? 'Build Succeeded (APK Ready)'
                        : isBuildFailed
                        ? 'Build Failed (Compiler Diagnostics Available)'
                        : 'No active build'}
                    </span>
                    <span className="text-[10px] text-[#8B93A7] font-mono">
                      {githubConfig?.repoFullName} • branch main
                    </span>
                  </div>
                </div>

                {isBuildRunning && (
                  <span className="font-mono text-[#22D3EE] font-semibold text-xs">
                    {formatTimer(elapsedSeconds)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handlePushAndBuild}
                  disabled={isPushingNow || isBuildRunning}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPushingNow ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Push & Build Now</span>
                </button>

                <button
                  onClick={handleRerun}
                  disabled={isBuildRunning || !githubConfig}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Dispatch Workflow Again"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-run</span>
                </button>
              </div>
            </GlassCard>

            {/* Error Diagnostics & Auto-Fix Section */}
            {isBuildFailed && latestBuilderStatus?.errors && latestBuilderStatus.errors.length > 0 && (
              <GlassCard radius={20} className="p-4 space-y-3 border-red-500/20 bg-red-950/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#FF5C6C]">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Compiler Diagnostics</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-[#FF5C6C] font-mono">
                    {latestBuilderStatus.errors.length} diagnostic line(s)
                  </span>
                </div>

                {/* Error Log Box */}
                <div className="p-3 rounded-xl bg-black/80 border border-red-500/20 font-mono text-[11px] text-[#FF5C6C]/90 max-h-48 overflow-y-auto space-y-1">
                  {latestBuilderStatus.errors.map((err, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {err}
                    </div>
                  ))}
                </div>

                {/* Auto-Fix Launcher */}
                <div className="p-3.5 rounded-xl bg-[#141722] border border-white/8 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                      <span className="text-xs font-semibold text-white">AI Auto-Fix Engine</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-[#8B93A7]">Max Attempts:</span>
                      <select
                        value={autoFixMaxAttempts}
                        onChange={(e) => setAutoFixMaxAttempts(parseInt(e.target.value, 10))}
                        disabled={isAutoFixing}
                        className="px-2 py-0.5 rounded bg-black/50 border border-white/10 text-white text-xs font-mono"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4 (Recommended)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#8B93A7] leading-relaxed">
                    Sends build logs, project memory, and affected source files to the Fixer model (
                    <code className="text-[#22D3EE]">{fixerModel}</code>), generates and tests surgical
                    patches, and verifies with CI until resolved.
                  </p>

                  {isAutoFixing ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#22D3EE]">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="font-mono">{autoFixStatusText}</span>
                        </div>
                        <button
                          onClick={handleStopAutoFix}
                          className="px-2 py-1 rounded bg-red-500/20 text-[#FF5C6C] text-[11px] font-medium flex items-center gap-1"
                        >
                          <StopCircle className="w-3 h-3" />
                          <span>Stop</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartAutoFix}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-white font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Auto-Fix Loop</span>
                    </button>
                  )}

                  {/* Auto-Fix History / Diffs */}
                  {autoFixHistory.length > 0 && (
                    <div className="pt-2 border-t border-white/6 space-y-1.5">
                      <span className="text-[10px] text-[#8B93A7] font-medium block">
                        Attempt History:
                      </span>
                      {autoFixHistory.map((h, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-black/40 border border-white/6 text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="text-white">Attempt #{h.attempt}</span>
                            <span
                              className={h.status === 'success' ? 'text-[#3DDC84]' : 'text-[#FF5C6C]'}
                            >
                              {h.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8B93A7]">{h.diffSummary}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {/* ==================== TAB 3: RELEASE & PHONE ==================== */}
        {activeTab === 'release' && (
          <div className="space-y-4">
            {/* Install on My Phone Card */}
            <GlassCard radius={20} className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3DDC84]/10 border border-[#3DDC84]/20 flex items-center justify-center text-[#3DDC84]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Install on Your Android Phone</h3>
                  <p className="text-xs text-[#8B93A7]">
                    Direct APK download from your automated GitHub Release
                  </p>
                </div>
              </div>

              {latestBuilderStatus?.apkUrl ? (
                <div className="space-y-3">
                  <a
                    href={latestBuilderStatus.apkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] text-black font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download app-debug.apk ({project.name})</span>
                  </a>

                  {githubConfig?.isPrivate && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#F5B84B] text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Private Repository Note</span>
                      </div>
                      <p className="leading-relaxed">
                        Because this repo is Private, you must be logged into GitHub on your phone’s
                        browser to download the release APK asset.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/6 text-xs text-[#8B93A7]">
                  No compiled APK release found yet. Trigger a build from the Build Console first.
                </div>
              )}

              {/* Sideloading Guide */}
              <div className="space-y-2 pt-2 border-t border-white/6 text-xs">
                <span className="font-medium text-white block">How to Sideload APK on Android:</span>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#8B93A7] leading-relaxed">
                  <li>Download the APK file onto your Android device.</li>
                  <li>Open your phone’s Files or Downloads app and tap the APK.</li>
                  <li>
                    If prompted with <em>&quot;Install unknown apps&quot;</em>, tap <strong>Settings</strong> and
                    enable <strong>&quot;Allow from this source&quot;</strong>.
                  </li>
                  <li>Tap <strong>Install</strong> to launch the native app.</li>
                </ol>
              </div>
            </GlassCard>

            {/* Signed Release Guide Card */}
            <GlassCard radius={20} className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Play Signed Release Guide</h3>
                  <p className="text-xs text-[#8B93A7]">
                    Preparing an Android App Bundle (AAB) for production distribution
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-white font-medium block">1. Generate Release Keystore:</span>
                  <pre className="p-2.5 rounded-xl bg-black/70 border border-white/10 font-mono text-[10px] text-[#3DDC84] overflow-x-auto">
                    keytool -genkey -v -keystore release.keystore -alias droidforge -keyalg RSA -keysize 2048 -validity 10000
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#FF5C6C] text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Keystore Backup Warning</span>
                  </div>
                  <p className="leading-relaxed">
                    Keep your keystore file and passwords in a secure password manager. If lost, Google
                    Play cannot accept future updates to your application.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-white font-medium block">2. Assemble Bundle:</span>
                  <pre className="p-2.5 rounded-xl bg-black/70 border border-white/10 font-mono text-[10px] text-[#22D3EE]">
                    gradle bundleRelease
                  </pre>
                  <p className="text-[10px] text-[#8B93A7]">
                    Outputs <code>app/build/outputs/bundle/release/app-release.aab</code> for upload to Google Play Console.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Modals */}
      <GithubConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {githubConfig ? null : (
        <RepoSelectorModal
          isOpen={isRepoModalOpen}
          project={project}
          onClose={() => setIsRepoModalOpen(false)}
        />
      )}
    </div>
  );
};
