export type DependencyType = 'imports' | 'exports' | 'requires' | 'extends' | 'implements' | 'calls';

export interface Dependency {
  source: string;
  target: string;
  type: DependencyType;
  isExternal?: boolean;
}

export interface DependencyGraph {
  nodes: string[];
  edges: Dependency[];
}
