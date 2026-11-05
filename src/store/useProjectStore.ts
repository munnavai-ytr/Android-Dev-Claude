import { create } from 'zustand';
import { getDb, type DroidProject, type ProjectSnapshot, type ProjectGithubConfig } from '../lib/db';
import { generateAndroidTemplate, sanitizePackageName } from '../lib/template';

interface ProjectStoreState {
  projects: DroidProject[];
  activeProject: DroidProject | null;
  snapshots: ProjectSnapshot[];
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (params: {
    name: string;
    idea: string;
    packageName?: string;
    architecture?: string;
  }) => Promise<DroidProject>;
  renameProject: (id: string, newName: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string) => Promise<DroidProject | null>;
  updateProjectIdea: (id: string, idea: string) => Promise<void>;
  updateProjectGithubConfig: (id: string, config: ProjectGithubConfig | undefined) => Promise<void>;
  updateProjectFiles: (
    id: string,
    files: Record<string, string>,
    notes?: string[],
    snapshotMessage?: string
  ) => Promise<void>;
  updateFileContent: (id: string, filePath: string, content: string) => Promise<void>;
  deleteProjectFile: (id: string, filePath: string) => Promise<void>;
  createSnapshot: (id: string, message: string) => Promise<ProjectSnapshot | null>;
  loadSnapshots: (projectId: string) => Promise<ProjectSnapshot[]>;
  restoreSnapshot: (projectId: string, snapshotId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  activeProject: null,
  snapshots: [],
  isLoading: true,
  error: null,

  loadProjects: async () => {
    if (typeof window === 'undefined') return;
    try {
      set({ isLoading: true, error: null });
      const db = getDb();
      const allProjects = await db.projects.orderBy('updatedAt').reverse().toArray();
      set({ projects: allProjects, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load projects from Dexie:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  createProject: async ({ name, idea, packageName, architecture }) => {
    const db = getDb();
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pkg = packageName ? packageName.trim() : sanitizePackageName(name);

    // Generate comprehensive native Android template
    const initialFiles = generateAndroidTemplate({
      name: name.trim(),
      packageName: pkg,
      idea: idea.trim(),
      architecture: architecture || 'Clean Architecture + MVI + Jetpack Compose',
    });

    const newProject: DroidProject = {
      id,
      name: name.trim(),
      packageName: pkg,
      idea: idea.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: initialFiles,
      memory: {
        architecture: architecture || 'Clean Architecture + MVI + Jetpack Compose',
        composeBom: '2024.10.01',
        minSdk: 26,
        targetSdk: 35,
        notes: [
          'Initialized with standard Kotlin & Jetpack Compose conventions.',
          'Configured for Android 15 (Target SDK 35) with Edge-to-Edge display.',
          'Version catalog libs.versions.toml configured with AGP 8.7.2 and Kotlin 2.0.21.',
        ],
      },
      settings: {
        targetSdk: 35,
        minSdk: 26,
        composeVersion: 'BOM 2024.10.01',
      },
    };

    await db.projects.add(newProject);

    // Create initial snapshot
    const snapshot: ProjectSnapshot = {
      id: `snap_${Date.now()}`,
      projectId: id,
      name: 'Initial Project Template',
      timestamp: Date.now(),
      filesSummary: `${Object.keys(initialFiles).length} files created`,
      files: { ...initialFiles },
    };
    await db.snapshots.add(snapshot);

    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({ projects: all, activeProject: newProject, snapshots: [snapshot] });
    return newProject;
  },

  renameProject: async (id: string, newName: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const updated: DroidProject = {
      ...existing,
      name: newName.trim(),
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  deleteProject: async (id: string) => {
    const db = getDb();
    await db.projects.delete(id);
    // Delete associated snapshots and messages
    await db.snapshots.where('projectId').equals(id).delete();
    await db.chatMessages.where('projectId').equals(id).delete();

    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? null : get().activeProject,
      snapshots: [],
    });
  },

  selectProject: async (id: string) => {
    const db = getDb();
    const proj = await db.projects.get(id);
    if (proj) {
      const snaps = await db.snapshots.where('projectId').equals(id).reverse().sortBy('timestamp');
      set({ activeProject: proj, snapshots: snaps });
      return proj;
    }
    return null;
  },

  updateProjectIdea: async (id: string, idea: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const updated: DroidProject = {
      ...existing,
      idea,
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  updateProjectGithubConfig: async (id: string, config: ProjectGithubConfig | undefined) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const updated: DroidProject = {
      ...existing,
      githubConfig: config,
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  updateProjectFiles: async (id: string, files: Record<string, string>, notes?: string[], snapshotMessage?: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const mergedFiles = { ...existing.files, ...files };

    const updated: DroidProject = {
      ...existing,
      files: mergedFiles,
      memory: {
        ...existing.memory,
        notes: notes ? [...existing.memory.notes, ...notes] : existing.memory.notes,
      },
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);

    if (snapshotMessage) {
      const snapshot: ProjectSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        projectId: id,
        name: snapshotMessage,
        timestamp: Date.now(),
        filesSummary: `${Object.keys(files).length} files modified`,
        files: { ...mergedFiles },
      };
      await db.snapshots.add(snapshot);
      const snaps = await db.snapshots.where('projectId').equals(id).reverse().sortBy('timestamp');
      set({ snapshots: snaps });
    }

    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  updateFileContent: async (id: string, filePath: string, content: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const updatedFiles = { ...existing.files, [filePath]: content };
    const updated: DroidProject = {
      ...existing,
      files: updatedFiles,
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    set({
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  deleteProjectFile: async (id: string, filePath: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const newFiles = { ...existing.files };
    delete newFiles[filePath];

    const updated: DroidProject = {
      ...existing,
      files: newFiles,
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    set({
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  createSnapshot: async (id: string, message: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return null;

    const snapshot: ProjectSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      projectId: id,
      name: message,
      timestamp: Date.now(),
      filesSummary: `${Object.keys(existing.files).length} files`,
      files: { ...existing.files },
    };

    await db.snapshots.add(snapshot);
    const snaps = await db.snapshots.where('projectId').equals(id).reverse().sortBy('timestamp');
    set({ snapshots: snaps });
    return snapshot;
  },

  loadSnapshots: async (projectId: string) => {
    const db = getDb();
    const snaps = await db.snapshots.where('projectId').equals(projectId).reverse().sortBy('timestamp');
    set({ snapshots: snaps });
    return snaps;
  },

  restoreSnapshot: async (projectId: string, snapshotId: string) => {
    const db = getDb();
    const snapshot = await db.snapshots.get(snapshotId);
    if (!snapshot) return;

    const existing = await db.projects.get(projectId);
    if (!existing) return;

    const updated: DroidProject = {
      ...existing,
      files: { ...snapshot.files },
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: updated,
    });
  },
}));
