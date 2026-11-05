'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { ProjectDetailView } from '../../../features/projects/ProjectDetailView';

export default function ProjectPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  return (
    <AppShell>
      <ProjectDetailView projectId={id} />
    </AppShell>
  );
}
