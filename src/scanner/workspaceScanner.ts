import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ScannedFile } from '../models/FileNode';
import { FolderTreeNode } from '../models/Project';
import { createIgnoreFilter } from './ignoreRules';
import { scanFile } from './fileScanner';

export interface ScanProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

export type ProgressCallback = (progress: ScanProgress) => void;

export class WorkspaceScanner {
  private rootPath: string;
  private excludePatterns: string[];
  private maxFileSize: number;
  private sendSourceCode: boolean;
  private ignoreFilter: (p: string) => boolean;

  constructor(
    rootPath: string,
    options: {
      excludePatterns?: string[];
      maxFileSize?: number;
      sendSourceCode?: boolean;
    } = {}
  ) {
    this.rootPath = rootPath;
    this.excludePatterns = options.excludePatterns || [];
    this.maxFileSize = options.maxFileSize ?? 100_000;
    this.sendSourceCode = options.sendSourceCode ?? true;
    this.ignoreFilter = createIgnoreFilter(this.excludePatterns);
  }

  async scan(onProgress?: ProgressCallback): Promise<{
    files: ScannedFile[];
    folderTree: FolderTreeNode;
  }> {
    const files: ScannedFile[] = [];
    const allRelativePaths: string[] = [];

    onProgress?.({
      phase: 'scanning',
      current: 0,
      total: 0,
      message: 'Discovering files...'
    });

    // Collect all candidate paths first (breadth-first style)
    const candidates: { abs: string; rel: string }[] = [];
    await this.walkDir(this.rootPath, '', candidates, onProgress);

    const total = candidates.length;
    onProgress?.({
      phase: 'analyzing',
      current: 0,
      total,
      message: `Analyzing ${total} files...`
    });

    let processed = 0;
    for (const { abs, rel } of candidates) {
      const scanned = await scanFile(abs, rel, this.maxFileSize, this.sendSourceCode);
      if (scanned) {
        files.push(scanned);
        allRelativePaths.push(rel);
      }
      processed++;
      if (processed % 20 === 0 || processed === total) {
        onProgress?.({
          phase: 'analyzing',
          current: processed,
          total,
          message: `Analyzed ${processed}/${total} files`
        });
      }
    }

    const folderTree = this.buildFolderTree(files);

    onProgress?.({
      phase: 'done',
      current: total,
      total,
      message: `Found ${files.length} source files`
    });

    return { files, folderTree };
  }

  private async walkDir(
    absDir: string,
    relDir: string,
    out: { abs: string; rel: string }[],
    onProgress?: ProgressCallback
  ): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const abs = path.join(absDir, entry.name);
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;

      if (this.ignoreFilter(rel) || this.ignoreFilter(rel + '/')) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDir(abs, rel, out, onProgress);
      } else if (entry.isFile()) {
        out.push({ abs, rel });
      }
    }
  }

  private buildFolderTree(files: ScannedFile[]): FolderTreeNode {
    const root: FolderTreeNode = {
      name: path.basename(this.rootPath) || 'workspace',
      path: '',
      type: 'folder',
      children: []
    };

    const nodeMap = new Map<string, FolderTreeNode>();
    nodeMap.set('', root);

    for (const file of files) {
      const parts = file.relativePath.split('/');
      let currentPath = '';
      let parent = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          const node: FolderTreeNode = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'folder',
            language: isLast ? file.language : undefined,
            children: isLast ? undefined : []
          };
          nodeMap.set(currentPath, node);
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        }
        parent = nodeMap.get(currentPath)!;
      }
    }

    // Sort children: folders first, then files
    const sortNodes = (node: FolderTreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortNodes);
      }
    };
    sortNodes(root);

    return root;
  }
}

export async function getWorkspaceRoot(): Promise<string | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }
  return folders[0].uri.fsPath;
}
