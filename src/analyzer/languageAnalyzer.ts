/**
 * Placeholder for future language-specific deep analysis
 * (e.g. tree-sitter based). Currently importAnalyzer covers
 * the common cases.
 */

export function supportedLanguages(): string[] {
  return [
    'typescript',
    'javascript',
    'python',
    'java',
    'go',
    'rust',
    'csharp',
    'vue',
    'svelte'
  ];
}

export function isSupported(language: string): boolean {
  return supportedLanguages().includes(language);
}
