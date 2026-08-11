import * as path from 'path';
import ignore from 'ignore';

export const DEFAULT_IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  '.next',
  '.nuxt',
  'target',
  'vendor',
  '.vscode',
  '.idea',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  'venv',
  '.venv',
  'env',
  '.tox',
  'bin',
  'obj',
  '.gradle',
  '.mvn'
];

export const DEFAULT_IGNORE_FILES = [
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.map',
  '*.min.js',
  '*.min.css',
  '.env',
  '.env.*',
  '*.log',
  '*.tmp',
  '*.swp',
  '.DS_Store',
  'Thumbs.db',
  '*.pyc',
  '*.pyo',
  '*.class',
  '*.o',
  '*.so',
  '*.dll',
  '*.exe'
];

export function createIgnoreFilter(extraPatterns: string[] = []): (relativePath: string) => boolean {
  const ig = ignore();
  ig.add(DEFAULT_IGNORE_DIRS.map(d => `**/${d}/**`));
  ig.add(DEFAULT_IGNORE_DIRS.map(d => `**/${d}`));
  ig.add(DEFAULT_IGNORE_FILES);
  if (extraPatterns.length > 0) {
    ig.add(extraPatterns);
  }
  return (relativePath: string) => ig.ignores(relativePath);
}

export function shouldIgnorePath(relativePath: string, extraPatterns: string[] = []): boolean {
  const filter = createIgnoreFilter(extraPatterns);
  return filter(relativePath);
}

export function isSecretFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower === '.env' ||
    lower.startsWith('.env.') ||
    lower.includes('secret') ||
    lower.includes('credentials') ||
    lower.includes('password') ||
    lower.endsWith('.pem') ||
    lower.endsWith('.key') ||
    lower === 'id_rsa' ||
    lower === 'id_dsa'
  );
}
