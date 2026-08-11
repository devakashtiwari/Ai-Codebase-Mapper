import { describe, it, expect } from 'vitest';
import { parseArchitectureResponse } from '../src/ai/responseParser';

describe('responseParser', () => {
  it('parses valid JSON', () => {
    const raw = JSON.stringify({
      projectName: 'Demo',
      projectType: 'Web App',
      technologies: ['React', 'TypeScript'],
      modules: [{ name: 'Frontend', path: 'src', purpose: 'UI' }],
      entryPoints: ['src/main.tsx'],
      relationships: [{ source: 'a', target: 'b', type: 'imports' }],
      importantFiles: [{ path: 'src/App.tsx', reason: 'root' }],
      summary: 'A demo app'
    });
    const result = parseArchitectureResponse(raw);
    expect(result.projectName).toBe('Demo');
    expect(result.technologies).toEqual(['React', 'TypeScript']);
    expect(result.modules[0].name).toBe('Frontend');
  });

  it('strips markdown fences', () => {
    const raw = '```json\n{"projectName":"X","projectType":"Y","technologies":[],"modules":[],"entryPoints":[],"relationships":[],"importantFiles":[]}\n```';
    const result = parseArchitectureResponse(raw);
    expect(result.projectName).toBe('X');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseArchitectureResponse('not json at all')).toThrow();
  });
});
