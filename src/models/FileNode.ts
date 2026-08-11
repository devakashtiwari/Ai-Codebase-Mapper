export type FileNodeType = 'file' | 'folder';

export interface FileNode {
  path: string;
  name: string;
  type: FileNodeType;
  language?: string;
  size?: number;
  imports?: string[];
  exports?: string[];
  children?: FileNode[];
  isEntryPoint?: boolean;
  relativePath: string;
}

export interface ScannedFile {
  path: string;
  name: string;
  relativePath: string;
  language: string;
  size: number;
  imports: string[];
  exports: string[];
  contentPreview?: string;
  isEntryPoint: boolean;
}
