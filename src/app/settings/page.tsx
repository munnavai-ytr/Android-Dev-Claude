'use client';

import { AppShell } from '../../components/layout/AppShell';
import { SettingsView } from '../../features/settings/SettingsView';

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}
