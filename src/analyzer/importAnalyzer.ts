/**
 * Lightweight import/export extraction without full AST parsers.
 * Supports common patterns for JS/TS, Python, Java, Go, etc.
 * Designed to be extensible.
 */

export interface ImportExportResult {
  imports: string[];
  exports: string[];
}

export function extractImportsExports(content: string, language: string): ImportExportResult {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return extractJsTs(content);
    case 'python':
      return extractPython(content);
    case 'java':
      return extractJava(content);
    case 'go':
      return extractGo(content);
    case 'rust':
      return extractRust(content);
    case 'csharp':
      return extractCSharp(content);
    default:
      return { imports: [], exports: [] };
  }
}

function extractJsTs(content: string): ImportExportResult {
  const imports: string[] = [];
  const exports: string[] = [];

  // import x from 'y'
  // import { a, b } from "y"
  // import * as x from 'y'
  // import 'y'
  const importRe = /import\s+(?:(?:type\s+)?(?:[\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  // require('x')
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = requireRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  // export ... from 'x'
  const reExportRe = /export\s+.*?from\s+['"]([^'"]+)['"]/g;
  while ((m = reExportRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  // export function/const/class/default/interface/type name
  const namedExportRe = /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+(\w+)/g;
  while ((m = namedExportRe.exec(content)) !== null) {
    exports.push(m[1]);
  }

  // export default
  if (/export\s+default\b/.test(content)) {
    exports.push('default');
  }

  // export { a, b }
  const braceExportRe = /export\s*\{([^}]+)\}/g;
  while ((m = braceExportRe.exec(content)) !== null) {
    const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()?.trim()).filter(Boolean) as string[];
    exports.push(...names);
  }

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)]
  };
}

function extractPython(content: string): ImportExportResult {
  const imports: string[] = [];
  const exports: string[] = [];

  // import x
  // import x as y
  // from x import y
  // from x.y import z
  const fromImportRe = /(?:^|\n)\s*from\s+([\w.]+)\s+import\s+/gm;
  let m: RegExpExecArray | null;
  while ((m = fromImportRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  const importRe = /(?:^|\n)\s*import\s+([\w.]+)/gm;
  while ((m = importRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  // Rough exports: top-level def / class
  const defRe = /(?:^|\n)def\s+(\w+)\s*\(/g;
  while ((m = defRe.exec(content)) !== null) {
    exports.push(m[1]);
  }
  const classRe = /(?:^|\n)class\s+(\w+)\s*[:(]/g;
  while ((m = classRe.exec(content)) !== null) {
    exports.push(m[1]);
  }

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)]
  };
}

function extractJava(content: string): ImportExportResult {
  const imports: string[] = [];
  const exports: string[] = [];

  const importRe = /import\s+(?:static\s+)?([\w.]+)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  const classRe = /(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/g;
  while ((m = classRe.exec(content)) !== null) {
    exports.push(m[1]);
  }
  const interfaceRe = /(?:public\s+)?interface\s+(\w+)/g;
  while ((m = interfaceRe.exec(content)) !== null) {
    exports.push(m[1]);
  }

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)]
  };
}

function extractGo(content: string): ImportExportResult {
  const imports: string[] = [];
  const exports: string[] = [];

  // import "x" or import ( "x" "y" )
  const singleImport = /import\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = singleImport.exec(content)) !== null) {
    imports.push(m[1]);
  }

  const multiImport = /import\s*\(([\s\S]*?)\)/g;
  while ((m = multiImport.exec(content)) !== null) {
    const block = m[1];
    const pathRe = /"([^"]+)"/g;
    let p: RegExpExecArray | null;
    while ((p = pathRe.exec(block)) !== null) {
      imports.push(p[1]);
    }
  }

  // Exported identifiers start with uppercase
  const funcRe = /func\s+(\w+)\s*\(/g;
  while ((m = funcRe.exec(content)) !== null) {
    if (m[1][0] === m[1][0].toUpperCase()) {
      exports.push(m[1]);
    }
  }
  const typeRe = /type\s+(\w+)\s+/g;
  while ((m = typeRe.exec(content)) !== null) {
    if (m[1][0] === m[1][0].toUpperCase()) {
      exports.push(m[1]);
    }
  }

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)]
  };
}

function extractRust(content: string): ImportExportResult {
  const imports: string[] = [];
  const exports: string[] = [];

  const useRe = /use\s+([\w:]+)(?:\s*::\s*\{[^}]*\})?/g;
  let m: RegExpExecArray | null;
  while ((m = useRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  const pubFn = /pub\s+(?:async\s+)?fn\s+(\w+)/g;
  while ((m = pubFn.exec(content)) !== null) {
    exports.push(m[1]);
  }
  const pubStruct = /pub\s+struct\s+(\w+)/g;
  while ((m = pubStruct.exec(content)) !== null) {
    exports.push(m[1]);
  }

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)]
  };
}

function extractCSharp(content: string): ImportExportResult {
  const imports: string[] = [];
  const exports: string[] = [];

  const usingRe = /using\s+([\w.]+)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = usingRe.exec(content)) !== null) {
    imports.push(m[1]);
  }

  const classRe = /(?:public\s+)?(?:partial\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+(\w+)/g;
  while ((m = classRe.exec(content)) !== null) {
    exports.push(m[1]);
  }

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)]
  };
}
