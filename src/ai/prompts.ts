import { ProjectAnalysisInput } from '../models/Architecture';

export const SYSTEM_PROMPT = `You are a senior software architect.
Analyze the supplied codebase metadata and source-code context.
Your job is to understand the architecture of the project.

Identify:
1. Project type
2. Main technologies
3. Major modules
4. Folder responsibilities
5. Important files
6. Entry points
7. Dependency relationships
8. Data flow
9. API/backend relationships
10. Authentication flow if detectable
11. Potential architectural problems
12. Circular dependencies
13. Highly coupled modules
14. Suggested improvements

Do not invent information.
If something cannot be determined from the supplied information, mark it as "unknown".
Return ONLY valid JSON following the provided schema. No markdown, no code fences, no commentary.`;

export function buildAnalysisUserPrompt(input: ProjectAnalysisInput): string {
  const schema = {
    projectName: 'string',
    projectType: 'string',
    technologies: ['string'],
    modules: [{ name: 'string', path: 'string', purpose: 'string' }],
    entryPoints: ['string'],
    relationships: [{ source: 'string', target: 'string', type: 'string' }],
    importantFiles: [{ path: 'string', reason: 'string' }],
    dataFlow: 'string (optional)',
    authenticationFlow: 'string (optional)',
    potentialProblems: ['string'],
    circularDependencies: ['string'],
    highlyCoupledModules: ['string'],
    suggestedImprovements: ['string'],
    summary: 'string'
  };

  const payload = {
    projectName: input.projectName,
    files: input.files.map(f => ({
      path: f.path,
      language: f.language,
      size: f.size,
      imports: f.imports.slice(0, 30),
      exports: f.exports.slice(0, 20),
      isEntryPoint: f.isEntryPoint,
      ...(input.sendSourceCode && f.contentPreview
        ? { preview: f.contentPreview.slice(0, 1500) }
        : {})
    })),
    dependencies: input.dependencies.slice(0, 200),
    packageJson: input.packageJson
  };

  return `Analyze this codebase and return JSON matching this schema exactly:

${JSON.stringify(schema, null, 2)}

Codebase metadata:

${JSON.stringify(payload, null, 2)}`;
}

export function buildExplainFilePrompt(
  filePath: string,
  content: string,
  imports: string[],
  exports: string[],
  dependents: string[],
  projectContext: string
): string {
  return `You are a senior software engineer. Explain the following file concisely for a developer who is new to the codebase.

File: ${filePath}

Imports: ${imports.join(', ') || 'none'}
Exports: ${exports.join(', ') || 'none'}
Used by: ${dependents.slice(0, 15).join(', ') || 'unknown'}

Project context summary:
${projectContext}

File content (may be truncated):
\`\`\`
${content.slice(0, 6000)}
\`\`\`

Respond in markdown with short sections:
- What this file does
- Why it exists
- Important symbols
- Dependencies
- Who uses it
- Potential risks
- Related files

Be concise and practical. Do not invent details not present in the code.`;
}

export function buildChatPrompt(
  question: string,
  projectSummary: string,
  relevantFiles: Array<{ path: string; preview?: string }>
): string {
  return `You are an expert on this specific codebase. Answer the developer's question using only the provided project information.

Project summary:
${projectSummary}

Relevant files:
${relevantFiles
  .map(f => `--- ${f.path} ---\n${(f.preview || '').slice(0, 2000)}`)
  .join('\n\n')}

Question: ${question}

Answer helpfully and specifically. Cite file paths. If you cannot determine the answer from the context, say so.`;
}
