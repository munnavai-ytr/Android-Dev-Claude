'use client';

import React, { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5B84B]/20 border border-[#F5B84B]/40 text-[#F5B84B] text-xs font-medium backdrop-blur-md shadow-lg shadow-black/40"
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Offline Mode — Cached data active</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
