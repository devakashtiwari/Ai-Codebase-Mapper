import React, { useEffect, useState, useCallback } from 'react';
import { ArchitectureGraph } from './graph/ArchitectureGraph';
import { FileTree } from './components/FileTree';
import { SummaryView } from './components/SummaryView';
import { DependenciesView } from './components/DependenciesView';

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(s: unknown): void;
};

const vscode = acquireVsCodeApi();

export interface SnapshotPayload {
  name: string;
  rootPath: string;
  scannedAt: number;
  files: Array<{
    path: string;
    name: string;
    language: string;
    size: number;
    imports: string[];
    exports: string[];
    isEntryPoint: boolean;
  }>;
  dependencies: Array<{
    source: string;
    target: string;
    type: string;
    isExternal?: boolean;
  }>;
  folderTree: {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: SnapshotPayload['folderTree'][];
    language?: string;
  };
  analysis?: {
    projectName: string;
    projectType: string;
    technologies: string[];
    modules: Array<{ name: string; path: string; purpose: string }>;
    entryPoints: string[];
    relationships: Array<{ source: string; target: string; type: string }>;
    importantFiles: Array<{ path: string; reason: string }>;
    dataFlow?: string;
    authenticationFlow?: string;
    potentialProblems?: string[];
    circularDependencies?: string[];
    highlyCoupledModules?: string[];
    suggestedImprovements?: string[];
    summary?: string;
  };
}

type Tab = 'architecture' | 'dependencies' | 'files' | 'summary';

export default function App() {
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [status, setStatus] = useState('Waiting for analysis...');
  const [tab, setTab] = useState<Tab>('architecture');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'updateSnapshot') {
        setSnapshot(msg.payload);
        setStatus(
          `Analyzed ${msg.payload.files?.length ?? 0} files · ${
            msg.payload.dependencies?.length ?? 0
          } dependencies`
        );
      } else if (msg.type === 'progress') {
        setStatus(
          msg.payload.message +
            (msg.payload.percent != null ? ` (${msg.payload.percent}%)` : '')
        );
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, []);

  const openFile = useCallback((filePath: string) => {
    vscode.postMessage({ type: 'openFile', path: filePath });
  }, []);

  return (
    <div className="app">
      <header>
        <span aria-hidden>🤖</span>
        <h1>AI Codebase Mapper</h1>
        <span className="project-name">{snapshot?.name || ''}</span>
      </header>
      <div className="tabs">
        {(
          [
            ['architecture', 'Architecture'],
            ['dependencies', 'Dependencies'],
            ['files', 'Files'],
            ['summary', 'AI Summary']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="status-bar">{status}</div>
      <div className="main">
        {tab === 'architecture' && (
          <div className="view graph-container">
            {snapshot ? (
              <ArchitectureGraph snapshot={snapshot} onOpenFile={openFile} />
            ) : (
              <div className="empty">Run “AI Codebase Mapper: Analyze Project” to begin.</div>
            )}
          </div>
        )}
        {tab === 'dependencies' && (
          <div className="view">
            <DependenciesView snapshot={snapshot} onOpenFile={openFile} />
          </div>
        )}
        {tab === 'files' && (
          <div className="view">
            <FileTree tree={snapshot?.folderTree} onOpenFile={openFile} />
          </div>
        )}
        {tab === 'summary' && (
          <div className="view">
            <SummaryView analysis={snapshot?.analysis} />
          </div>
        )}
      </div>
    </div>
  );
}
