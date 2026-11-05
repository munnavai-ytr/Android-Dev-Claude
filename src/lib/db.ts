import Dexie, { type Table } from 'dexie';

export interface StoredApiKey {
  id: string; // e.g., 'gemini_primary' or 'openrouter_primary'
  provider: 'gemini' | 'openrouter';
  label: string;
  encryptedValue: string; // Base64 AES-GCM ciphertext
  iv: string; // Base64 96-bit IV
  maskedValue: string; // e.g., sk-••••4f2a
  status: 'valid' | 'invalid' | 'untested';
  modelsCount: number;
  modelsList: ModelMetadata[];
  quotaInfo?: {
    label?: string;
    usage?: number; // USD for OpenRouter
    limit?: number; // USD limit if applicable
    isFreeTier?: boolean;
    rateLimit?: { requests: number; interval: string };
  };
  testLatencyMs?: number;
  lastTestedAt?: number;
  lastValidatedAt?: number;
  lastError?: string;
}

export interface ModelMetadata {
  id: string; // e.g. "gemini-2.5-flash" or "anthropic/claude-3.5-sonnet"
  name: string;
  provider: 'gemini' | 'openrouter';
  contextLength?: number;
  isFree?: boolean;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  description?: string;
}

export interface UsageRecord {
  id: string;
  keyId: string;
  provider: 'gemini' | 'openrouter';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  timestamp: number;
  dateStr: string; // "YYYY-MM-DD"
  monthStr: string; // "YYYY-MM"
  estimatedCost: number; // USD
}



export interface AppSettingRecord {
  id: string;
  onboardingCompleted: boolean;
  plannerModel: string;
  coderModel: string;
  fixerModel: string;
  accentTheme: 'android' | 'violet' | 'amber' | 'cyan';
  updatedAt: number;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  name: string;
  timestamp: number;
  filesSummary: string;
  files: Record<string, string>;
}

export interface ChatMessageRecord {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  stage?: 'understand' | 'plan' | 'generate' | 'review' | 'idle';
  planSpec?: any;
  fileChanges?: Array<{ path: string; action: 'create' | 'replace' | 'patch' | 'delete'; diffStat: string }>;
  warnings?: string[];
  tokensUsed?: number;
  timestamp: number;
}

export interface ProjectGithubConfig {
  repoOwner: string;
  repoName: string;
  repoFullName: string;
  repoUrl: string;
  isPrivate: boolean;
  defaultBranch: string;
  lastPushedSha?: string;
  lastPushedAt?: number;
  appetizeConfigured?: boolean;
  appetizePublicKey?: string;
}

export interface StoredGithubCredential {
  id: string; // 'current'
  username: string;
  avatarUrl: string;
  name?: string;
  encryptedToken: string;
  iv: string;
  maskedToken: string;
  scopes?: string[];
  rateLimitRemaining?: number;
  lastValidatedAt: number;
}

export interface StoredBuildRun {
  id: string; // `${projectId}_${runId}`
  projectId: string;
  runId: number;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: string;
  commitSha: string;
  commitMessage: string;
  errors?: string[];
  appetizePublicKey?: string;
  apkUrl?: string;
  htmlUrl: string;
  durationSeconds?: number;
  timestamp: number;
}

export interface DroidProject {
  id: string;
  name: string;
  packageName: string;
  idea: string;
  createdAt: number;
  updatedAt: number;
  files: Record<string, string>; // filepath -> content
  memory: {
    architecture: string; // e.g. "MVI + Clean Architecture + Compose"
    composeBom: string;
    minSdk: number;
    targetSdk: number;
    notes: string[];
  };
  settings: {
    targetSdk: number;
    minSdk: number;
    composeVersion: string;
  };
  githubConfig?: ProjectGithubConfig;
}

export class DroidForgeDatabase extends Dexie {
  apiKeys!: Table<StoredApiKey, string>;
  usageRecords!: Table<UsageRecord, string>;
  projects!: Table<DroidProject, string>;
  appSettings!: Table<AppSettingRecord, string>;
  snapshots!: Table<ProjectSnapshot, string>;
  chatMessages!: Table<ChatMessageRecord, string>;
  githubCredentials!: Table<StoredGithubCredential, string>;
  buildRuns!: Table<StoredBuildRun, string>;

  constructor() {
    super('DroidForgeDB');

    this.version(1).stores({
      apiKeys: 'id, provider, status, lastValidatedAt',
      usageRecords: 'id, keyId, provider, model, timestamp, dateStr, monthStr',
      projects: 'id, name, createdAt, updatedAt',
      appSettings: 'id',
    });

    this.version(2).stores({
      apiKeys: 'id, provider, status, lastValidatedAt',
      usageRecords: 'id, keyId, provider, model, timestamp, dateStr, monthStr',
      projects: 'id, name, createdAt, updatedAt',
      appSettings: 'id',
      snapshots: 'id, projectId, timestamp',
      chatMessages: 'id, projectId, timestamp',
    });

    this.version(3).stores({
      apiKeys: 'id, provider, status, lastValidatedAt',
      usageRecords: 'id, keyId, provider, model, timestamp, dateStr, monthStr',
      projects: 'id, name, createdAt, updatedAt',
      appSettings: 'id',
      snapshots: 'id, projectId, timestamp',
      chatMessages: 'id, projectId, timestamp',
      githubCredentials: 'id, username, lastValidatedAt',
      buildRuns: 'id, projectId, runId, status, timestamp',
    });
  }
}

// Lazy safe instance for client-side execution
let dbInstance: DroidForgeDatabase | null = null;

export function getDb(): DroidForgeDatabase {
  if (typeof window === 'undefined') {
    throw new Error('Dexie IndexedDB cannot be accessed during SSR.');
  }
  if (!dbInstance) {
    dbInstance = new DroidForgeDatabase();
  }
  return dbInstance;
}
