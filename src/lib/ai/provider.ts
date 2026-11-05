import { GeminiAdapter } from './gemini';
import { OpenRouterAdapter } from './openrouter';
import type {
  GenerateParams,
  GenerateResult,
  KeyTestResult,
  KeyValidationResult,
  StreamGenerateParams,
} from './types';
import type { ModelMetadata } from '../db';

export interface AIProvider {
  validateKey(apiKey: string): Promise<KeyValidationResult>;
  testKey(apiKey: string, modelToTest?: string): Promise<KeyTestResult>;
  generate(params: GenerateParams): Promise<GenerateResult>;
  streamGenerate(params: StreamGenerateParams): Promise<void>;
}

const geminiAdapter = new GeminiAdapter();
const openRouterAdapter = new OpenRouterAdapter();

export function getProviderAdapter(provider: 'gemini' | 'openrouter'): AIProvider {
  if (provider === 'gemini') {
    return geminiAdapter;
  }
  if (provider === 'openrouter') {
    return openRouterAdapter;
  }
  throw new Error(`Unsupported AI provider: ${provider}`);
}

export { GeminiAdapter, OpenRouterAdapter };
export * from './types';
export * from './usage';
