export type AgentStage = 'idle' | 'understand' | 'plan' | 'generate' | 'review' | 'completed' | 'error';

export interface PlanSpec {
  summary: string;
  architecture: string;
  screens: Array<{
    name: string;
    route: string;
    purpose: string;
    components: string[];
  }>;
  navigation: {
    startDestination: string;
    routes: string[];
  };
  dataModels: Array<{
    name: string;
    fields: string[];
    purpose: string;
  }>;
  permissions: string[];
  dependencies: string[];
  filesToCreate: Array<{ path: string; purpose: string }>;
  filesToChange: Array<{ path: string; changes: string }>;
  filesToDelete?: string[];
}

export type FileOperationAction = 'create' | 'replace' | 'patch' | 'delete';

export interface FileOperation {
  path: string;
  action: FileOperationAction;
  content?: string;
  search?: string;
  replace?: string;
}

export interface CoderOutput {
  thoughtProcess?: string;
  operations: FileOperation[];
}

export interface ReviewWarning {
  filePath?: string;
  severity: 'warning' | 'info' | 'error';
  message: string;
  rule: 'brace_balance' | 'missing_imports' | 'manifest_permissions' | 'screen_reference' | 'safety';
}

export interface ReviewResult {
  passed: boolean;
  warnings: ReviewWarning[];
  filesReviewedCount: number;
}

export interface AgentRunProgress {
  stage: AgentStage;
  currentStepMessage: string;
  planSpec?: PlanSpec;
  fileOperations?: FileOperation[];
  appliedChanges?: Array<{ path: string; action: FileOperationAction; diffStat: string }>;
  reviewResult?: ReviewResult;
  tokensUsed: number;
  isStreaming: boolean;
  streamedText: string;
  error?: string;
}

export interface ProjectMemoryJson {
  appName: string;
  packageName: string;
  architectureSummary: string;
  screens: Array<{ name: string; route?: string; purpose: string }>;
  dataModels: Array<{ name: string; purpose: string }>;
  dependencies: string[];
  permissions: string[];
  decisions: string[];
  fileIndex: Record<string, string>; // path -> 1-line purpose
  lastUpdated: number;
}
