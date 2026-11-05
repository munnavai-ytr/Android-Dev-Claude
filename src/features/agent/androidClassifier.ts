import { getProviderAdapter } from '../../lib/ai/provider';
import type { StoredApiKey } from '../../lib/db';
import { decryptApiKey } from '../../lib/crypto';

export interface AndroidClassificationResult {
  isAndroid: boolean;
  explanation: string;
  suggestedAndroidIdea?: string;
  suggestedName?: string;
  inferredMvpFeatures?: string[];
}

const NON_ANDROID_KEYWORDS = [
  'website',
  'web app',
  'html',
  'css',
  'wordpress',
  'nextjs',
  'next.js',
  'react website',
  'chrome extension',
  'ios only',
  'swiftui only',
  'electron app',
  'desktop app',
  'windows app',
  'macos app',
  'unity game',
  'unreal engine',
  'backend api only',
  'server only',
];

/**
 * Fast client-side heuristics in case no AI key is provided or offline.
 */
export function heuristicClassifier(prompt: string): AndroidClassificationResult {
  const lower = prompt.toLowerCase();

  for (const kw of NON_ANDROID_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        isAndroid: false,
        explanation: `DroidForge is dedicated exclusively to crafting 100% native Android applications in Kotlin + Jetpack Compose. It does not generate websites, desktop software, or iOS-only projects.`,
        suggestedAndroidIdea: `We can build an Android mobile companion app for this idea featuring modern Jetpack Compose UI, Material 3 theming, offline Room caching, and Glance home screen widgets.`,
        suggestedName: 'DroidCompanion',
        inferredMvpFeatures: [
          'Material 3 Jetpack Compose UI',
          'Offline Room Database caching',
          'Edge-to-Edge Android 15 layout',
          'Glance App Widget support',
        ],
      };
    }
  }

  // Any other prompt, even vague, is accepted and converted to an Android MVP
  const cleanName = prompt.trim().split(/\s+/).slice(0, 3).join(' ') || 'Android App';
  return {
    isAndroid: true,
    explanation: 'Valid native Android app specification.',
    suggestedAndroidIdea: prompt,
    suggestedName: cleanName.replace(/[^a-zA-Z0-9 ]/g, ''),
    inferredMvpFeatures: [
      'Jetpack Compose Material 3 screens',
      'Unidirectional Data Flow (MVI/MVVM)',
      'Navigation Compose graph',
    ],
  };
}

/**
 * AI-powered classifier using the configured Planner model.
 */
export async function classifyWithPlanner(
  prompt: string,
  plannerKey: StoredApiKey,
  modelName: string
): Promise<AndroidClassificationResult> {
  try {
    const rawKey = await decryptApiKey(plannerKey.encryptedValue, plannerKey.iv);
    const adapter = getProviderAdapter(plannerKey.provider);

    const systemInstruction = `You are DroidForge's strict Native Android Classifier.
DroidForge creates ONLY 100% native Android apps (Kotlin, Jetpack Compose, Material 3, Gradle Kotlin DSL).
It NEVER creates websites, React/HTML web apps, iOS-only Swift apps, desktop Electron apps, or Unity game engines.

Analyze the user's idea:
1. If the user explicitly asks for a website, React app, iOS-only, desktop app, or non-Android platform:
   - "isAndroid": false
   - "explanation": Politely explain that DroidForge builds native Android apps only.
   - "suggestedAndroidIdea": Propose how to transform their idea into an exceptional native Android application (e.g. mobile sensor tracking, Android widgets, Jetpack Compose UI).
   - "suggestedName": Short CamelCase Android app name.
2. If the user asks for an Android app, or any mobile concept (e.g., habit tracker, notes, chat, crypto wallet, fitness, music, or even vague ideas like "shopping app" or "to-do"):
   - "isAndroid": true
   - "explanation": "Valid native Android concept."
   - "suggestedAndroidIdea": Detailed MVP specification for Kotlin + Jetpack Compose.
   - "suggestedName": Short CamelCase Android app name.
   - "inferredMvpFeatures": 3-5 key native Android features.

Respond in pure JSON only:
{
  "isAndroid": boolean,
  "explanation": "string",
  "suggestedAndroidIdea": "string",
  "suggestedName": "string",
  "inferredMvpFeatures": ["string", "string"]
}`;

    const res = await adapter.generate({
      apiKey: rawKey,
      model: modelName || 'gemini-2.5-flash',
      prompt: `Analyze this user project idea: "${prompt}"`,
      systemInstruction,
      temperature: 0.2,
      maxTokens: 1024,
      keyId: plannerKey.id,
    });

    const cleaned = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      isAndroid: Boolean(parsed.isAndroid),
      explanation: parsed.explanation || 'Processed by DroidForge Planner.',
      suggestedAndroidIdea: parsed.suggestedAndroidIdea || prompt,
      suggestedName: parsed.suggestedName || 'DroidApp',
      inferredMvpFeatures: Array.isArray(parsed.inferredMvpFeatures) ? parsed.inferredMvpFeatures : [],
    };
  } catch (err) {
    console.warn('AI Classifier fallback to heuristics:', err);
    return heuristicClassifier(prompt);
  }
}
