import { getProviderAdapter } from '../../lib/ai/provider';
import type { StoredApiKey, DroidProject } from '../../lib/db';
import { decryptApiKey } from '../../lib/crypto';
import type {
  AgentRunProgress,
  AgentStage,
  CoderOutput,
  FileOperation,
  PlanSpec,
  ReviewResult,
} from './agentTypes';
import { classifyWithPlanner } from './androidClassifier';
import {
  applyFileOperations,
  runStaticReview,
  validateOperationsSafety,
} from './safetyReview';
import {
  compactMemoryForPrompt,
  readProjectMemory,
  selectRelevantFiles,
  updateMemoryAfterChanges,
} from './projectMemory';

export interface AgentRunnerOptions {
  project: DroidProject;
  userPrompt: string;
  plannerKey: StoredApiKey;
  coderKey: StoredApiKey;
  plannerModel: string;
  coderModel: string;
  onProgress: (progress: AgentRunProgress) => void;
  abortSignal?: AbortSignal;
}

export function parseJsonFromAiResponse<T>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    // Basic repair for trailing commas
    const repaired = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    return JSON.parse(repaired) as T;
  }
}

export async function runAgentPipeline(options: AgentRunnerOptions): Promise<{
  updatedProject: DroidProject;
  appliedChanges: Array<{ path: string; action: FileOperation['action']; diffStat: string }>;
  reviewResult: ReviewResult;
  tokensUsed: number;
}> {
  const {
    project,
    userPrompt,
    plannerKey,
    coderKey,
    plannerModel,
    coderModel,
    onProgress,
    abortSignal,
  } = options;

  let totalTokens = 0;
  let streamedText = '';

  const progress: AgentRunProgress = {
    stage: 'understand',
    currentStepMessage: 'Analyzing intent and validating Android scope...',
    tokensUsed: 0,
    isStreaming: false,
    streamedText: '',
  };

  const notify = (stage: AgentStage, msg: string, extra?: Partial<AgentRunProgress>) => {
    progress.stage = stage;
    progress.currentStepMessage = msg;
    progress.tokensUsed = totalTokens;
    progress.streamedText = streamedText;
    if (extra) Object.assign(progress, extra);
    onProgress({ ...progress });
  };

  // Check abort
  if (abortSignal?.aborted) throw new Error('Agent run cancelled by user.');

  // ----------------------------------------------------
  // STAGE 1: UNDERSTAND & ANDROID-ONLY GUARD
  // ----------------------------------------------------
  notify('understand', 'Running Android-only classifier & scope guard...');

  const classification = await classifyWithPlanner(userPrompt, plannerKey, plannerModel);

  if (!classification.isAndroid) {
    const refusalMessage = `${classification.explanation}\n\n💡 Suggested Native Android Direction:\n${classification.suggestedAndroidIdea || 'Build a native Jetpack Compose app with Material 3 and local database.'}`;
    throw new Error(refusalMessage);
  }

  // Read project memory
  const memory = readProjectMemory(project.files, project.name, project.packageName);
  const memoryContext = compactMemoryForPrompt(memory);
  const relevantFiles = selectRelevantFiles(project.files, userPrompt);

  if (abortSignal?.aborted) throw new Error('Agent run cancelled by user.');

  // ----------------------------------------------------
  // STAGE 2: PLAN
  // ----------------------------------------------------
  notify('plan', 'Synthesizing architecture spec & file modification plan...');

  const plannerRawKey = await decryptApiKey(plannerKey.encryptedValue, plannerKey.iv);
  const plannerAdapter = getProviderAdapter(plannerKey.provider);

  const planPrompt = `User Request: "${userPrompt}"
Target App: ${project.name} (${project.packageName})
Architecture Target: Target SDK 35 (Android 15), Kotlin 2.0.21, Jetpack Compose BOM 2024.10.01

${memoryContext}

Relevant Existing Project Files:
${Object.entries(relevantFiles)
  .map(([p, c]) => `--- File: ${p} ---\n${c.slice(0, 800)}\n`)
  .join('\n')}

You are DroidForge's Senior Android Architect.
Create a detailed, production-grade JSON spec for this change.
Follow standard Android Clean Architecture with Compose + StateFlow/MVI.
Rules:
- Prefer patching existing files over rewriting them.
- Deletions are ONLY permitted if strictly necessary and listed in "filesToDelete".
- Every version must reside ONLY in libs.versions.toml.

Return pure JSON matching this exact schema:
{
  "summary": "Short 1-line summary of changes",
  "architecture": "Architecture notes",
  "screens": [
    { "name": "ScreenName", "route": "screen_route", "purpose": "Description", "components": ["List", "Card"] }
  ],
  "navigation": { "startDestination": "main", "routes": ["main"] },
  "dataModels": [
    { "name": "ModelName", "fields": ["id: String", "title: String"], "purpose": "Purpose" }
  ],
  "permissions": [],
  "dependencies": [],
  "filesToCreate": [{ "path": "path/to/File.kt", "purpose": "Purpose" }],
  "filesToChange": [{ "path": "path/to/Existing.kt", "changes": "Description of patch" }],
  "filesToDelete": []
}`;

  const planResult = await plannerAdapter.generate({
    apiKey: plannerRawKey,
    model: plannerModel || 'gemini-2.5-flash',
    prompt: planPrompt,
    temperature: 0.2,
    maxTokens: 3000,
    keyId: plannerKey.id,
  });

  totalTokens += planResult.totalTokens || 1000;
  const planSpec = parseJsonFromAiResponse<PlanSpec>(planResult.text);

  notify('plan', `Plan finalized: ${planSpec.summary}`, { planSpec });

  if (abortSignal?.aborted) throw new Error('Agent run cancelled by user.');

  // ----------------------------------------------------
  // STAGE 3: GENERATE (Structured File Operations)
  // ----------------------------------------------------
  notify('generate', 'Coder model generating structured Kotlin & Compose file operations...', {
    isStreaming: true,
  });

  const coderRawKey = await decryptApiKey(coderKey.encryptedValue, coderKey.iv);
  const coderAdapter = getProviderAdapter(coderKey.provider);

  const coderPrompt = `Plan Specification:
${JSON.stringify(planSpec, null, 2)}

Package Name: ${project.packageName}
Target SDK: 35 (Android 15) | Jetpack Compose BOM 2024.10.01 | Kotlin 2.0.21

Existing Files Context:
${Object.entries(relevantFiles)
  .map(([p, c]) => `--- File: ${p} ---\n${c}\n`)
  .join('\n')}

Generate the EXACT file operations to implement this plan.
You must return ONLY a structured JSON response matching this schema:
{
  "thoughtProcess": "Brief note on code generation",
  "operations": [
    {
      "path": "path/to/File.kt",
      "action": "create" | "replace" | "patch" | "delete",
      "content": "Full source code if action is create or replace",
      "search": "Exact substring to find if action is patch",
      "replace": "Replacement string if action is patch"
    }
  ]
}

CRITICAL RULES:
1. Pure Kotlin & Jetpack Compose only.
2. NO binary files. App icons must remain XML drawables.
3. For existing files, prefer action "patch" with exact search & replace blocks, or "replace" with complete valid code.
4. Do NOT output explanation outside JSON. Pure JSON output only.`;

  let coderRawText = '';

  await coderAdapter.streamGenerate({
    apiKey: coderRawKey,
    model: coderModel || 'gemini-2.5-flash',
    prompt: coderPrompt,
    temperature: 0.2,
    maxTokens: 8192,
    keyId: coderKey.id,
    signal: abortSignal,
    onChunk: (chunk) => {
      coderRawText += chunk;
      streamedText = coderRawText.slice(-300);
      notify('generate', 'Streaming structured Kotlin file operations...', {
        isStreaming: true,
        streamedText,
      });
    },
  });

  totalTokens += Math.ceil(coderRawText.length / 4);

  const coderOutput = parseJsonFromAiResponse<CoderOutput>(coderRawText);
  const operations = coderOutput.operations || [];

  if (operations.length === 0) {
    throw new Error('Coder model returned 0 file operations. Please refine your prompt.');
  }

  // Safety Verification Check
  const safetyCheck = validateOperationsSafety(operations, project.files, planSpec);
  if (!safetyCheck.safe) {
    throw new Error(safetyCheck.error || 'Security check failed on generated operations.');
  }

  // Apply operations
  const { newFiles, appliedChanges, errors } = applyFileOperations(operations, project.files);
  if (errors.length > 0) {
    console.warn('Patch warnings:', errors);
  }

  notify('generate', `Applied ${appliedChanges.length} file changes.`, {
    isStreaming: false,
    fileOperations: operations,
    appliedChanges,
  });

  if (abortSignal?.aborted) throw new Error('Agent run cancelled by user.');

  // ----------------------------------------------------
  // STAGE 4: REVIEW (Static Checks)
  // ----------------------------------------------------
  notify('review', 'Executing browser static heuristics & syntax checks...');

  const reviewResult = runStaticReview(newFiles);

  // Update .builder/memory.json
  const updatedMemory = updateMemoryAfterChanges(
    memory,
    newFiles,
    [`Implemented: ${planSpec.summary} (${new Date().toLocaleTimeString()})`]
  );
  newFiles['.builder/memory.json'] = JSON.stringify(updatedMemory, null, 2);

  const updatedProject: DroidProject = {
    ...project,
    files: newFiles,
    memory: {
      ...project.memory,
      notes: [...project.memory.notes, `Agent: ${planSpec.summary}`],
    },
    updatedAt: Date.now(),
  };

  notify('completed', 'Code changes verified and project memory updated.', {
    reviewResult,
    appliedChanges,
  });

  return {
    updatedProject,
    appliedChanges,
    reviewResult,
    tokensUsed: totalTokens,
  };
}
