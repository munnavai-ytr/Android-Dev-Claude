'use client';

import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all min-h-[36px]"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#8B93A7] border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-all min-h-[36px]"
        >
          <Share2 className="w-3.5 h-3.5 text-[#3DDC84]" />
          <span>Install PWA</span>
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-sm rounded-2xl bg-[#0E1016] border border-white/10 p-5 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/8">
                  <h3 className="text-sm font-semibold text-white">Install DroidForge on iOS</h3>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1 rounded-md text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-2.5 text-xs text-[#8B93A7]">
                  <p className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Tap the Safari <strong className="text-white">Share</strong> icon in the bottom toolbar.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Enjoy full offline support and instant native Android app generation!</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-white/10 text-xs font-medium text-white hover:bg-white/15 transition-colors"
                >
                  Got it
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
