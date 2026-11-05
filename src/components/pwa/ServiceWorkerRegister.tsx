'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegister: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Service worker registered
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    });
  }, []);

  return null;
};
