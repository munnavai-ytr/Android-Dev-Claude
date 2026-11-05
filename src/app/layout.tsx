import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#07080B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'DroidForge - Native Android AI Builder',
  description: 'Mobile-first PWA AI builder that crafts native Android apps (Kotlin + Jetpack Compose) with BYOK client-side key vault, model limits, and project management.',
  applicationName: 'DroidForge',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DroidForge',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'DroidForge - Native Android AI Builder',
    description: 'Craft native Android apps (Kotlin + Jetpack Compose) with your own AI keys. 100% client-side privacy.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DroidForge - Native Android AI Builder',
    description: 'Craft native Android apps (Kotlin + Jetpack Compose) with your own AI keys. 100% client-side privacy.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} dark`}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#07080B] text-[#F2F4F8] antialiased selection:bg-[#3DDC84]/20 selection:text-[#3DDC84]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
