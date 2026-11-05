import type {
  FileOperation,
  PlanSpec,
  ReviewResult,
  ReviewWarning,
} from './agentTypes';

const BANNED_EXTENSIONS = ['.jar', '.so', '.png', '.jpg', '.jpeg', '.apk', '.aab', '.zip', '.dex', '.class'];
const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/,
  /sk-or-v1-[0-9a-f]{64}/,
  /sk-[0-9a-zA-Z]{32,}/,
  /ghp_[0-9a-zA-Z]{36}/,
  /password\s*=\s*["'][^"']{4,}["']/i,
  /secret_key\s*=\s*["'][^"']{4,}["']/i,
];

/**
 * Validates a batch of file operations before applying them.
 */
export function validateOperationsSafety(
  operations: FileOperation[],
  existingFiles: Record<string, string>,
  plan?: PlanSpec
): { safe: boolean; error?: string } {
  const allowedDeletions = new Set(plan?.filesToDelete || []);

  for (const op of operations) {
    const p = op.path.trim().replace(/\\/g, '/');

    // 1. Path safety: No escaping, no absolute paths
    if (p.startsWith('/') || p.startsWith('../') || p.includes('/../') || p.includes(':')) {
      return {
        safe: false,
        error: `Safety violation: Operation attempted path outside project root: "${op.path}"`,
      };
    }

    // 2. No binary files
    const lower = p.toLowerCase();
    for (const ext of BANNED_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        return {
          safe: false,
          error: `Safety violation: Binary files like "${ext}" are strictly forbidden. Android icons must be XML drawables.`,
        };
      }
    }

    // 3. Deletion rule: Must be explicitly listed in plan
    if (op.action === 'delete') {
      if (!allowedDeletions.has(p)) {
        return {
          safe: false,
          error: `Safety violation: File "${p}" cannot be deleted because it was not approved in the Plan stage.`,
        };
      }
    }

    // 4. Content secret inspection
    const content = op.content || op.replace || '';
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        return {
          safe: false,
          error: `Safety violation: Hardcoded API secret detected in file "${p}". Keys must use local vault or BuildConfig.`,
        };
      }
    }
  }

  return { safe: true };
}

/**
 * Applies a list of file operations to project files in memory.
 */
export function applyFileOperations(
  operations: FileOperation[],
  currentFiles: Record<string, string>
): {
  newFiles: Record<string, string>;
  appliedChanges: Array<{ path: string; action: FileOperation['action']; diffStat: string }>;
  errors: string[];
} {
  const files = { ...currentFiles };
  const appliedChanges: Array<{ path: string; action: FileOperation['action']; diffStat: string }> = [];
  const errors: string[] = [];

  for (const op of operations) {
    const cleanPath = op.path.trim().replace(/\\/g, '/');

    if (op.action === 'delete') {
      delete files[cleanPath];
      appliedChanges.push({ path: cleanPath, action: 'delete', diffStat: '-removed' });
      continue;
    }

    if (op.action === 'create' || op.action === 'replace') {
      const content = op.content || '';
      const lineCount = content.split('\n').length;
      files[cleanPath] = content;
      appliedChanges.push({
        path: cleanPath,
        action: op.action,
        diffStat: op.action === 'create' ? `+${lineCount} lines` : `~${lineCount} lines`,
      });
      continue;
    }

    if (op.action === 'patch') {
      const existing = files[cleanPath];
      if (!existing) {
        // If file doesn't exist, create it with replace content
        files[cleanPath] = op.replace || op.content || '';
        appliedChanges.push({ path: cleanPath, action: 'create', diffStat: '+created' });
        continue;
      }

      if (op.search && op.replace !== undefined) {
        if (existing.includes(op.search)) {
          files[cleanPath] = existing.replace(op.search, op.replace);
          appliedChanges.push({ path: cleanPath, action: 'patch', diffStat: '~patched' });
        } else {
          // Normalize whitespace search attempt
          const normExisting = existing.replace(/\r\n/g, '\n');
          const normSearch = op.search.replace(/\r\n/g, '\n');
          if (normExisting.includes(normSearch)) {
            files[cleanPath] = normExisting.replace(normSearch, op.replace.replace(/\r\n/g, '\n'));
            appliedChanges.push({ path: cleanPath, action: 'patch', diffStat: '~patched' });
          } else if (op.content) {
            // Safe fallback to full content if provided
            files[cleanPath] = op.content;
            appliedChanges.push({ path: cleanPath, action: 'replace', diffStat: '~replaced' });
          } else {
            errors.push(`Could not find patch target block in "${cleanPath}".`);
          }
        }
      } else if (op.content) {
        files[cleanPath] = op.content;
        appliedChanges.push({ path: cleanPath, action: 'replace', diffStat: '~replaced' });
      }
    }
  }

  return { newFiles: files, appliedChanges, errors };
}

/**
 * Static checks in browser:
 * 1. Balanced braces in Kotlin files
 * 2. Missing imports heuristics
 * 3. Manifest permissions vs usage
 * 4. Referenced screens existence
 */
export function runStaticReview(files: Record<string, string>): ReviewResult {
  const warnings: ReviewWarning[] = [];
  let filesCount = 0;

  const manifestContent = files['app/src/main/AndroidManifest.xml'] || '';
  const declaredPermissions = new Set<string>();

  const permMatches = manifestContent.matchAll(/android:name=["']android\.permission\.([A-Z_]+)["']/g);
  for (const m of permMatches) {
    declaredPermissions.add(m[1]);
  }

  // Find all Kotlin files
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith('.kt')) continue;
    filesCount++;

    // 1. Balanced braces & parentheses
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      warnings.push({
        filePath: path,
        severity: 'warning',
        message: `Mismatched braces in ${path}: ${openBraces} open vs ${closeBraces} close.`,
        rule: 'brace_balance',
      });
    }

    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      warnings.push({
        filePath: path,
        severity: 'warning',
        message: `Mismatched parentheses in ${path}: ${openParens} open vs ${closeParens} close.`,
        rule: 'brace_balance',
      });
    }

    // 2. Missing imports heuristics
    const commonImports: Array<{ keyword: RegExp; importPattern: string; label: string }> = [
      { keyword: /\bScaffold\b/, importPattern: 'androidx.compose.material3.Scaffold', label: 'Scaffold' },
      { keyword: /\bCard\b/, importPattern: 'androidx.compose.material3.Card', label: 'Card' },
      { keyword: /\bModifier\./, importPattern: 'androidx.compose.ui.Modifier', label: 'Modifier' },
      { keyword: /\bremember\s*\{/, importPattern: 'androidx.compose.runtime.remember', label: 'remember' },
      { keyword: /\bviewModel\s*\(/, importPattern: 'androidx.lifecycle.viewmodel.compose.viewModel', label: 'viewModel' },
    ];

    for (const check of commonImports) {
      if (check.keyword.test(content) && !content.includes(check.importPattern) && !content.includes('androidx.compose.material3.*')) {
        warnings.push({
          filePath: path,
          severity: 'info',
          message: `Heuristic: "${check.label}" used in ${path} without explicit import. Ensure package is imported.`,
          rule: 'missing_imports',
        });
      }
    }

    // 3. Permission usage checks
    if (content.includes('Camera') || content.includes('camera2')) {
      if (!declaredPermissions.has('CAMERA')) {
        warnings.push({
          filePath: path,
          severity: 'warning',
          message: `Camera APIs detected in ${path}, but android.permission.CAMERA is missing from AndroidManifest.xml.`,
          rule: 'manifest_permissions',
        });
      }
    }

    if (content.includes('FusedLocationProviderClient') || content.includes('LocationManager')) {
      if (!declaredPermissions.has('ACCESS_FINE_LOCATION') && !declaredPermissions.has('ACCESS_COARSE_LOCATION')) {
        warnings.push({
          filePath: path,
          severity: 'warning',
          message: `Location APIs used in ${path}, but ACCESS_FINE_LOCATION permission is missing from AndroidManifest.xml.`,
          rule: 'manifest_permissions',
        });
      }
    }

    if (content.includes('BiometricPrompt') || content.includes('BiometricManager')) {
      if (!declaredPermissions.has('USE_BIOMETRIC')) {
        warnings.push({
          filePath: path,
          severity: 'warning',
          message: `Biometric APIs used in ${path}, but USE_BIOMETRIC permission is missing from AndroidManifest.xml.`,
          rule: 'manifest_permissions',
        });
      }
    }
  }

  // 4. Verify referenced screens in MainActivity.kt
  const mainActivity = Object.entries(files).find(([k]) => k.endsWith('MainActivity.kt'))?.[1];
  if (mainActivity) {
    const screenRefs = mainActivity.matchAll(/\b([A-Z][a-zA-Z0-9]+Screen)\b/g);
    for (const ref of screenRefs) {
      const screenName = ref[1];
      const screenExists = Object.keys(files).some((k) => k.endsWith(`${screenName}.kt`));
      if (!screenExists && screenName !== 'HomeScreen' && screenName !== 'MainScreen') {
        warnings.push({
          severity: 'warning',
          message: `MainActivity references "${screenName}", but no corresponding "${screenName}.kt" was found in project files.`,
          rule: 'screen_reference',
        });
      }
    }
  }

  return {
    passed: warnings.filter((w) => w.severity === 'error').length === 0,
    warnings,
    filesReviewedCount: filesCount,
  };
}
