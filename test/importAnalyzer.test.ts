import { describe, it, expect } from 'vitest';
import { extractImportsExports } from '../src/analyzer/importAnalyzer';

describe('importAnalyzer', () => {
  it('extracts JS/TS imports and exports', () => {
    const code = `
import React from 'react';
import { api } from './services/api';
import type { User } from '../types';
export function App() {}
export const x = 1;
export default App;
export { foo, bar as baz };
`;
    const result = extractImportsExports(code, 'typescript');
    expect(result.imports).toContain('react');
    expect(result.imports).toContain('./services/api');
    expect(result.imports).toContain('../types');
    expect(result.exports).toContain('App');
    expect(result.exports).toContain('x');
    expect(result.exports).toContain('default');
  });

  it('extracts Python imports', () => {
    const code = `
from services.api import client
import os
import sys as system

def main():
    pass

class App:
    pass
`;
    const result = extractImportsExports(code, 'python');
    expect(result.imports).toContain('services.api');
    expect(result.imports).toContain('os');
    expect(result.exports).toContain('main');
    expect(result.exports).toContain('App');
  });

  it('extracts Java imports', () => {
    const code = `
import com.example.service.UserService;
import java.util.List;

public class UserController {
}
`;
    const result = extractImportsExports(code, 'java');
    expect(result.imports).toContain('com.example.service.UserService');
    expect(result.exports).toContain('UserController');
  });
});
