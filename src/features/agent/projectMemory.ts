import type { ProjectMemoryJson } from './agentTypes';

export function readProjectMemory(files: Record<string, string>, appName: string, packageName: string): ProjectMemoryJson {
  const raw = files['.builder/memory.json'];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      // ignore
    }
  }

  // Construct initial memory from files if not yet existing
  const screens: ProjectMemoryJson['screens'] = [];
  const fileIndex: Record<string, string> = {};

  for (const path of Object.keys(files)) {
    if (path.includes('Screen.kt')) {
      const name = path.split('/').pop()?.replace('.kt', '') || 'Screen';
      screens.push({ name, route: name.toLowerCase(), purpose: `Compose UI screen for ${name}` });
    }
    fileIndex[path] = getHeuristicFilePurpose(path);
  }

  return {
    appName,
    packageName,
    architectureSummary: 'Clean Architecture + MVI + Jetpack Compose (BOM 2024.10.01)',
    screens,
    dataModels: [],
    dependencies: [
      'androidx.compose.material3:material3',
      'androidx.navigation:navigation-compose:2.8.4',
    ],
    permissions: [],
    decisions: [
      'Initialized with standard Kotlin Multiplatform & Android Compose conventions.',
      'Configured for Android 15 (Target SDK 35) with Edge-to-Edge display.',
    ],
    fileIndex,
    lastUpdated: Date.now(),
  };
}

export function getHeuristicFilePurpose(path: string): string {
  if (path.endsWith('libs.versions.toml')) return 'Centralized Gradle version catalog';
  if (path.endsWith('build.gradle.kts')) return 'Build script & dependencies configuration';
  if (path.endsWith('settings.gradle.kts')) return 'Plugin repositories and project inclusion';
  if (path.endsWith('AndroidManifest.xml')) return 'Application components, permissions & launcher setup';
  if (path.endsWith('MainActivity.kt')) return 'Main activity host with edge-to-edge Compose root';
  if (path.endsWith('Theme.kt')) return 'Material 3 Dark/Light themes';
  if (path.endsWith('Color.kt')) return 'Brand & semantic color tokens';
  if (path.endsWith('Type.kt')) return 'Typography scales';
  if (path.includes('Screen.kt')) return 'Jetpack Compose UI screen';
  if (path.includes('ViewModel.kt')) return 'ViewModel with StateFlow state container';
  return 'Project source file';
}

/**
 * Compacts memory into a lightweight text block for AI prompts.
 */
export function compactMemoryForPrompt(memory: ProjectMemoryJson): string {
  return `### Project Memory (.builder/memory.json)
App Name: ${memory.appName} (${memory.packageName})
Architecture: ${memory.architectureSummary}
Screens: ${memory.screens.map((s) => `${s.name} (${s.route || s.name})`).join(', ') || 'MainScreen'}
Data Models: ${memory.dataModels.map((m) => m.name).join(', ') || 'None'}
Permissions: ${memory.permissions.join(', ') || 'None'}
Decisions:
${memory.decisions.slice(-4).map((d) => `- ${d}`).join('\n')}
File Index:
${Object.entries(memory.fileIndex).map(([p, pur]) => `- ${p}: ${pur}`).join('\n')}`;
}

/**
 * Heuristically selects only files relevant to the user's prompt to fit within context and avoid breaking unrelated code.
 */
export function selectRelevantFiles(
  files: Record<string, string>,
  prompt: string,
  maxFiles = 6
): Record<string, string> {
  const relevant: Record<string, string> = {};
  const lowerPrompt = prompt.toLowerCase();

  // Always include MainActivity, version catalog, and memory
  for (const [path, content] of Object.entries(files)) {
    if (path === '.builder/memory.json') continue; // passed separately

    if (path.endsWith('MainActivity.kt')) {
      relevant[path] = content;
      continue;
    }

    if (lowerPrompt.includes('dependency') || lowerPrompt.includes('gradle') || lowerPrompt.includes('library')) {
      if (path.endsWith('libs.versions.toml') || path.endsWith('build.gradle.kts')) {
        relevant[path] = content;
      }
    }

    if (lowerPrompt.includes('permission') || lowerPrompt.includes('manifest') || lowerPrompt.includes('camera') || lowerPrompt.includes('location')) {
      if (path.endsWith('AndroidManifest.xml')) {
        relevant[path] = content;
      }
    }

    if (lowerPrompt.includes('theme') || lowerPrompt.includes('color') || lowerPrompt.includes('dark') || lowerPrompt.includes('light')) {
      if (path.includes('/theme/')) {
        relevant[path] = content;
      }
    }

    // Match screen or feature keywords in filename
    const filename = path.split('/').pop()?.toLowerCase() || '';
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
    if (nameWithoutExt.length > 3 && lowerPrompt.includes(nameWithoutExt)) {
      relevant[path] = content;
    }
  }

  // If few files matched, include main screens and theme for context
  if (Object.keys(relevant).length < 2) {
    for (const [path, content] of Object.entries(files)) {
      if (Object.keys(relevant).length >= maxFiles) break;
      if (path.endsWith('MainScreen.kt') || path.endsWith('HomeScreen.kt') || path.endsWith('Theme.kt')) {
        relevant[path] = content;
      }
    }
  }

  return relevant;
}

/**
 * Updates memory after file changes are applied.
 */
export function updateMemoryAfterChanges(
  currentMemory: ProjectMemoryJson,
  allFiles: Record<string, string>,
  newDecisions?: string[]
): ProjectMemoryJson {
  const screens: ProjectMemoryJson['screens'] = [];
  const fileIndex: Record<string, string> = {};

  for (const path of Object.keys(allFiles)) {
    if (path.endsWith('.kt') && path.includes('Screen')) {
      const screenName = path.split('/').pop()?.replace('.kt', '') || 'Screen';
      screens.push({
        name: screenName,
        route: screenName.toLowerCase(),
        purpose: `Screen for ${screenName}`,
      });
    }
    fileIndex[path] = currentMemory.fileIndex[path] || getHeuristicFilePurpose(path);
  }

  const updatedDecisions = newDecisions
    ? [...currentMemory.decisions, ...newDecisions]
    : currentMemory.decisions;

  return {
    ...currentMemory,
    screens,
    fileIndex,
    decisions: updatedDecisions.slice(-10),
    lastUpdated: Date.now(),
  };
}
