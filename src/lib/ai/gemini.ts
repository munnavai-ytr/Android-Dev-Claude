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

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Helper to delay with exponential backoff
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfter(response: Response, errorBody?: string): number | undefined {
  const headerVal = response.headers.get('retry-after');
  if (headerVal) {
    const parsed = parseInt(headerVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (errorBody) {
    const match = errorBody.match(/retry in\s+([0-9.]+)\s*s/i) || errorBody.match(/quota reset in\s+([0-9.]+)\s*s/i);
    if (match && match[1]) {
      return Math.ceil(parseFloat(match[1]));
    }
  }
  return undefined;
}

export class GeminiAdapter {
  /**
   * Validate key by fetching real models and ensuring generateContent is supported.
   */
  async validateKey(apiKey: string): Promise<KeyValidationResult> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return {
        valid: false,
        provider: 'gemini',
        models: [],
        error: 'API key cannot be empty.',
      };
    }

    try {
      const res = await fetch(`${GEMINI_BASE_URL}/models?key=${cleanKey}&pageSize=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Google Gemini API returned HTTP ${res.status}`;
        try {
          const json = JSON.parse(text);
          if (json.error?.message) {
            errMsg = json.error.message;
          }
        } catch {
          // keep fallback
        }

        if (res.status === 400 || res.status === 401) {
          errMsg = 'Invalid Google Gemini API key. Please check your key from Google AI Studio.';
        } else if (res.status === 403) {
          errMsg = 'Permission denied or quota/region restriction for this Gemini API key.';
        } else if (res.status === 429) {
          errMsg = 'Gemini API rate limit reached. Please wait and try again.';
        }

        return {
          valid: false,
          provider: 'gemini',
          models: [],
          statusCode: res.status,
          error: errMsg,
        };
      }

      const data = await res.json();
      const rawModels: any[] = data.models || [];

      // Filter only models that support generateContent
      const models: ModelMetadata[] = rawModels
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => {
          const cleanId = m.name.replace(/^models\//, '');
          return {
            id: cleanId,
            name: m.displayName || cleanId,
            provider: 'gemini' as const,
            contextLength: m.inputTokenLimit || 1048576,
            isFree: true, // Included in Gemini BYOK standard tier
            description: m.description || '',
          };
        })
        .sort((a, b) => {
          // Sort flash & pro to the top
          if (a.id.includes('flash') && !b.id.includes('flash')) return -1;
          if (!a.id.includes('flash') && b.id.includes('flash')) return 1;
          return a.name.localeCompare(b.name);
        });

      return {
        valid: true,
        provider: 'gemini',
        models,
        quotaInfo: {
          label: 'Google AI Studio BYOK',
          isFreeTier: true,
        },
      };
    } catch (err: any) {
      return {
        valid: false,
        provider: 'gemini',
        models: [],
        error: err.message || 'Network error connecting directly to Google Gemini API.',
      };
    }
  }

  /**
   * Test key with a 1-token fast generation to verify latency & permissions.
   */
  async testKey(apiKey: string, modelToTest?: string): Promise<KeyTestResult> {
    const cleanKey = apiKey.trim();
    const model = modelToTest || 'gemini-2.5-flash';
    const targetModel = model.startsWith('models/') ? model.replace(/^models\//, '') : model;

    const startTime = performance.now();

    try {
      const res = await fetch(`${GEMINI_BASE_URL}/models/${targetModel}:generateContent?key=${cleanKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'ping' }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1,
            temperature: 0.1,
          },
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const text = await res.text();
        const retryAfter = parseRetryAfter(res, text);

        let errorMsg = `HTTP ${res.status}: Failed to ping Gemini`;
        try {
          const json = JSON.parse(text);
          if (json.error?.message) {
            errorMsg = json.error.message;
          }
        } catch {
          // use fallback
        }

        if (res.status === 401 || res.status === 400) {
          errorMsg = 'Authentication failed. Please verify your Gemini API key.';
        } else if (res.status === 429) {
          errorMsg = retryAfter
            ? `Rate limit hit (429). Retry after ${retryAfter} seconds.`
            : 'Gemini rate limit exceeded. Please back off for a moment.';
        } else if (res.status === 403) {
          errorMsg = 'Forbidden (403): Key lacks permissions or is blocked in your location.';
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
      const generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';

      return {
        success: true,
        latencyMs,
        statusCode: 200,
        resultText: generatedText,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        latencyMs,
        error: err.message || 'Network connection failed while pinging Gemini API.',
      };
    }
  }

  /**
   * Robust generation with exponential backoff on 429 and 5xx.
   */
  async generate(params: GenerateParams): Promise<GenerateResult> {
    const { apiKey, model, prompt, systemInstruction, temperature = 0.7, maxTokens = 4096, keyId = 'gemini' } = params;
    const cleanId = model.replace(/^models\//, '');
    const url = `${GEMINI_BASE_URL}/models/${cleanId}:generateContent?key=${apiKey.trim()}`;

    const contents: any[] = [];
    if (prompt) {
      contents.push({ role: 'user', parts: [{ text: prompt }] });
    }

    const payload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const startTime = performance.now();
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const latencyMs = Math.round(performance.now() - startTime);
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text || '';

          const usage = data.usageMetadata || {};
          const promptTokens = usage.promptTokenCount || Math.ceil(prompt.length / 4);
          const completionTokens = usage.candidatesTokenCount || Math.ceil(text.length / 4);
          const totalTokens = usage.totalTokenCount || (promptTokens + completionTokens);

          // Record usage to IndexedDB
          await recordUsage({
            keyId,
            provider: 'gemini',
            model: cleanId,
            promptTokens,
            completionTokens,
            totalTokens,
            latencyMs,
          });

          return {
            text,
            model: cleanId,
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

        throw new AIProviderError(`Gemini error ${res.status}: ${rawErr}`, {
          statusCode: res.status,
          retryAfterSeconds: retryAfter,
        });
      } catch (err: any) {
        if (err instanceof AIProviderError) throw err;
        if (attempt >= maxAttempts) {
          throw new AIProviderError(err.message || 'Network error communicating with Gemini API');
        }
        await delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new AIProviderError('Max retry attempts reached for Gemini API');
  }

  /**
   * Real-time SSE streaming generation directly from browser.
   */
  async streamGenerate(params: StreamGenerateParams): Promise<void> {
    const { apiKey, model, prompt, systemInstruction, temperature = 0.7, maxTokens = 4096, keyId = 'gemini', onChunk, onComplete, onError, signal } = params;
    const cleanId = model.replace(/^models\//, '');
    const url = `${GEMINI_BASE_URL}/models/${cleanId}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`;

    const payload: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const startTime = performance.now();
    let accumulatedText = '';
    let promptTokens = Math.ceil(prompt.length / 4);
    let completionTokens = 0;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        const rawErr = await res.text();
        const retryAfter = parseRetryAfter(res, rawErr);
        throw new AIProviderError(`Gemini stream failed HTTP ${res.status}: ${rawErr}`, {
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
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunkText) {
                accumulatedText += chunkText;
                onChunk(chunkText);
              }
              if (parsed.usageMetadata) {
                promptTokens = parsed.usageMetadata.promptTokenCount || promptTokens;
                completionTokens = parsed.usageMetadata.candidatesTokenCount || completionTokens;
              }
            } catch {
              // Ignore partial JSON chunk
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
        provider: 'gemini',
        model: cleanId,
        promptTokens,
        completionTokens,
        totalTokens,
        latencyMs,
      });

      if (onComplete) {
        onComplete({
          text: accumulatedText,
          model: cleanId,
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
