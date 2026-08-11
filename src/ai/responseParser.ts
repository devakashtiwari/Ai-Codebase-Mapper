import { ArchitectureAnalysis } from '../models/Architecture';

export function parseArchitectureResponse(raw: string): ArchitectureAnalysis {
  let text = raw.trim();

  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON object from mixed content
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('AI response is not valid JSON');
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response is not an object');
  }

  const obj = parsed as Record<string, unknown>;

  return {
    projectName: stringOr(obj.projectName, 'Unknown Project'),
    projectType: stringOr(obj.projectType, 'unknown'),
    technologies: stringArray(obj.technologies),
    modules: arrayOfModules(obj.modules),
    entryPoints: stringArray(obj.entryPoints),
    relationships: arrayOfRelationships(obj.relationships),
    importantFiles: arrayOfImportantFiles(obj.importantFiles),
    dataFlow: optionalString(obj.dataFlow),
    authenticationFlow: optionalString(obj.authenticationFlow),
    potentialProblems: stringArray(obj.potentialProblems),
    circularDependencies: stringArray(obj.circularDependencies),
    highlyCoupledModules: stringArray(obj.highlyCoupledModules),
    suggestedImprovements: stringArray(obj.suggestedImprovements),
    summary: optionalString(obj.summary)
  };
}

function stringOr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function optionalString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x): x is string => typeof x === 'string');
}

function arrayOfModules(v: unknown): ArchitectureAnalysis['modules'] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const o = item as Record<string, unknown>;
      return {
        name: stringOr(o.name, 'Unknown'),
        path: stringOr(o.path, ''),
        purpose: stringOr(o.purpose, 'unknown')
      };
    });
}

function arrayOfRelationships(v: unknown): ArchitectureAnalysis['relationships'] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const o = item as Record<string, unknown>;
      return {
        source: stringOr(o.source, ''),
        target: stringOr(o.target, ''),
        type: stringOr(o.type, 'imports')
      };
    })
    .filter(r => r.source && r.target);
}

function arrayOfImportantFiles(v: unknown): ArchitectureAnalysis['importantFiles'] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const o = item as Record<string, unknown>;
      return {
        path: stringOr(o.path, ''),
        reason: stringOr(o.reason, '')
      };
    })
    .filter(f => f.path);
}
