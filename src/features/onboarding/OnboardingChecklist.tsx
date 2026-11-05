'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  KeyRound,
  Github,
  FolderGit2,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useKeyStore } from '../../store/useKeyStore';
import { useGithubStore } from '../../store/useGithubStore';
import { useProjectStore } from '../../store/useProjectStore';

export const OnboardingChecklist: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const keys = useKeyStore((state) => state.keys);
  const credential = useGithubStore((state) => state.credential);
  const projects = useProjectStore((state) => state.projects);

  const hasKey = keys.some((k) => k.status === 'valid');
  const hasGithub = !!credential;
  const hasProject = projects.length > 0;
  const hasLinkedRepo = projects.some((p) => !!p.githubConfig);

  const steps = [
    {
      id: 'key',
      label: 'Add AI Provider Key (BYOK)',
      desc: 'Google Gemini or OpenRouter in Key Vault',
      completed: hasKey,
      href: '/keys',
      icon: KeyRound,
      actionText: 'Configure',
    },
    {
      id: 'github',
      label: 'Connect GitHub PAT',
      desc: 'Fine-grained token with Contents, Actions & Secrets RW',
      completed: hasGithub,
      href: '/keys',
      icon: Github,
      actionText: 'Connect',
    },
    {
      id: 'project',
      label: 'Forge Native Android Project',
      desc: 'Clean Architecture, Jetpack Compose, Gradle 8.7 catalog',
      completed: hasProject,
      href: '/projects',
      icon: FolderGit2,
      actionText: 'Create',
    },
    {
      id: 'build',
      label: 'Run Cloud APK Assembly & Preview',
      desc: 'Automated assembleDebug on Ubuntu runner',
      completed: hasLinkedRepo,
      href: hasProject ? `/project/${projects[0].id}` : '/projects',
      icon: Play,
      actionText: 'Open',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  // If user completed all steps, hide or show compact celebration
  if (completedCount === 4) {
    return (
      <GlassCard radius={20} className="p-3.5 bg-[#3DDC84]/5 border-[#3DDC84]/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#3DDC84]/20 text-[#3DDC84] flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white">Full Android Pipeline Ready</span>
            <p className="text-[10px] text-[#8B93A7]">All BYOK credentials, GitHub repo, and CI workflows active.</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3DDC84]/15 text-[#3DDC84]">
          4/4 Complete
        </span>
      </GlassCard>
    );
  }

  return (
    <GlassCard radius={20} className="p-4 space-y-3 border-white/8 bg-[#0E1016]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3DDC84]" />
          <h3 className="text-xs font-semibold text-white">Getting Started Checklist</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#8B93A7]">
            {completedCount} of 4 completed
          </span>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#8B93A7] hover:text-white p-1 transition-colors"
          title={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] transition-all duration-500 rounded-full"
          style={{ width: `${(completedCount / 4) * 100}%` }}
        />
      </div>

      {/* Step items */}
      {!isCollapsed && (
        <div className="space-y-2 pt-1">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  step.completed
                    ? 'bg-black/30 border-white/5 opacity-80'
                    : 'bg-black/50 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#3DDC84] shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#8B93A7] shrink-0" />
                  )}

                  <div className="min-w-0">
                    <span
                      className={`text-xs font-medium block truncate ${
                        step.completed ? 'line-through text-[#8B93A7]' : 'text-white'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-[#8B93A7] block truncate">{step.desc}</span>
                  </div>
                </div>

                {!step.completed && (
                  <Link
                    href={step.href}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#22D3EE] text-[11px] font-medium shrink-0 border border-white/8 transition-colors"
                  >
                    {step.actionText}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
