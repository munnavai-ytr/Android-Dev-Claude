'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, FolderGit2, KeyRound, Settings, Activity } from 'lucide-react';
import { useKeyStore } from '../../store/useKeyStore';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const keys = useKeyStore((state) => state.keys);
  const hasValidKey = keys.some((k) => k.status === 'valid');

  const navItems = [
    { label: 'Forge', href: '/', icon: Code2 },
    { label: 'Projects', href: '/projects', icon: FolderGit2 },
    {
      label: 'Keys',
      href: '/keys',
      icon: KeyRound,
      badge: !hasValidKey ? '!' : undefined,
    },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E1016]/95 backdrop-blur-lg border-t border-white/8 pb-safe md:hidden">
      <div className="grid grid-cols-4 h-16 items-center px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors relative ${
                isActive ? 'text-[#3DDC84]' : 'text-[#8B93A7] hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#FF5C6C] text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
