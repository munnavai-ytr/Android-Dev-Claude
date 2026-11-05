import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'DroidForge - Native Android AI Builder',
    short_name: 'DroidForge',
    description: 'Mobile-first PWA AI builder that crafts native Android apps (Kotlin + Jetpack Compose) with BYOK client-side key vault.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07080B',
    theme_color: '#07080B',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
