/**
 * DroidForge GitHub API Client
 * 
 * 100% Client-Side Invariant:
 * - Direct browser-to-GitHub REST API communication over HTTPS.
 * - No intermediary server, proxy, or server-side logging.
 * - GitHub Personal Access Tokens (PATs) are never exposed.
 * - Actions Secrets encryption is performed in-browser using libsodium-wrappers sealed box.
 */

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
}

export interface BuilderStatusData {
  state: 'success' | 'failed' | 'pending';
  errors?: string[];
  appetizePublicKey?: string;
  apkUrl?: string;
  run?: string;
  sha?: string;
  timestamp?: number;
}

export interface GitPushResult {
  commitSha: string;
  treeSha: string;
  ref: string;
  htmlUrl: string;
}

class GitHubApiError extends Error {
  status: number;
  documentationUrl?: string;

  constructor(message: string, status: number, documentationUrl?: string) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.documentationUrl = documentationUrl;
  }
}

/**
 * Standard headers for GitHub REST API v3
 */
function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Parses GitHub API error responses with clear human-actionable messages
 */
async function handleResponseError(res: Response, contextAction: string): Promise<never> {
  let errBody: any = null;
  try {
    errBody = await res.json();
  } catch {
    // Non-JSON response
  }

  const rawMessage = errBody?.message || res.statusText || 'Unknown error';
  const remaining = res.headers.get('x-ratelimit-remaining');

  if (res.status === 401) {
    throw new GitHubApiError(
      'GitHub Token is invalid or has expired. Please verify your token in Key Vault or GitHub Connect.',
      401
    );
  }

  if (res.status === 403) {
    if (remaining === '0') {
      const resetTime = res.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'soon';
      throw new GitHubApiError(
        `GitHub API rate limit exceeded. Resets at ${resetDate}. Please wait or use an authenticated fine-grained PAT.`,
        403
      );
    }
    throw new GitHubApiError(
      `Permission denied (${contextAction}). Your token needs: Contents (RW), Actions (RW), and Secrets (RW). Error: ${rawMessage}`,
      403,
      errBody?.documentation_url
    );
  }

  if (res.status === 404) {
    throw new GitHubApiError(
      `Repository or resource not found (${contextAction}). Ensure the repository exists and your token has access.`,
      404
    );
  }

  if (res.status === 422) {
    throw new GitHubApiError(
      `GitHub validation failed (${contextAction}): ${rawMessage}. ${errBody?.errors ? JSON.stringify(errBody.errors) : ''}`,
      422
    );
  }

  throw new GitHubApiError(
    `GitHub API failed during ${contextAction} (${res.status}): ${rawMessage}`,
    res.status,
    errBody?.documentation_url
  );
}

/**
 * Validates a GitHub Personal Access Token and retrieves user details & token scopes
 */
export async function validateGitHubToken(token: string): Promise<{
  user: GitHubUser;
  scopes: string[];
  rateLimitRemaining: number;
}> {
  const res = await fetch('https://api.github.com/user', {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    await handleResponseError(res, 'validating Personal Access Token');
  }

  const user: GitHubUser = await res.json();
  const rawScopes = res.headers.get('x-oauth-scopes');
  const scopes = rawScopes ? rawScopes.split(',').map((s) => s.trim()) : ['fine-grained-pat'];
  const rateLimitStr = res.headers.get('x-ratelimit-remaining');
  const rateLimitRemaining = rateLimitStr ? parseInt(rateLimitStr, 10) : 5000;

  return { user, scopes, rateLimitRemaining };
}

/**
 * Lists user repositories (owned and collaborated)
 */
export async function listUserRepositories(token: string): Promise<GitHubRepo[]> {
  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator', {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    await handleResponseError(res, 'fetching repositories list');
  }

  return res.json();
}

/**
 * Creates a new GitHub repository for the user
 */
export async function createGitHubRepository(
  token: string,
  params: {
    name: string;
    isPrivate: boolean;
    description?: string;
  }
): Promise<GitHubRepo> {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: params.name.trim(),
      private: params.isPrivate,
      description: params.description || 'Native Android app built with Jetpack Compose & DroidForge',
      auto_init: true, // creates initial main branch commit so refs exist
    }),
  });

  if (!res.ok) {
    await handleResponseError(res, `creating repository "${params.name}"`);
  }

  return res.json();
}

/**
 * Encrypts a secret value for GitHub Actions using libsodium sealed box in browser
 */
export async function encryptSecretWithSodium(
  publicKeyBase64: string,
  secretValue: string
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Sodium encryption requires browser environment.');
  }

  const sodiumModule = await import('libsodium-wrappers');
  const sodium = (sodiumModule as any).default || sodiumModule;
  await sodium.ready;

  const binKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const binSecret = sodium.from_string(secretValue);
  const encBytes = sodium.crypto_box_seal(binSecret, binKey);
  return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
}

/**
 * Saves a repository secret (e.g. APPETIZE_TOKEN) to GitHub Actions Secrets
 */
export async function saveRepositorySecret(
  token: string,
  owner: string,
  repo: string,
  secretName: string,
  secretValue: string
): Promise<void> {
  // 1. Fetch Repo Public Key
  const keyRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`, {
    headers: getHeaders(token),
  });

  if (!keyRes.ok) {
    await handleResponseError(keyRes, 'fetching repository actions public key for secret encryption');
  }

  const { key_id, key: publicKeyBase64 } = await keyRes.json();

  // 2. Encrypt using in-browser libsodium sealed box
  const encryptedValue = await encryptSecretWithSodium(publicKeyBase64, secretValue);

  // 3. Put Secret
  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      encrypted_value: encryptedValue,
      key_id,
    }),
  });

  if (!putRes.ok && putRes.status !== 201 && putRes.status !== 204) {
    await handleResponseError(putRes, `saving repository secret "${secretName}"`);
  }
}

/**
 * Pushes the full project as ONE clean commit using the GitHub Git Data API.
 * Sequence: blobs -> tree -> commit -> update ref.
 */
export async function pushProjectToGitHub(
  token: string,
  owner: string,
  repo: string,
  files: Record<string, string>,
  commitMessage: string,
  targetBranch: string = 'main'
): Promise<GitPushResult> {
  const headers = getHeaders(token);

  // 1. Check current ref (head commit of target branch)
  let parentCommitSha: string | null = null;
  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`, {
    headers,
  });

  if (refRes.ok) {
    const refData = await refRes.json();
    parentCommitSha = refData.object.sha;
  } else if (refRes.status === 404) {
    // Check if repo has another default branch like 'master'
    const masterRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/master`, {
      headers,
    });
    if (masterRes.ok) {
      const masterData = await masterRes.json();
      parentCommitSha = masterData.object.sha;
    }
  }

  // 2. Upload blobs for each file
  const fileEntries = Object.entries(files);
  const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

  // Batch blob creation in chunks of 5 to avoid browser network throttle
  const CHUNK_SIZE = 5;
  for (let i = 0; i < fileEntries.length; i += CHUNK_SIZE) {
    const chunk = fileEntries.slice(i, i + CHUNK_SIZE);
    const chunkPromises = chunk.map(async ([path, content]) => {
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          encoding: 'utf-8',
        }),
      });

      if (!blobRes.ok) {
        await handleResponseError(blobRes, `creating Git blob for "${path}"`);
      }

      const blobData = await blobRes.json();
      return {
        path,
        mode: '100644', // normal file
        type: 'blob',
        sha: blobData.sha,
      };
    });

    const results = await Promise.all(chunkPromises);
    treeItems.push(...results);
  }

  // 3. Create Tree
  // Note: We deliberately omit base_tree so the tree represents the EXACT current project state,
  // ensuring files deleted in DroidForge are deleted in git as well.
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tree: treeItems,
    }),
  });

  if (!treeRes.ok) {
    await handleResponseError(treeRes, 'creating Git tree');
  }
  const treeData = await treeRes.json();
  const treeSha = treeData.sha;

  // 4. Create Commit
  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      tree: treeSha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    }),
  });

  if (!commitRes.ok) {
    await handleResponseError(commitRes, 'creating Git commit');
  }
  const commitData = await commitRes.json();
  const commitSha = commitData.sha;

  // 5. Update Ref
  let finalRef = `refs/heads/${targetBranch}`;
  if (parentCommitSha) {
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: commitSha,
        force: true,
      }),
    });

    if (!updateRefRes.ok) {
      await handleResponseError(updateRefRes, `updating ref heads/${targetBranch}`);
    }
  } else {
    // Initial ref creation
    const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${targetBranch}`,
        sha: commitSha,
      }),
    });

    if (!createRefRes.ok) {
      await handleResponseError(createRefRes, `creating ref heads/${targetBranch}`);
    }
  }

  return {
    commitSha,
    treeSha,
    ref: finalRef,
    htmlUrl: `https://github.com/${owner}/${repo}/commit/${commitSha}`,
  };
}

/**
 * Manually dispatches a workflow run (e.g. build.yml)
 */
export async function triggerWorkflowDispatch(
  token: string,
  owner: string,
  repo: string,
  workflowFileName: string = 'build.yml',
  ref: string = 'main'
): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/dispatches`,
    {
      method: 'POST',
      headers: {
        ...getHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref,
      }),
    }
  );

  if (!res.ok && res.status !== 204) {
    await handleResponseError(res, `triggering workflow dispatch "${workflowFileName}"`);
  }
}

/**
 * Fetches recent workflow runs for a repository branch
 */
export async function getRecentWorkflowRuns(
  token: string,
  owner: string,
  repo: string,
  branch: string = 'main',
  limit: number = 5
): Promise<GitHubWorkflowRun[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs?branch=${branch}&per_page=${limit}`,
    {
      headers: getHeaders(token),
    }
  );

  if (!res.ok) {
    if (res.status === 404) return [];
    await handleResponseError(res, 'fetching workflow runs');
  }

  const data = await res.json();
  return data.workflow_runs || [];
}

/**
 * Reads status.json committed to the builder-status branch via the GitHub Contents API.
 * This guarantees browser accessibility without CORS issues.
 */
export async function getBuilderStatus(
  token: string,
  owner: string,
  repo: string
): Promise<BuilderStatusData | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/status.json?ref=builder-status`,
      {
        headers: getHeaders(token),
        cache: 'no-store',
      }
    );

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data.content) return null;

    // Decode base64 content
    const decodedStr = atob(data.content.replace(/\n/g, ''));
    return JSON.parse(decodedStr);
  } catch (err) {
    console.warn('Failed to parse builder status from builder-status branch:', err);
    return null;
  }
}
