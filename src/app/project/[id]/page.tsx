'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { WorkspaceLayout } from '../../../features/workspace/WorkspaceLayout';

export default function ProjectPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  return (
    <AppShell>
      <WorkspaceLayout projectId={id} />
    </AppShell>
  );
}
