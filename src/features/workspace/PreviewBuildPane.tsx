'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  GitBranch,
  Github,
  Play,
  Terminal,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import type { DroidProject } from '../../lib/db';

interface PreviewBuildPaneProps {
  project: DroidProject;
  mode?: 'preview' | 'build';
}

export const PreviewBuildPane: React.FC<PreviewBuildPaneProps> = ({
  project,
  mode = 'preview',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'build'>(mode);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Sub-Header Mode Switcher */}
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
            <span>APK Build & CI</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-[#8B93A7] pr-2">
          Target SDK 35
        </span>
      </div>

      {/* Mode Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'preview' ? (
          <GlassCard radius={20} className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#3DDC84]/10 border border-[#3DDC84]/20 flex items-center justify-center mx-auto text-[#3DDC84]">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">
                Live Android Runtime Preview
              </h3>
              <p className="text-xs text-[#8B93A7] max-w-md mx-auto leading-relaxed">
                Connect GitHub in the next step to stream real-time interactive previews via
                Appetize.io or Android Cloud Virtual Devices.
              </p>
            </div>

            {/* Honest Technical Note */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/6 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#3DDC84] font-medium text-[11px]">
                <span>No Fake Previews Invariant</span>
                <span className="font-mono text-white/80">ART / JVM Required</span>
              </div>
              <p className="text-[#8B93A7] leading-relaxed text-[11px]">
                Jetpack Compose relies on Google’s Kotlin compiler plugin and native Android runtime
                graphics drivers. DroidForge does not render mock HTML imitations.
              </p>
            </div>

            {/* Target Spec Badges */}
            <div className="pt-2 grid grid-cols-2 gap-2 text-xs text-left">
              <div className="p-2.5 rounded-xl bg-white/3 border border-white/6">
                <span className="text-[10px] text-[#8B93A7] block">UI Framework</span>
                <span className="text-white font-medium">Material 3 Compose</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/3 border border-white/6">
                <span className="text-[10px] text-[#8B93A7] block">Edge-to-Edge</span>
                <span className="text-white font-medium">Android 15 Enabled</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-[#8B93A7] bg-white/4 border border-white/10 opacity-70 cursor-not-allowed"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Connect GitHub in next step</span>
              </button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard radius={20} className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
              <Terminal className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">
                Release APK / AAB Assembly
              </h3>
              <p className="text-xs text-[#8B93A7] max-w-md mx-auto leading-relaxed">
                Connect GitHub in the next step to dispatch automated CI/CD builds with Gradle 8.7+
                and sign release APKs directly to your GitHub Releases.
              </p>
            </div>

            {/* Build Specifications */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/6 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#22D3EE] font-medium text-[11px]">
                <span>Build Configuration</span>
                <span className="font-mono text-white/80">{project.packageName}</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono text-[#8B93A7]">
                <div>• Compile SDK: 35 (Android 15)</div>
                <div>• Min SDK: 26 (Android 8.0 Oreo)</div>
                <div>• Version Catalog: gradle/libs.versions.toml</div>
                <div>• ProGuard: app/proguard-rules.pro</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-[#8B93A7] bg-white/4 border border-white/10 opacity-70 cursor-not-allowed"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Connect GitHub in next step</span>
              </button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
