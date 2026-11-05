import { getProviderAdapter } from '../../lib/ai/provider';
import type { StoredApiKey, DroidProject } from '../../lib/db';
import { decryptApiKey } from '../../lib/crypto';
import { parseJsonFromAiResponse } from './agentRunner';
import type { CoderOutput, FileOperation } from './agentTypes';
import { applyFileOperations, runStaticReview, validateOperationsSafety } from './safetyReview';
import { readProjectMemory, updateMemoryAfterChanges } from './projectMemory';

export interface AutoFixAttempt {
  attempt: number;
  maxAttempts: number;
  status: 'running' | 'success' | 'failed' | 'aborted';
  errors: string[];
  appliedOperations: FileOperation[];
  diffSummary: string;
  timestamp: number;
}

export interface AutoFixOptions {
  project: DroidProject;
  errors: string[];
  fixerKey: StoredApiKey;
  fixerModel: string;
  maxAttempts?: number;
  onAttemptStart?: (attempt: number, maxAttempts: number) => void;
  onAttemptProgress?: (attempt: number, message: string) => void;
  onAttemptComplete?: (attemptRecord: AutoFixAttempt) => void;
  onLoopFinished?: (success: boolean, attempts: AutoFixAttempt[]) => void;
  executePushAndPoll: (
    files: Record<string, string>,
    commitMsg: string
  ) => Promise<{ success: boolean; newErrors: string[] }>;
  abortSignal?: AbortSignal;
}

/**
 * Heuristically finds files in project that correspond to error messages
 */
function findAffectedFiles(errors: string[], projectFiles: Record<string, string>): Record<string, string> {
  const affected: Record<string, string> = {};
  const errorText = errors.join('\n');

  for (const [path, content] of Object.entries(projectFiles)) {
    // Check if filename or path appears in error output
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    if (errorText.includes(filename) || errorText.includes(path)) {
      affected[path] = content;
    }
  }

  // If no files matched, include critical gradle/manifest/screen files
  if (Object.keys(affected).length === 0) {
    for (const [path, content] of Object.entries(projectFiles)) {
      if (
        path.includes('build.gradle') ||
        path.includes('libs.versions.toml') ||
        path.includes('MainActivity.kt') ||
        path.includes('AndroidManifest.xml')
      ) {
        affected[path] = content;
      }
    }
  }

  return affected;
}

export async function runAutoFixLoop(options: AutoFixOptions): Promise<{
  success: boolean;
  history: AutoFixAttempt[];
  finalFiles: Record<string, string>;
}> {
  const {
    project,
    fixerKey,
    fixerModel,
    maxAttempts = 4,
    onAttemptStart,
    onAttemptProgress,
    onAttemptComplete,
    onLoopFinished,
    executePushAndPoll,
    abortSignal,
  } = options;

  let currentErrors = [...options.errors];
  let currentFiles = { ...project.files };
  const history: AutoFixAttempt[] = [];

  const decryptedKey = await decryptApiKey(fixerKey.encryptedValue, fixerKey.iv);
  const adapter = getProviderAdapter(fixerKey.provider);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (abortSignal?.aborted) {
      const abortRecord: AutoFixAttempt = {
        attempt,
        maxAttempts,
        status: 'aborted',
        errors: currentErrors,
        appliedOperations: [],
        diffSummary: 'Auto-fix stopped by user.',
        timestamp: Date.now(),
      };
      history.push(abortRecord);
      onLoopFinished?.(false, history);
      return { success: false, history, finalFiles: currentFiles };
    }

    onAttemptStart?.(attempt, maxAttempts);
    onAttemptProgress?.(attempt, `Analyzing ${currentErrors.length} compiler error(s)...`);

    const affectedFiles = findAffectedFiles(currentErrors, currentFiles);
    const memory = readProjectMemory(currentFiles, project.name, project.packageName);

    const prompt = `You are a Principal Android Compiler Engineer specializing in Kotlin 2.0+, Jetpack Compose (BOM 2024.10.01), Gradle Kotlin DSL, and AGP 8.7.2.
A CI build of this native Android app failed with the following Gradle / Kotlin errors:

=== BUILD FAILURE ERRORS ===
${currentErrors.join('\n')}

=== PROJECT MEMORY (.builder/memory.json) ===
${JSON.stringify(memory, null, 2)}

=== AFFECTED SOURCE FILES ===
${Object.entries(affectedFiles)
  .map(([path, code]) => `--- File: ${path} ---\n${code}\n`)
  .join('\n')}

Your mission:
Diagnose the exact syntax, missing import, version catalog reference, Compose BOM incompatibility, or missing dependency causing the build to fail.
Return ONLY a valid JSON object matching this schema:
{
  "summary": "Brief explanation of the root cause and fix",
  "operations": [
    {
      "path": "path/to/file",
      "action": "replace",
      "content": "Entire updated file content without markdown fences"
    }
  ]
}

STRICT INVARIANTS:
1. No binary files.
2. Must compile with Java 17 and AGP 8.7.2.
3. Every referenced Compose composable, import, or version alias must exist.
4. Return pure JSON only.`;

    onAttemptProgress?.(attempt, `Consulting Fixer model (${fixerModel})...`);

    let rawResponse = '';
    try {
      const resp = await adapter.generate({
        apiKey: decryptedKey,
        model: fixerModel,
        prompt,
        systemInstruction:
          'You are an expert Android build fixer. Output ONLY valid JSON containing file operations to resolve the compilation errors.',
      });
      rawResponse = resp.text;
    } catch (err: any) {
      if (abortSignal?.aborted) {
        return { success: false, history, finalFiles: currentFiles };
      }
      onAttemptProgress?.(attempt, `AI generation error: ${err.message}`);
      throw err;
    }

    if (abortSignal?.aborted) {
      return { success: false, history, finalFiles: currentFiles };
    }

    // Parse operations
    let coderOutput: CoderOutput;
    try {
      coderOutput = parseJsonFromAiResponse<CoderOutput>(rawResponse);
      if (!coderOutput.operations || !Array.isArray(coderOutput.operations)) {
        throw new Error('AI response did not contain an "operations" array.');
      }
    } catch (parseErr: any) {
      onAttemptProgress?.(attempt, `Failed to parse AI patch JSON: ${parseErr.message}`);
      continue;
    }

    // Validate operations against safety rules
    const safetyCheck = validateOperationsSafety(coderOutput.operations, currentFiles);
    if (!safetyCheck.safe) {
      onAttemptProgress?.(attempt, `Safety check failed: ${safetyCheck.error || 'Unknown violation'}`);
      continue;
    }

    // Apply file operations
    const { newFiles, appliedChanges, errors: applyErrors } = applyFileOperations(coderOutput.operations, currentFiles);
    if (applyErrors.length > 0) {
      onAttemptProgress?.(attempt, `Error applying patches: ${applyErrors.join(', ')}`);
      continue;
    }
    currentFiles = newFiles;

    // Static review heuristics
    const staticReview = runStaticReview(currentFiles);
    if (staticReview.warnings.length > 0) {
      console.warn('Auto-fix static review warnings:', staticReview.warnings);
    }

    // Update memory
    const updatedMemory = updateMemoryAfterChanges(memory, currentFiles, [
      `Auto-fix attempt #${attempt}: ${coderOutput.summary || 'Resolved build diagnostics'}`,
    ]);
    currentFiles['.builder/memory.json'] = JSON.stringify(updatedMemory, null, 2);

    onAttemptProgress?.(attempt, `Pushing fix to GitHub & awaiting CI verification...`);

    // Commit and trigger CI build
    const commitMsg = `fix(android): resolve build errors (attempt ${attempt}/${maxAttempts})`;
    const buildResult = await executePushAndPoll(currentFiles, commitMsg);

    const diffSummary = appliedChanges.map((c) => `${c.action} ${c.path}`).join(', ');
    const attemptRecord: AutoFixAttempt = {
      attempt,
      maxAttempts,
      status: buildResult.success ? 'success' : 'failed',
      errors: buildResult.success ? [] : buildResult.newErrors,
      appliedOperations: coderOutput.operations,
      diffSummary: `${coderOutput.summary || 'Applied patches'}: ${diffSummary}`,
      timestamp: Date.now(),
    };

    history.push(attemptRecord);
    onAttemptComplete?.(attemptRecord);

    if (buildResult.success) {
      onLoopFinished?.(true, history);
      return { success: true, history, finalFiles: currentFiles };
    }

    currentErrors = buildResult.newErrors;
  }

  onLoopFinished?.(false, history);
  return { success: false, history, finalFiles: currentFiles };
}
