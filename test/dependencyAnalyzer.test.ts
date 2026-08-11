import { describe, it, expect } from 'vitest';
import { buildDependencyGraph, findCircularDependencies } from '../src/analyzer/dependencyAnalyzer';
import { ScannedFile } from '../src/models/FileNode';

function file(rel: string, imports: string[]): ScannedFile {
  return {
    path: '/proj/' + rel,
    name: rel.split('/').pop()!,
    relativePath: rel,
    language: 'typescript',
    size: 100,
    imports,
    exports: [],
    isEntryPoint: false
  };
}

describe('dependencyAnalyzer', () => {
  it('resolves relative imports', () => {
    const files = [
      file('src/App.tsx', ['./pages/Home', 'react']),
      file('src/pages/Home.tsx', ['../services/api']),
      file('src/services/api.ts', ['axios'])
    ];
    const deps = buildDependencyGraph(files);
    const internal = deps.filter(d => !d.isExternal);
    expect(internal.some(d => d.source === 'src/App.tsx' && d.target === 'src/pages/Home.tsx')).toBe(true);
    expect(internal.some(d => d.source === 'src/pages/Home.tsx' && d.target === 'src/services/api.ts')).toBe(true);
    expect(deps.some(d => d.target === 'react' && d.isExternal)).toBe(true);
  });

  it('detects circular dependencies', () => {
    const deps = [
      { source: 'a.ts', target: 'b.ts', type: 'imports' as const, isExternal: false },
      { source: 'b.ts', target: 'a.ts', type: 'imports' as const, isExternal: false }
    ];
    const cycles = findCircularDependencies(deps);
    expect(cycles.length).toBeGreaterThan(0);
  });
});
