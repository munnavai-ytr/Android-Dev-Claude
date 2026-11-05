import { create } from 'zustand';
import { getDb, type StoredGithubCredential, type ProjectGithubConfig, type StoredBuildRun } from '../lib/db';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../lib/crypto';
import {
  validateGitHubToken,
  listUserRepositories,
  createGitHubRepository,
  saveRepositorySecret,
  pushProjectToGitHub,
  triggerWorkflowDispatch,
  getRecentWorkflowRuns,
  getBuilderStatus,
  type GitHubUser,
  type GitHubRepo,
  type GitHubWorkflowRun,
  type BuilderStatusData,
  type GitPushResult,
} from '../lib/github/githubClient';

interface GithubState {
  credential: StoredGithubCredential | null;
  isLoaded: boolean;
  isConnecting: boolean;
  isLoadingRepos: boolean;
  userRepos: GitHubRepo[];
  error: string | null;

  // Active build status & polling
  activeWorkflowRun: GitHubWorkflowRun | null;
  latestBuilderStatus: BuilderStatusData | null;
  isPollingBuild: boolean;
  isPushing: boolean;

  // Actions
  loadCredential: () => Promise<StoredGithubCredential | null>;
  connectToken: (token: string) => Promise<StoredGithubCredential>;
  disconnect: () => Promise<void>;
  fetchUserRepos: () => Promise<GitHubRepo[]>;
  createRepoForProject: (params: {
    projectId: string;
    repoName: string;
    isPrivate: boolean;
    description?: string;
  }) => Promise<GitHubRepo>;
  saveAppetizeToken: (owner: string, repo: string, appetizeToken: string) => Promise<void>;
  pushCurrentProject: (
    owner: string,
    repo: string,
    files: Record<string, string>,
    message: string
  ) => Promise<GitPushResult>;
  triggerBuild: (owner: string, repo: string) => Promise<void>;
  pollBuildRun: (owner: string, repo: string, onUpdate?: (run: GitHubWorkflowRun | null, status: BuilderStatusData | null) => void) => () => void;
  getRawDecryptedToken: () => Promise<string | null>;
}

export const useGithubStore = create<GithubState>((set, get) => ({
  credential: null,
  isLoaded: false,
  isConnecting: false,
  isLoadingRepos: false,
  userRepos: [],
  error: null,

  activeWorkflowRun: null,
  latestBuilderStatus: null,
  isPollingBuild: false,
  isPushing: false,

  loadCredential: async () => {
    if (typeof window === 'undefined') return null;
    try {
      const db = getDb();
      const cred = await db.githubCredentials.get('current');
      if (cred) {
        set({ credential: cred, isLoaded: true, error: null });
        return cred;
      }
      set({ credential: null, isLoaded: true });
      return null;
    } catch (err: any) {
      console.error('Failed to load GitHub credentials:', err);
      set({ isLoaded: true, error: err.message });
      return null;
    }
  },

  connectToken: async (token: string) => {
    set({ isConnecting: true, error: null });
    try {
      const trimmed = token.trim();
      const { user, scopes, rateLimitRemaining } = await validateGitHubToken(trimmed);

      // Encrypt token client-side using non-extractable WebCrypto AES-GCM
      const { ciphertext, iv } = await encryptApiKey(trimmed);
      const masked = maskApiKey(trimmed);

      const cred: StoredGithubCredential = {
        id: 'current',
        username: user.login,
        avatarUrl: user.avatar_url,
        name: user.name || undefined,
        encryptedToken: ciphertext,
        iv,
        maskedToken: masked,
        scopes,
        rateLimitRemaining,
        lastValidatedAt: Date.now(),
      };

      const db = getDb();
      await db.githubCredentials.put(cred);

      set({ credential: cred, isConnecting: false });

      // Pre-fetch repos
      get().fetchUserRepos().catch(console.warn);

      return cred;
    } catch (err: any) {
      set({ isConnecting: false, error: err.message });
      throw err;
    }
  },

  disconnect: async () => {
    try {
      const db = getDb();
      await db.githubCredentials.delete('current');
      set({ credential: null, userRepos: [], error: null });
    } catch (err: any) {
      console.error('Failed to disconnect GitHub:', err);
    }
  },

  fetchUserRepos: async () => {
    const rawToken = await get().getRawDecryptedToken();
    if (!rawToken) {
      throw new Error('No GitHub token connected.');
    }

    set({ isLoadingRepos: true });
    try {
      const repos = await listUserRepositories(rawToken);
      set({ userRepos: repos, isLoadingRepos: false });
      return repos;
    } catch (err: any) {
      set({ isLoadingRepos: false, error: err.message });
      throw err;
    }
  },

  createRepoForProject: async ({ projectId, repoName, isPrivate, description }) => {
    const rawToken = await get().getRawDecryptedToken();
    if (!rawToken) {
      throw new Error('No GitHub token connected.');
    }

    const repo = await createGitHubRepository(rawToken, {
      name: repoName,
      isPrivate,
      description,
    });

    // Refresh repos list
    get().fetchUserRepos().catch(console.warn);
    return repo;
  },

  saveAppetizeToken: async (owner: string, repo: string, appetizeToken: string) => {
    const rawToken = await get().getRawDecryptedToken();
    if (!rawToken) {
      throw new Error('No GitHub token connected.');
    }

    await saveRepositorySecret(rawToken, owner, repo, 'APPETIZE_TOKEN', appetizeToken.trim());
  },

  pushCurrentProject: async (owner: string, repo: string, files: Record<string, string>, message: string) => {
    const rawToken = await get().getRawDecryptedToken();
    if (!rawToken) {
      throw new Error('No GitHub token connected.');
    }

    set({ isPushing: true, error: null });
    try {
      const result = await pushProjectToGitHub(rawToken, owner, repo, files, message, 'main');
      set({ isPushing: false });
      return result;
    } catch (err: any) {
      set({ isPushing: false, error: err.message });
      throw err;
    }
  },

  triggerBuild: async (owner: string, repo: string) => {
    const rawToken = await get().getRawDecryptedToken();
    if (!rawToken) {
      throw new Error('No GitHub token connected.');
    }

    await triggerWorkflowDispatch(rawToken, owner, repo, 'build.yml', 'main');
  },

  pollBuildRun: (owner: string, repo: string, onUpdate?: (run: GitHubWorkflowRun | null, status: BuilderStatusData | null) => void) => {
    let isCancelled = false;
    let pollInterval: any = null;

    set({ isPollingBuild: true });

    const check = async () => {
      if (isCancelled) return;
      try {
        const rawToken = await get().getRawDecryptedToken();
        if (!rawToken) return;

        // Fetch recent workflow runs
        const runs = await getRecentWorkflowRuns(rawToken, owner, repo, 'main', 3);
        const latestRun = runs[0] || null;

        // Fetch builder status branch
        const builderStatus = await getBuilderStatus(rawToken, owner, repo);

        if (!isCancelled) {
          set({
            activeWorkflowRun: latestRun,
            latestBuilderStatus: builderStatus,
          });

          if (onUpdate) {
            onUpdate(latestRun, builderStatus);
          }

          // If run is completed, stop aggressive polling
          if (latestRun && (latestRun.status === 'completed' || builderStatus?.state === 'success' || builderStatus?.state === 'failed')) {
            // Keep checking once every 10s or stop
            if (builderStatus) {
              set({ isPollingBuild: false });
              clearInterval(pollInterval);
            }
          }
        }
      } catch (err) {
        console.warn('Error polling build status:', err);
      }
    };

    // Initial check immediately
    check();
    // Poll every 3 seconds while build is running
    pollInterval = setInterval(check, 3500);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      set({ isPollingBuild: false });
    };
  },

  getRawDecryptedToken: async () => {
    const cred = get().credential || (await get().loadCredential());
    if (!cred) return null;
    try {
      return await decryptApiKey(cred.encryptedToken, cred.iv);
    } catch (err) {
      console.error('Failed to decrypt GitHub token:', err);
      return null;
    }
  },
}));
