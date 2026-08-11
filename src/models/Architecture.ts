export interface ModuleInfo {
  name: string;
  path: string;
  purpose: string;
}

export interface ImportantFile {
  path: string;
  reason: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
}

export interface ArchitectureAnalysis {
  projectName: string;
  projectType: string;
  technologies: string[];
  modules: ModuleInfo[];
  entryPoints: string[];
  relationships: Relationship[];
  importantFiles: ImportantFile[];
  dataFlow?: string;
  authenticationFlow?: string;
  potentialProblems?: string[];
  circularDependencies?: string[];
  highlyCoupledModules?: string[];
  suggestedImprovements?: string[];
  summary?: string;
}

export interface ProjectAnalysisInput {
  projectName: string;
  rootPath: string;
  files: Array<{
    path: string;
    language: string;
    size: number;
    imports: string[];
    exports: string[];
    contentPreview?: string;
    isEntryPoint: boolean;
  }>;
  dependencies: Array<{
    source: string;
    target: string;
    type: string;
  }>;
  packageJson?: Record<string, unknown>;
  sendSourceCode: boolean;
}
