import * as path from 'path';
import { ScannedFile } from '../models/FileNode';
import { Dependency } from '../models/Dependency';

/**
 * Resolve relative imports to project-relative paths where possible.
 * External packages are marked as such.
 */
export function buildDependencyGraph(files: ScannedFile[]): Dependency[] {
  const fileMap = new Map<string, ScannedFile>();
  for (const f of files) {
    fileMap.set(f.relativePath, f);
    // also index without extension for resolution
    const noExt = f.relativePath.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
    if (noExt !== f.relativePath) {
      fileMap.set(noExt, f);
    }
  }

  const deps: Dependency[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    for (const imp of file.imports) {
      const resolved = resolveImport(file.relativePath, imp, fileMap);
      const key = `${file.relativePath}->${resolved.target}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      deps.push({
        source: file.relativePath,
        target: resolved.target,
        type: 'imports',
        isExternal: resolved.isExternal
      });
    }
  }

  return deps;
}

function resolveImport(
  fromPath: string,
  importPath: string,
  fileMap: Map<string, ScannedFile>
): { target: string; isExternal: boolean } {
  // External package (no relative/absolute path)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    // strip subpath for node packages: lodash/get -> lodash
    const pkg = importPath.startsWith('@')
      ? importPath.split('/').slice(0, 2).join('/')
      : importPath.split('/')[0];
    return { target: pkg, isExternal: true };
  }

  const fromDir = path.posix.dirname(fromPath);
  let resolved = path.posix.normalize(path.posix.join(fromDir, importPath));

  // Try exact and with common extensions
  const candidates = [
    resolved,
    resolved + '.ts',
    resolved + '.tsx',
    resolved + '.js',
    resolved + '.jsx',
    resolved + '/index.ts',
    resolved + '/index.tsx',
    resolved + '/index.js'
  ];

  for (const c of candidates) {
    if (fileMap.has(c)) {
      return { target: fileMap.get(c)!.relativePath, isExternal: false };
    }
  }

  // Could not resolve to a known file – keep as-is but mark external-ish
  return { target: resolved, isExternal: !fileMap.has(resolved) };
}

/**
 * Detect simple circular dependencies (cycles of length 2+ in the internal graph).
 */
export function findCircularDependencies(deps: Dependency[]): string[] {
  const graph = new Map<string, string[]>();
  for (const d of deps) {
    if (d.isExternal) {
      continue;
    }
    if (!graph.has(d.source)) {
      graph.set(d.source, []);
    }
    graph.get(d.source)!.push(d.target);
  }

  const cycles: string[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const pathStack: string[] = [];

  function dfs(node: string): void {
    if (stack.has(node)) {
      const idx = pathStack.indexOf(node);
      if (idx >= 0) {
        const cycle = pathStack.slice(idx).concat(node).join(' → ');
        cycles.push(cycle);
      }
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    stack.add(node);
    pathStack.push(node);

    for (const next of graph.get(node) || []) {
      dfs(next);
    }

    stack.delete(node);
    pathStack.pop();
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return [...new Set(cycles)].slice(0, 20);
}
