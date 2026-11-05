'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Key, ShieldCheck, Sparkles } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { useKeyStore } from '../../store/useKeyStore';

interface TopBarProps {
  onOpenKeys?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenKeys }) => {
  const pathname = usePathname();
  const keys = useKeyStore((state) => state.keys);
  const validKeysCount = keys.filter((k) => k.status === 'valid').length;

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-[#07080B]/85 backdrop-blur-md border-b border-white/8 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Zone 1: Single element brand wordmark */}
      <Link href="/" className="flex items-center gap-2 group whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3DDC84] to-[#22D3EE] flex items-center justify-center p-0.5 shadow-sm shadow-[#3DDC84]/20 group-hover:scale-105 transition-transform">
          <div className="w-full h-full bg-[#07080B] rounded-[10px] flex items-center justify-center">
            <span className="text-[#3DDC84] font-bold text-xs tracking-tighter">DF</span>
          </div>
        </div>
        <span className="font-heading text-base font-bold tracking-tight text-white flex items-center gap-1.5">
          DroidForge
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/6 text-[#3DDC84] font-normal border border-white/8">
            Compose
          </span>
        </span>
      </Link>

      {/* Zone 2: Navigation Links (Desktop) */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#8B93A7]">
        <Link
          href="/"
          className={`hover:text-white transition-colors whitespace-nowrap ${pathname === '/' ? 'text-white' : ''}`}
        >
          Forge
        </Link>
        <Link
          href="/projects"
          className={`hover:text-white transition-colors whitespace-nowrap ${pathname === '/projects' ? 'text-white' : ''}`}
        >
          Projects
        </Link>
        <Link
          href="/keys"
          className={`hover:text-white transition-colors whitespace-nowrap ${pathname === '/keys' ? 'text-white' : ''}`}
        >
          Key Vault
        </Link>
        <Link
          href="/settings"
          className={`hover:text-white transition-colors whitespace-nowrap ${pathname === '/settings' ? 'text-white' : ''}`}
        >
          Settings
        </Link>
      </nav>

      {/* Zone 3: Actions & Status */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Key Status Pill */}
        <Link
          href="/keys"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 border border-white/8 text-xs hover:bg-white/8 transition-colors min-h-[36px]"
          title="BYOK Key Status"
        >
          <Key className="w-3.5 h-3.5 text-[#3DDC84]" />
          <span className="text-white/80 font-mono text-[11px]">
            {validKeysCount > 0 ? `${validKeysCount} Key${validKeysCount > 1 ? 's' : ''} Ready` : 'Add Keys'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              validKeysCount > 0 ? 'bg-[#3DDC84]' : 'bg-[#F5B84B]'
            }`}
          />
        </Link>

        {/* PWA Install Button */}
        <PWAInstallButton />
      </div>
    </header>
  );
};
