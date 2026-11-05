'use client';

import { AppShell } from '../../components/layout/AppShell';
import { ProjectList } from '../../features/projects/ProjectList';

export default function ProjectsPage() {
  return (
    <AppShell>
      <ProjectList />
    </AppShell>
  );
}
