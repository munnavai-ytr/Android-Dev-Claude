'use client';

import { AppShell } from '../components/layout/AppShell';
import { HeroPromptSection } from '../features/home/HeroPromptSection';

export default function HomePage() {
  return (
    <AppShell>
      <HeroPromptSection />
    </AppShell>
  );
}
