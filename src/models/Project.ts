import { ScannedFile } from './FileNode';
import { Dependency } from './Dependency';
import { ArchitectureAnalysis } from './Architecture';

export interface ProjectSnapshot {
  name: string;
  rootPath: string;
  scannedAt: number;
  files: ScannedFile[];
  dependencies: Dependency[];
  folderTree: FolderTreeNode;
  packageJson?: Record<string, unknown>;
  analysis?: ArchitectureAnalysis;
}

export interface FolderTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FolderTreeNode[];
  language?: string;
}
