import type { ModelMetadata } from '../db';

export interface KeyValidationResult {
  valid: boolean;
  provider: 'gemini' | 'openrouter';
  models: ModelMetadata[];
  error?: string;
  statusCode?: number;
  quotaInfo?: {
    label?: string;
    usage?: number;
    limit?: number;
    isFreeTier?: boolean;
    rateLimit?: { requests: number; interval: string };
  };
}

export interface KeyTestResult {
  success: boolean;
  latencyMs: number;
  resultText?: string;
  statusCode?: number;
  error?: string;
  retryAfterSeconds?: number;
  headers?: Record<string, string>;
}

export interface GenerateParams {
  apiKey: string;
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  keyId?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface StreamGenerateParams extends GenerateParams {
  onChunk: (chunk: string) => void;
  onComplete?: (result: GenerateResult) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export class AIProviderError extends Error {
  statusCode?: number;
  isRateLimit: boolean;
  isAuthError: boolean;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      isRateLimit?: boolean;
      isAuthError?: boolean;
      retryAfterSeconds?: number;
    }
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.statusCode = options?.statusCode;
    this.isRateLimit = options?.isRateLimit ?? options?.statusCode === 429;
    this.isAuthError = options?.isAuthError ?? (options?.statusCode === 401 || options?.statusCode === 403);
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}
