import { describe, it, expect } from 'vitest';
import { shouldIgnorePath, isSecretFile, createIgnoreFilter } from '../src/scanner/ignoreRules';

describe('ignoreRules', () => {
  it('ignores node_modules', () => {
    expect(shouldIgnorePath('node_modules/foo/bar.js')).toBe(true);
    expect(shouldIgnorePath('src/node_modules/x')).toBe(true);
  });

  it('ignores .git', () => {
    expect(shouldIgnorePath('.git/config')).toBe(true);
  });

  it('ignores lock files', () => {
    expect(shouldIgnorePath('package-lock.json')).toBe(true);
    expect(shouldIgnorePath('yarn.lock')).toBe(true);
  });

  it('does not ignore normal source', () => {
    expect(shouldIgnorePath('src/App.tsx')).toBe(false);
    expect(shouldIgnorePath('lib/utils.ts')).toBe(false);
  });

  it('detects secret files', () => {
    expect(isSecretFile('.env')).toBe(true);
    expect(isSecretFile('.env.local')).toBe(true);
    expect(isSecretFile('secrets.json')).toBe(true);
    expect(isSecretFile('App.tsx')).toBe(false);
  });

  it('supports extra patterns', () => {
    const filter = createIgnoreFilter(['**/tmp/**', 'secrets/']);
    expect(filter('tmp/cache')).toBe(true);
    expect(filter('src/App.tsx')).toBe(false);
  });
});
