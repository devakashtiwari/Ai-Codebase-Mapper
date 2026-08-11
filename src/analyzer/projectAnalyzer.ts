import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceScanner, ProgressCallback } from '../scanner/workspaceScanner';
import { buildDependencyGraph, findCircularDependencies } from './dependencyAnalyzer';
import { ProjectSnapshot } from '../models/Project';
import { ArchitectureAnalysis, ProjectAnalysisInput } from '../models/Architecture';
import { AIClient } from '../ai/aiClient';
import { Logger } from '../utils/logger';
import { Cache } from '../utils/cache';

export class ProjectAnalyzer {
  private rootPath: string;
  private options: {
    excludePatterns: string[];
    maxFileSize: number;
    sendSourceCode: boolean;
    maxFilesForAI: number;
  };
  private cache: Cache;
  private aiClient: AIClient;

  constructor(
    rootPath: string,
    options: {
      excludePatterns?: string[];
      maxFileSize?: number;
      sendSourceCode?: boolean;
      maxFilesForAI?: number;
    },
    aiClient: AIClient,
    cache: Cache
  ) {
    this.rootPath = rootPath;
    this.options = {
      excludePatterns: options.excludePatterns || [],
      maxFileSize: options.maxFileSize ?? 100_000,
      sendSourceCode: options.sendSourceCode ?? true,
      maxFilesForAI: options.maxFilesForAI ?? 150
    };
    this.aiClient = aiClient;
    this.cache = cache;
  }

  async analyze(onProgress?: ProgressCallback): Promise<ProjectSnapshot> {
    const cacheKey = `snapshot:${this.rootPath}`;
    const cached = this.cache.get<ProjectSnapshot>(cacheKey);
    if (cached && Date.now() - cached.scannedAt < 5 * 60 * 1000) {
      Logger.info('Using cached project snapshot');
      return cached;
    }

    const scanner = new WorkspaceScanner(this.rootPath, {
      excludePatterns: this.options.excludePatterns,
      maxFileSize: this.options.maxFileSize,
      sendSourceCode: this.options.sendSourceCode
    });

    const { files, folderTree } = await scanner.scan(onProgress);

    onProgress?.({
      phase: 'dependencies',
      current: 0,
      total: 1,
      message: 'Building dependency graph...'
    });

    const dependencies = buildDependencyGraph(files);
    const circular = findCircularDependencies(dependencies);

    let packageJson: Record<string, unknown> | undefined;
    try {
      const pkgPath = path.join(this.rootPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        packageJson = JSON.parse(await fs.promises.readFile(pkgPath, 'utf8'));
      }
    } catch {
      // ignore
    }

    const name =
      (packageJson?.name as string) ||
      path.basename(this.rootPath) ||
      'workspace';

    const snapshot: ProjectSnapshot = {
      name,
      rootPath: this.rootPath,
      scannedAt: Date.now(),
      files,
      dependencies,
      folderTree,
      packageJson
    };

    // AI analysis
    onProgress?.({
      phase: 'ai',
      current: 0,
      total: 1,
      message: 'Generating AI architecture map...'
    });

    try {
      const input = this.buildAIInput(snapshot);
      const analysis = await this.aiClient.analyzeProject(input);
      if (circular.length > 0) {
        analysis.circularDependencies = [
          ...(analysis.circularDependencies || []),
          ...circular
        ];
      }
      snapshot.analysis = analysis;
    } catch (err) {
      Logger.error('AI analysis failed', err);
      // Provide a basic fallback architecture from local data
      snapshot.analysis = this.buildFallbackAnalysis(snapshot, circular);
    }

    this.cache.set(cacheKey, snapshot);
    return snapshot;
  }

  private buildAIInput(snapshot: ProjectSnapshot): ProjectAnalysisInput {
    // Prioritize entry points and important-looking files
    const sorted = [...snapshot.files].sort((a, b) => {
      if (a.isEntryPoint !== b.isEntryPoint) {
        return a.isEntryPoint ? -1 : 1;
      }
      // prefer source over config
      const aSrc = a.relativePath.startsWith('src/') ? 0 : 1;
      const bSrc = b.relativePath.startsWith('src/') ? 0 : 1;
      return aSrc - bSrc;
    });

    const limited = sorted.slice(0, this.options.maxFilesForAI);

    return {
      projectName: snapshot.name,
      rootPath: snapshot.rootPath,
      files: limited.map(f => ({
        path: f.relativePath,
        language: f.language,
        size: f.size,
        imports: f.imports,
        exports: f.exports,
        contentPreview: this.options.sendSourceCode ? f.contentPreview : undefined,
        isEntryPoint: f.isEntryPoint
      })),
      dependencies: snapshot.dependencies
        .filter(d => !d.isExternal)
        .slice(0, 300)
        .map(d => ({
          source: d.source,
          target: d.target,
          type: d.type
        })),
      packageJson: snapshot.packageJson
        ? {
            name: snapshot.packageJson.name,
            dependencies: snapshot.packageJson.dependencies,
            devDependencies: snapshot.packageJson.devDependencies,
            scripts: snapshot.packageJson.scripts,
            main: snapshot.packageJson.main,
            type: snapshot.packageJson.type
          }
        : undefined,
      sendSourceCode: this.options.sendSourceCode
    };
  }

  private buildFallbackAnalysis(
    snapshot: ProjectSnapshot,
    circular: string[]
  ): ArchitectureAnalysis {
    const techs = new Set<string>();
    for (const f of snapshot.files) {
      if (f.language !== 'unknown') {
        techs.add(f.language);
      }
    }
    if (snapshot.packageJson?.dependencies) {
      const deps = Object.keys(snapshot.packageJson.dependencies as object);
      if (deps.includes('react')) techs.add('React');
      if (deps.includes('vue')) techs.add('Vue');
      if (deps.includes('express')) techs.add('Express');
      if (deps.includes('next')) techs.add('Next.js');
    }

    const entryPoints = snapshot.files
      .filter(f => f.isEntryPoint)
      .map(f => f.relativePath);

    const modules: ArchitectureAnalysis['modules'] = [];
    const topFolders = new Set<string>();
    for (const f of snapshot.files) {
      const parts = f.relativePath.split('/');
      if (parts.length > 1) {
        topFolders.add(parts[0]);
      }
    }
    for (const folder of topFolders) {
      modules.push({
        name: folder,
        path: folder,
        purpose: 'unknown'
      });
    }

    return {
      projectName: snapshot.name,
      projectType: 'unknown',
      technologies: [...techs],
      modules,
      entryPoints,
      relationships: snapshot.dependencies
        .filter(d => !d.isExternal)
        .slice(0, 50)
        .map(d => ({ source: d.source, target: d.target, type: d.type })),
      importantFiles: entryPoints.map(p => ({
        path: p,
        reason: 'Likely entry point'
      })),
      circularDependencies: circular,
      summary: 'Local analysis only (AI unavailable). Architecture inferred from file structure and imports.'
    };
  }
}
