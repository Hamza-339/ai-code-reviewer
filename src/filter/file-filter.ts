export interface ReviewCandidate {
  path: string;
  patch?: string;
}

const LOCKFILE_NAMES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function isLockfile(path: string): boolean {
  const name = basename(path);
  return LOCKFILE_NAMES.has(name) || name.endsWith('.lock');
}

const GENERATED_DIR_SEGMENTS = new Set(['dist', 'build', 'vendor', '__snapshots__']);

function isGeneratedOrVendored(path: string): boolean {
  const segments = path.split('/');
  if (segments.some((segment) => GENERATED_DIR_SEGMENTS.has(segment))) {
    return true;
  }

  const name = basename(path);
  return name.includes('.min.') || name.endsWith('.snap');
}

export function shouldReview(file: ReviewCandidate): boolean {
  const path = file.path.toLowerCase();

  // GitHub's PR-files API omits `patch` for binary files and files too large to diff.
  if (file.patch === undefined) {
    return false;
  }

  if (isLockfile(path)) {
    return false;
  }

  if (isGeneratedOrVendored(path)) {
    return false;
  }

  return true;
}
