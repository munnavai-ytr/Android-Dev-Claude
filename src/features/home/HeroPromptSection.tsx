'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  FolderGit2,
  KeyRound,
  Zap,
  Code2,
} from 'lucide-react';
import { useKeyStore } from '../../store/useKeyStore';
import { useProjectStore } from '../../store/useProjectStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { CreateProjectModal } from '../projects/CreateProjectModal';

export const HeroPromptSection: React.FC = () => {
  const router = useRouter();
  const keys = useKeyStore((state) => state.keys);
  const projects = useProjectStore((state) => state.projects);
  const hasValidKey = keys.some((k) => k.status === 'valid');

  const [promptText, setPromptText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const exampleChips = [
    'Offline Habit Tracker with Jetpack Compose & Room DB',
    'Crypto Portfolio with Biometrics & Material 3 Dynamic Color',
    'Audiobook Player with Media3 ExoPlayer & Glance Widget',
    'Markdown Journal with Edge-to-Edge Navigation Compose',
  ];

  const handleStartForge = () => {
    setIsModalOpen(true);
  };

  const handleSelectExample = (chip: string) => {
    setPromptText(chip);
  };

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full">
      {/* Hero Headline */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/4 border border-white/8 text-xs text-[#8B93A7] mb-2">
          <span className="w-2 h-2 rounded-full bg-[#3DDC84]" />
          <span>Native Android Compose Engine</span>
          <span>·</span>
          <span className="text-[#3DDC84]">100% Client-Side BYOK</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight text-balance leading-tight">
          Architect Native Android Apps in <span className="text-gradient-android">Kotlin & Jetpack Compose</span>
        </h1>

        <p className="text-xs sm:text-sm text-[#8B93A7] max-w-xl mx-auto leading-relaxed">
          Bring your own Google Gemini or OpenRouter keys. No server in the middle. Direct
          browser-to-provider execution stored in IndexedDB.
        </p>
      </div>

      {/* Main Prompt Box */}
      <GlassCard radius={28} className="p-4 sm:p-6 space-y-4 border-white/12 shadow-2xl relative">
        <div className="relative">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
            placeholder="Describe the native Android app you want to build (e.g. An edge-to-edge habit tracker with Compose BOM 2024.10, Room database, swipe gestures, and dynamic Material You theme)..."
            className="w-full bg-transparent text-sm text-white placeholder:text-[#8B93A7]/60 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Example Prompt Chips */}
        <div className="space-y-2 pt-2 border-t border-white/6">
          <span className="text-[11px] text-[#8B93A7] block font-mono">Example blueprints:</span>
          <div className="flex flex-wrap gap-2">
            {exampleChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectExample(chip)}
                className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-[#141722] hover:bg-[#1B1F2E] border border-white/6 hover:border-white/14 text-[#8B93A7] hover:text-white transition-all min-h-[36px]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Action Bottom Row */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8B93A7]">
            <Smartphone className="w-3.5 h-3.5 text-[#3DDC84]" />
            <span>Target SDK 35 · Material 3</span>
            {!hasValidKey && (
              <span className="text-[11px] text-[#F5B84B] flex items-center gap-1 ml-2">
                (Add API key in Key Vault)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartForge}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 active:scale-95 transition-all min-h-[44px] shadow-lg shadow-[#3DDC84]/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Forge Android App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Recent Projects Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider font-mono">
            <FolderGit2 className="w-4 h-4 text-[#3DDC84]" />
            <span>Recent Workspaces</span>
          </div>
          <Link
            href="/projects"
            className="text-xs text-[#22D3EE] hover:underline flex items-center gap-1"
          >
            <span>View All ({projects.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {recentProjects.map((p) => (
            <Link key={p.id} href={`/project/${p.id}`}>
              <GlassCard
                radius={14}
                interactive
                className="p-4 h-full flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-semibold text-white truncate">{p.name}</h4>
                  <p className="text-[10px] font-mono text-[#8B93A7] truncate mt-0.5">
                    {p.packageName}
                  </p>
                  {p.idea && (
                    <p className="mt-2 text-[11px] text-[#8B93A7]/80 line-clamp-2">
                      {p.idea}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-white/6 flex items-center justify-between text-[10px] text-[#8B93A7]">
                  <span>{Object.keys(p.files || {}).length} files</span>
                  <span className="text-[#3DDC84] font-medium">Open →</span>
                </div>
              </GlassCard>
            </Link>
          ))}

          {recentProjects.length === 0 && (
            <div className="col-span-full p-6 rounded-2xl bg-[#0E1016]/50 border border-white/6 text-center text-xs text-[#8B93A7]">
              No workspaces yet. Describe your app idea above to generate your first Kotlin Compose project.
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialIdea={promptText}
      />
    </div>
  );
};
