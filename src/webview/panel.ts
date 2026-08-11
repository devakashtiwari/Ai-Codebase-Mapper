import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectSnapshot } from '../models/Project';
import { handleWebviewMessage } from './messageHandler';
import { Logger } from '../utils/logger';

export class ArchitecturePanel {
  public static currentPanel: ArchitecturePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private snapshot: ProjectSnapshot | undefined;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          await handleWebviewMessage(message, this.panel.webview, this.snapshot);
        } catch (err) {
          Logger.error('Webview message handler error', err);
        }
      },
      null,
      this.disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, snapshot?: ProjectSnapshot): ArchitecturePanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ArchitecturePanel.currentPanel) {
      ArchitecturePanel.currentPanel.panel.reveal(column);
      if (snapshot) {
        ArchitecturePanel.currentPanel.update(snapshot);
      }
      return ArchitecturePanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'aiCodebaseMapper',
      'AI Codebase Mapper',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview', 'dist'),
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    ArchitecturePanel.currentPanel = new ArchitecturePanel(panel, extensionUri);
    if (snapshot) {
      ArchitecturePanel.currentPanel.update(snapshot);
    }
    return ArchitecturePanel.currentPanel;
  }

  public update(snapshot: ProjectSnapshot): void {
    this.snapshot = snapshot;
    this.panel.webview.postMessage({
      type: 'updateSnapshot',
      payload: {
        name: snapshot.name,
        rootPath: snapshot.rootPath,
        scannedAt: snapshot.scannedAt,
        files: snapshot.files.map(f => ({
          path: f.relativePath,
          name: f.name,
          language: f.language,
          size: f.size,
          imports: f.imports,
          exports: f.exports,
          isEntryPoint: f.isEntryPoint
        })),
        dependencies: snapshot.dependencies,
        folderTree: snapshot.folderTree,
        analysis: snapshot.analysis
      }
    });
  }

  public postProgress(message: string, percent?: number): void {
    this.panel.webview.postMessage({
      type: 'progress',
      payload: { message, percent }
    });
  }

  public dispose(): void {
    ArchitecturePanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      d?.dispose();
    }
  }

  private getHtml(): string {
    const distPath = path.join(this.extensionUri.fsPath, 'webview', 'dist');
    const indexPath = path.join(distPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      const distUri = this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist')
      );
      html = html.replace(/(href|src)="([^"]+)"/g, (_m, attr, val) => {
        if (val.startsWith('http') || val.startsWith('data:')) {
          return `${attr}="${val}"`;
        }
        const cleaned = val.replace(/^\.\//, '');
        return `${attr}="${distUri}/${cleaned}"`;
      });
      // CSP
      const csp = [
        `default-src 'none'`,
        `script-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
        `style-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
        `img-src ${this.panel.webview.cspSource} data:`,
        `font-src ${this.panel.webview.cspSource} data:`
      ].join('; ');
      html = html.replace(
        /<head>/i,
        `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`
      );
      return html;
    }

    // Fallback inline HTML when webview is not built yet
    return this.getFallbackHtml();
  }

  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Codebase Mapper</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --accent: var(--vscode-button-background, #0e639c);
      --border: var(--vscode-panel-border, #333);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      background: var(--bg); color: var(--fg);
      height: 100vh; display: flex; flex-direction: column;
    }
    header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 12px;
    }
    header h1 { margin: 0; font-size: 16px; font-weight: 600; }
    .tabs { display: flex; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
    .tab {
      padding: 6px 12px; border-radius: 4px; cursor: pointer;
      background: transparent; border: none; color: var(--fg); font-size: 13px;
    }
    .tab.active { background: var(--accent); color: #fff; }
    main { flex: 1; overflow: auto; padding: 16px; }
    #graph {
      width: 100%; height: 100%; min-height: 400px;
      border: 1px solid var(--border); border-radius: 8px;
      position: relative; background: #0d1117;
    }
    .node {
      position: absolute; padding: 8px 12px; border-radius: 6px;
      background: #21262d; border: 1px solid #30363d; color: #c9d1d9;
      font-size: 12px; cursor: pointer; white-space: nowrap;
    }
    .node.entry { border-color: #58a6ff; }
    .node.module { background: #1f6feb33; border-color: #1f6feb; }
    .status { padding: 8px 16px; font-size: 12px; opacity: 0.8; }
    .file-tree { font-size: 13px; line-height: 1.6; }
    .file-tree .folder { font-weight: 600; }
    .file-tree .file { cursor: pointer; padding-left: 8px; }
    .file-tree .file:hover { text-decoration: underline; }
    pre { white-space: pre-wrap; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <span>🤖</span>
    <h1>AI Codebase Mapper</h1>
    <span id="projectName" style="opacity:0.7"></span>
  </header>
  <div class="tabs">
    <button class="tab active" data-tab="architecture">Architecture</button>
    <button class="tab" data-tab="dependencies">Dependencies</button>
    <button class="tab" data-tab="files">Files</button>
    <button class="tab" data-tab="summary">AI Summary</button>
  </div>
  <div class="status" id="status">Waiting for analysis...</div>
  <main>
    <div id="architecture" class="view">
      <div id="graph"></div>
    </div>
    <div id="dependencies" class="view" style="display:none">
      <pre id="depsContent"></pre>
    </div>
    <div id="files" class="view" style="display:none">
      <div class="file-tree" id="fileTree"></div>
    </div>
    <div id="summary" class="view" style="display:none">
      <pre id="summaryContent"></pre>
    </div>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    let snapshot = null;

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.getElementById(tab.dataset.tab).style.display = 'block';
      });
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'updateSnapshot') {
        snapshot = msg.payload;
        document.getElementById('projectName').textContent = snapshot.name || '';
        document.getElementById('status').textContent =
          'Analyzed ' + (snapshot.files?.length || 0) + ' files · ' +
          (snapshot.dependencies?.length || 0) + ' dependencies';
        renderGraph();
        renderDeps();
        renderFiles();
        renderSummary();
      } else if (msg.type === 'progress') {
        document.getElementById('status').textContent = msg.payload.message +
          (msg.payload.percent != null ? ' (' + msg.payload.percent + '%)' : '');
      }
    });

    function renderGraph() {
      const graph = document.getElementById('graph');
      graph.innerHTML = '';
      if (!snapshot?.analysis) {
        graph.innerHTML = '<div style="padding:20px;opacity:0.6">No architecture analysis yet.</div>';
        return;
      }
      const analysis = snapshot.analysis;
      const modules = analysis.modules || [];
      const entry = analysis.entryPoints || [];
      const important = analysis.importantFiles || [];

      let y = 20;
      const addNode = (label, x, isEntry, isModule) => {
        const el = document.createElement('div');
        el.className = 'node' + (isEntry ? ' entry' : '') + (isModule ? ' module' : '');
        el.textContent = label;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.title = label;
        el.onclick = () => {
          if (label.includes('/') || label.includes('.')) {
            vscode.postMessage({ type: 'openFile', path: label });
          }
        };
        graph.appendChild(el);
        y += 40;
      };

      addNode(analysis.projectName || 'Project', 40, false, true);
      modules.slice(0, 12).forEach((m, i) => {
        addNode(m.name + (m.purpose && m.purpose !== 'unknown' ? ' — ' + m.purpose : ''), 80, false, true);
      });
      entry.slice(0, 8).forEach(e => addNode(e, 120, true, false));
      important.slice(0, 8).forEach(f => {
        if (!entry.includes(f.path)) addNode(f.path, 160, false, false);
      });
    }

    function renderDeps() {
      if (!snapshot) return;
      const lines = (snapshot.dependencies || [])
        .filter(d => !d.isExternal)
        .slice(0, 100)
        .map(d => d.source + '  →  ' + d.target);
      document.getElementById('depsContent').textContent =
        lines.join('\\n') || 'No internal dependencies detected.';
    }

    function renderFiles() {
      if (!snapshot?.folderTree) return;
      const container = document.getElementById('fileTree');
      container.innerHTML = '';
      function renderNode(node, depth) {
        const div = document.createElement('div');
        div.style.paddingLeft = (depth * 14) + 'px';
        if (node.type === 'folder') {
          div.className = 'folder';
          div.textContent = '📁 ' + node.name;
          container.appendChild(div);
          (node.children || []).forEach(c => renderNode(c, depth + 1));
        } else {
          div.className = 'file';
          div.textContent = '📄 ' + node.name;
          div.onclick = () => vscode.postMessage({ type: 'openFile', path: node.path });
          container.appendChild(div);
        }
      }
      (snapshot.folderTree.children || []).forEach(c => renderNode(c, 0));
    }

    function renderSummary() {
      if (!snapshot?.analysis) {
        document.getElementById('summaryContent').textContent = 'No AI analysis available.';
        return;
      }
      const a = snapshot.analysis;
      const lines = [
        'Project: ' + a.projectName,
        'Type: ' + a.projectType,
        'Technologies: ' + (a.technologies || []).join(', '),
        '',
        'Summary:',
        a.summary || '(none)',
        '',
        'Modules:',
        ...(a.modules || []).map(m => '  - ' + m.name + ' (' + m.path + '): ' + m.purpose),
        '',
        'Entry points:',
        ...(a.entryPoints || []).map(e => '  - ' + e),
        '',
        'Potential problems:',
        ...(a.potentialProblems || []).map(p => '  - ' + p),
        '',
        'Suggested improvements:',
        ...(a.suggestedImprovements || []).map(s => '  - ' + s)
      ];
      document.getElementById('summaryContent').textContent = lines.join('\\n');
    }
  </script>
</body>
</html>`;
  }
}
