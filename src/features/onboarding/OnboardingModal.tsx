'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, KeyRound, Code2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export const OnboardingModal: React.FC = () => {
  const router = useRouter();
  const onboardingCompleted = useSettingsStore((state) => state.onboardingCompleted);
  const setOnboardingCompleted = useSettingsStore((state) => state.setOnboardingCompleted);
  const isLoading = useSettingsStore((state) => state.isLoading);

  const [currentSlide, setCurrentSlide] = useState(0);

  if (isLoading || onboardingCompleted) {
    return null;
  }

  const slides = [
    {
      icon: Smartphone,
      accentColor: 'from-[#3DDC84] to-[#22D3EE]',
      tag: '01. Native First',
      title: 'Craft 100% Native Android Apps',
      description:
        'DroidForge focuses strictly on native Android development. Generate modern Kotlin code, Jetpack Compose declarative UI, Material 3 theming, and Android Studio-ready Gradle Kotlin DSL projects.',
      bulletPoints: [
        'Pure Kotlin & Jetpack Compose BOM 2024.10',
        'Material 3 Dynamic Color & Edge-to-Edge layouts',
        'Ready for Android Studio export & Gradle builds',
      ],
    },
    {
      icon: ShieldCheck,
      accentColor: 'from-[#22D3EE] to-[#8B5CF6]',
      tag: '02. True BYOK Privacy',
      title: 'Bring Your Own AI Keys (Zero Backend)',
      description:
        'Your API keys never touch our servers because there are no servers. All requests to Google Gemini and OpenRouter are made directly from your browser over HTTPS.',
      bulletPoints: [
        'Keys encrypted with non-extractable WebCrypto AES-GCM',
        'Stored exclusively in local IndexedDB (Dexie)',
        'Masked display and per-key usage tracking',
      ],
    },
    {
      icon: Code2,
      accentColor: 'from-[#8B5CF6] to-[#3DDC84]',
      tag: '03. Architecture & Roles',
      title: 'Planner, Coder & Fixer Engine',
      description:
        'Assign distinct AI models to specialized roles. Use Google Gemini 2.5 Flash for high-speed coding and OpenRouter reasoning models for architectural planning.',
      bulletPoints: [
        'Real-time latency ping testing on every key',
        'Model picker with free vs paid tier badges',
        'Offline-capable PWA with local data export/import',
      ],
    },
  ];

  const handleNext = async () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      await setOnboardingCompleted(true);
      router.push('/keys');
    }
  };

  const handleSkip = async () => {
    await setOnboardingCompleted(true);
  };

  const current = slides[currentSlide];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-[28px] bg-[#0E1016] border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3DDC84]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Step Indicator & Skip */}
        <div className="flex items-center justify-between pb-6 border-b border-white/8">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? 'w-6 bg-gradient-to-r from-[#3DDC84] to-[#22D3EE]'
                    : idx < currentSlide
                    ? 'w-2 bg-white/40'
                    : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-xs text-[#8B93A7] hover:text-white transition-colors"
          >
            Skip Intro
          </button>
        </div>

        {/* Slide Content */}
        <div className="py-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-5">
            <Icon className="w-6 h-6 text-[#3DDC84]" />
          </div>

          <span className="text-[11px] font-mono font-medium tracking-wide text-[#3DDC84] uppercase">
            {current.tag}
          </span>

          <h2 className="mt-1 font-heading text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            {current.title}
          </h2>

          <p className="mt-3 text-xs sm:text-sm text-[#8B93A7] leading-relaxed">
            {current.description}
          </p>

          <div className="mt-5 space-y-2.5">
            {current.bulletPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-[#3DDC84] shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/8 flex items-center justify-between gap-3">
          {currentSlide > 0 ? (
            <button
              onClick={() => setCurrentSlide((prev) => prev - 1)}
              className="px-4 py-2.5 text-xs font-medium text-[#8B93A7] hover:text-white rounded-xl hover:bg-white/5 transition-colors min-h-[44px]"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] rounded-xl hover:opacity-90 active:scale-[0.98] transition-all min-h-[44px] shadow-lg shadow-[#3DDC84]/20"
          >
            <span>{currentSlide === slides.length - 1 ? 'Go to Key Vault' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
