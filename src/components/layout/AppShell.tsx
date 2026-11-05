'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Code2,
  FolderGit2,
  KeyRound,
  Settings,
  Activity,
  Layers,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { ServiceWorkerRegister } from '../pwa/ServiceWorkerRegister';
import { useKeyStore } from '../../store/useKeyStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useUsageStore } from '../../store/useUsageStore';
import { OnboardingModal } from '../../features/onboarding/OnboardingModal';

interface AppShellProps {
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const loadKeys = useKeyStore((state) => state.loadKeys);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const refreshUsage = useUsageStore((state) => state.refreshUsage);
  const onboardingCompleted = useSettingsStore((state) => state.onboardingCompleted);

  const keys = useKeyStore((state) => state.keys);
  const validKeysCount = keys.filter((k) => k.status === 'valid').length;

  useEffect(() => {
    loadKeys();
    loadProjects();
    loadSettings();
    refreshUsage();
  }, [loadKeys, loadProjects, loadSettings, refreshUsage]);

  const navLinks = [
    { label: 'Prompt & Forge', href: '/', icon: Code2, desc: 'AI Android builder' },
    { label: 'Projects', href: '/projects', icon: FolderGit2, desc: 'IndexedDB workspaces' },
    { label: 'Key Vault', href: '/keys', icon: KeyRound, desc: 'Encrypted BYOK credentials' },
    { label: 'Settings & Backups', href: '/settings', icon: Settings, desc: 'Model roles & JSON export' },
  ];

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#07080B] text-[#F2F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3DDC84] to-[#22D3EE] animate-pulse" />
          <span className="text-xs font-mono text-[#8B93A7]">Initializing DroidForge...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-[#F2F4F8] flex flex-col antialiased">
      <ServiceWorkerRegister />
      <OfflineIndicator />

      {/* Onboarding Flow: shown when first opening */}
      <OnboardingModal />

      {/* Top Bar Navigation */}
      <TopBar />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Rail (>= 1024px) */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-white/8 p-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="px-3 py-2 rounded-xl bg-[#0E1016] border border-white/6">
              <div className="flex items-center justify-between text-xs text-[#8B93A7] mb-1">
                <span>Native Target</span>
                <span className="font-mono text-white">SDK 35</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#3DDC84]">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Kotlin + Jetpack Compose</span>
              </div>
            </div>

            <nav className="space-y-1">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-[#141722] text-white border border-white/10'
                        : 'text-[#8B93A7] hover:text-white hover:bg-white/4'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-[#3DDC84]' : 'text-[#8B93A7] group-hover:text-white'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      <span className="text-[10px] text-[#8B93A7]/70 font-normal">
                        {item.desc}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Key Vault Quick Summary */}
          <div className="p-3.5 rounded-xl bg-[#0E1016]/90 border border-white/6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/90">Client-Side Vault</span>
              <span className="text-[10px] font-mono text-[#3DDC84] bg-[#3DDC84]/10 px-1.5 py-0.5 rounded">
                AES-GCM
              </span>
            </div>
            <p className="text-[10px] text-[#8B93A7] leading-relaxed">
              Keys remain strictly in your browser IndexedDB. Zero intermediate servers.
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-[#8B93A7]">Active Keys:</span>
              <span className="font-mono text-white font-medium">{validKeysCount} / 2</span>
            </div>
          </div>
        </aside>

        {/* Dynamic Route Content */}
        <main className="flex-1 flex flex-col pb-20 md:pb-8 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};
