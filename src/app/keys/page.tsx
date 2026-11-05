'use client';

import { AppShell } from '../../components/layout/AppShell';
import { KeyVault } from '../../features/keys/KeyVault';

export default function KeysPage() {
  return (
    <AppShell>
      <KeyVault />
    </AppShell>
  );
}
