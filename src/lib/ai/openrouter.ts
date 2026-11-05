import type { ModelMetadata } from '../db';
import {
  AIProviderError,
  type GenerateParams,
  type GenerateResult,
  type KeyTestResult,
  type KeyValidationResult,
  type StreamGenerateParams,
} from './types';
import { recordUsage } from './usage';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getOriginHeader(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://droidforge.app';
}

function parseRetryAfter(response: Response, errorBody?: string): number | undefined {
  const headerVal = response.headers.get('retry-after');
  if (headerVal) {
    const parsed = parseInt(headerVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (errorBody) {
    const match = errorBody.match(/retry in\s+([0-9.]+)\s*s/i) || errorBody.match(/reset in\s+([0-9.]+)\s*s/i);
    if (match && match[1]) {
      return Math.ceil(parseFloat(match[1]));
    }
  }
  return undefined;
}

export class OpenRouterAdapter {
  /**
   * Validate key via OpenRouter's official /auth/key and /models endpoints.
   */
  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return {
        valid: false,
        provider: 'openrouter',
        models: [],
        error: 'API key cannot be empty.',
      };
    }

    try {
      // 1. Check Key Info endpoint
      const keyInfoRes = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'HTTP-Referer': getOriginHeader(),
          'X-Title': 'DroidForge',
        },
      });

      if (!keyInfoRes.ok) {
        const text = await keyInfoRes.text();
        let errMsg = `OpenRouter returned HTTP ${keyInfoRes.status}`;
        try {
          const json = JSON.parse(text);
          if (json.error?.message) {
            errMsg = json.error.message;
          }
        } catch {
          // ignore
        }

        if (keyInfoRes.status === 401) {
          errMsg = 'Invalid OpenRouter API key. Check your key in the OpenRouter dashboard.';
        } else if (keyInfoRes.status === 402) {
          errMsg = 'OpenRouter credit balance depleted. Please add credits to your account.';
        } else if (keyInfoRes.status === 429) {
          errMsg = 'OpenRouter rate limit reached. Please retry in a few moments.';
        }

        return {
          valid: false,
          provider: 'openrouter',
          models: [],
          statusCode: keyInfoRes.status,
          error: errMsg,
        };
      }

      const keyInfoData = await keyInfoRes.json();
      const quota = keyInfoData.data || {};

      // 2. Fetch Models endpoint to list available models and pricing
      const modelsRes = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'HTTP-Referer': getOriginHeader(),
          'X-Title': 'DroidForge',
        },
      });

      let models: ModelMetadata[] = [];
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        const rawList: any[] = modelsData.data || [];

        models = rawList.map((m) => {
          const promptPrice = parseFloat(m.pricing?.prompt || '0');
          const completionPrice = parseFloat(m.pricing?.completion || '0');
          const isFree = m.id.endsWith(':free') || (promptPrice === 0 && completionPrice === 0);

          return {
            id: m.id,
            name: m.name || m.id,
            provider: 'openrouter' as const,
            contextLength: m.context_length || 128000,
            isFree,
            pricing: {
              prompt: m.pricing?.prompt,
              completion: m.pricing?.completion,
            },
            description: m.description || '',
          };
        });

        // Sort: Free models and popular coding/reasoning models first
        models.sort((a, b) => {
          if (a.isFree && !b.isFree) return -1;
          if (!a.isFree && b.isFree) return 1;
          return a.name.localeCompare(b.name);
        });
      }

      return {
        valid: true,
        provider: 'openrouter',
        models,
        quotaInfo: {
          label: quota.label || 'OpenRouter Key',
          usage: typeof quota.usage === 'number' ? quota.usage : undefined,
          limit: typeof quota.limit === 'number' ? quota.limit : undefined,
          isFreeTier: quota.is_free_tier,
          rateLimit: quota.rate_limit,
        },
      };
    } catch (err: any) {
      return {
        valid: false,
        provider: 'openrouter',
        models: [],
        error: err.message || 'Network error connecting directly to OpenRouter API.',
      };
    }
  }

  /**
   * Test key with 1-token fast generation to verify latency & permissions.
   */
  async testKey(apiKey: string, modelToTest?: string): Promise<KeyTestResult> {
    const cleanKey = apiKey.trim();
    // Default to free lightweight model or openrouter/auto
    const model = modelToTest || 'meta-llama/llama-3.2-3b-instruct:free';
    const startTime = performance.now();

    try {
      const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': getOriginHeader(),
          'X-Title': 'DroidForge',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const text = await res.text();
        const retryAfter = parseRetryAfter(res, text);

        let errorMsg = `HTTP ${res.status}: OpenRouter ping failed`;
        try {
          const json = JSON.parse(text);
          if (json.error?.message) {
            errorMsg = json.error.message;
          }
        } catch {
          // ignore
        }

        if (res.status === 401) {
          errorMsg = 'Authentication failed (401): Invalid OpenRouter API key.';
        } else if (res.status === 402) {
          errorMsg = 'Insufficient balance (402): Add credits on OpenRouter to use paid models.';
        } else if (res.status === 429) {
          errorMsg = retryAfter
            ? `Rate limit reached (429). Retry after ${retryAfter} seconds.`
            : 'OpenRouter rate limit reached. Please wait a moment.';
        }

        return {
          success: false,
          latencyMs,
          statusCode: res.status,
          error: errorMsg,
          retryAfterSeconds: retryAfter,
        };
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content?.trim() || 'OK';

      return {
        success: true,
        latencyMs,
        statusCode: 200,
        resultText: content,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        latencyMs,
        error: err.message || 'Network error pinging OpenRouter API.',
      };
    }
  }

  /**
   * Generation with exponential backoff on 429 and 5xx.
   */
  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { apiKey, model, prompt, systemInstruction, temperature = 0.7, maxTokens = 4096, keyId = 'openrouter' } = params;

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    const startTime = performance.now();
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': getOriginHeader(),
            'X-Title': 'DroidForge',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const latencyMs = Math.round(performance.now() - startTime);
          const data = await res.json();
          const choice = data.choices?.[0];
          const text = choice?.message?.content || '';

          const usage = data.usage || {};
          const promptTokens = usage.prompt_tokens || Math.ceil(prompt.length / 4);
          const completionTokens = usage.completion_tokens || Math.ceil(text.length / 4);
          const totalTokens = usage.total_tokens || (promptTokens + completionTokens);

          await recordUsage({
            keyId,
            provider: 'openrouter',
            model,
            promptTokens,
            completionTokens,
            totalTokens,
            latencyMs,
          });

          return {
            text,
            model,
            promptTokens,
            completionTokens,
            totalTokens,
            latencyMs,
          };
        }

        const rawErr = await res.text();
        const retryAfter = parseRetryAfter(res, rawErr);

        if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
          const waitTime = retryAfter ? retryAfter * 1000 : Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await delay(waitTime);
          continue;
        }

        throw new AIProviderError(`OpenRouter error ${res.status}: ${rawErr}`, {
          statusCode: res.status,
          retryAfterSeconds: retryAfter,
        });
      } catch (err: any) {
        if (err instanceof AIProviderError) throw err;
        if (attempt >= maxAttempts) {
          throw new AIProviderError(err.message || 'Network error communicating with OpenRouter API');
        }
        await delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new AIProviderError('Max retry attempts reached for OpenRouter API');
  }

  /**
   * Real-time SSE streaming for OpenRouter directly from browser.
   */
  async streamGenerate(params: StreamGenerateParams): Promise<void> {
    const { apiKey, model, prompt, systemInstruction, temperature = 0.7, maxTokens = 4096, keyId = 'openrouter', onChunk, onComplete, onError, signal } = params;

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    const startTime = performance.now();
    let accumulatedText = '';
    let promptTokens = Math.ceil(prompt.length / 4);
    let completionTokens = 0;

    try {
      const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': getOriginHeader(),
          'X-Title': 'DroidForge',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        const rawErr = await res.text();
        const retryAfter = parseRetryAfter(res, rawErr);
        throw new AIProviderError(`OpenRouter stream failed HTTP ${res.status}: ${rawErr}`, {
          statusCode: res.status,
          retryAfterSeconds: retryAfter,
        });
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response body has no readable stream.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedText += delta;
                onChunk(delta);
              }
              if (parsed.usage) {
                promptTokens = parsed.usage.prompt_tokens || promptTokens;
                completionTokens = parsed.usage.completion_tokens || completionTokens;
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      if (completionTokens === 0) {
        completionTokens = Math.ceil(accumulatedText.length / 4);
      }
      const totalTokens = promptTokens + completionTokens;

      await recordUsage({
        keyId,
        provider: 'openrouter',
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        latencyMs,
      });

      if (onComplete) {
        onComplete({
          text: accumulatedText,
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs,
        });
      }
    } catch (err: any) {
      if (onError) onError(err);
      else throw err;
    }
  }
}
