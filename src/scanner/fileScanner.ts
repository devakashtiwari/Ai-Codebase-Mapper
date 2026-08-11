import * as fs from 'fs';
import * as path from 'path';
import { ScannedFile } from '../models/FileNode';
import { isSecretFile } from './ignoreRules';
import { extractImportsExports } from '../analyzer/importAnalyzer';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.scala': 'scala',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.json': 'json',
  '.md': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.toml': 'toml',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell'
};

const ENTRY_POINT_PATTERNS = [
  /^(main|index|app|server|cli)\.(ts|tsx|js|jsx|py|go|rs|java|cs)$/i,
  /^main\.tsx?$/i,
  /^index\.tsx?$/i,
  /^App\.tsx?$/i,
  /^_app\.(tsx|jsx)$/i,
  /^server\.(ts|js)$/i
];

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'unknown';
}

export function isLikelyEntryPoint(fileName: string, relativePath: string): boolean {
  if (ENTRY_POINT_PATTERNS.some(p => p.test(fileName))) {
    return true;
  }
  // package.json "main" or "bin" would be checked separately
  const lower = relativePath.toLowerCase();
  return (
    lower === 'src/main.ts' ||
    lower === 'src/main.tsx' ||
    lower === 'src/index.ts' ||
    lower === 'src/index.tsx' ||
    lower === 'src/app.tsx' ||
    lower === 'src/app.ts' ||
    lower.endsWith('/main.go') ||
    lower === 'main.py' ||
    lower === 'app.py'
  );
}

export async function scanFile(
  absolutePath: string,
  relativePath: string,
  maxSize: number,
  sendSourceCode: boolean
): Promise<ScannedFile | null> {
  try {
    const stat = await fs.promises.stat(absolutePath);
    if (!stat.isFile()) {
      return null;
    }
    if (stat.size > maxSize) {
      return null;
    }

    const name = path.basename(absolutePath);
    if (isSecretFile(name)) {
      return null;
    }

    const language = detectLanguage(absolutePath);
    let imports: string[] = [];
    let exports: string[] = [];
    let contentPreview: string | undefined;

    // Only parse source-like files
    const parseable = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'csharp'].includes(language);
    if (parseable) {
      try {
        const content = await fs.promises.readFile(absolutePath, 'utf8');
        const extracted = extractImportsExports(content, language);
        imports = extracted.imports;
        exports = extracted.exports;

        if (sendSourceCode && content.length < 8000) {
          contentPreview = content.slice(0, 4000);
        } else if (sendSourceCode) {
          contentPreview = content.slice(0, 2000) + '\n// ... truncated ...';
        }
      } catch {
        // binary or unreadable
      }
    }

    return {
      path: absolutePath,
      name,
      relativePath: relativePath.replace(/\\/g, '/'),
      language,
      size: stat.size,
      imports,
      exports,
      contentPreview,
      isEntryPoint: isLikelyEntryPoint(name, relativePath)
    };
  } catch {
    return null;
  }
}
