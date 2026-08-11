import * as vscode from 'vscode';
import * as path from 'path';
import { getWorkspaceRoot } from './scanner/workspaceScanner';
import { ProjectAnalyzer } from './analyzer/projectAnalyzer';
import { ArchitecturePanel } from './webview/panel';
import { getOrPromptApiKey, createAIClient } from './ai/aiClient';
import { Cache } from './utils/cache';
import { Logger } from './utils/logger';
import { ProjectSnapshot } from './models/Project';
import { redactSecrets } from './utils/security';

let statusBarItem: vscode.StatusBarItem;
let currentSnapshot: ProjectSnapshot | undefined;
const cache = new Cache();

export function activate(context: vscode.ExtensionContext): void {
  Logger.info('AI Codebase Mapper activating');

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'aiCodebaseMapper.openMap';
  statusBarItem.text = '$(hubot) AI Map';
  statusBarItem.tooltip = 'Open AI Codebase Architecture Map';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('aiCodebaseMapper.analyzeProject', () =>
      runAnalysis(context, true)
    ),
    vscode.commands.registerCommand('aiCodebaseMapper.openMap', () => openMap(context)),
    vscode.commands.registerCommand('aiCodebaseMapper.refreshAnalysis', () =>
      runAnalysis(context, true)
    ),
    vscode.commands.registerCommand('aiCodebaseMapper.explainCurrentFile', () =>
      explainCurrentFile(context)
    ),
    vscode.commands.registerCommand('aiCodebaseMapper.showDependencies', () =>
      showDeps(true)
    ),
    vscode.commands.registerCommand('aiCodebaseMapper.showDependents', () =>
      showDeps(false)
    ),
    vscode.commands.registerCommand('aiCodebaseMapper.askAI', () => askAI(context)),
    vscode.commands.registerCommand('aiCodebaseMapper.clearCache', () => {
      cache.clear();
      currentSnapshot = undefined;
      vscode.window.showInformationMessage('AI Codebase Mapper cache cleared.');
      statusBarItem.text = '$(hubot) AI Map';
    })
  );

  const config = vscode.workspace.getConfiguration('aiCodebaseMapper');
  if (config.get<boolean>('autoAnalyze')) {
    void runAnalysis(context, false);
  }
}

export function deactivate(): void {
  // nothing persistent
}

async function runAnalysis(
  context: vscode.ExtensionContext,
  forceOpen: boolean
): Promise<void> {
  const root = await getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Open a folder or workspace first.');
    return;
  }

  const config = vscode.workspace.getConfiguration('aiCodebaseMapper');
  const apiKey = await getOrPromptApiKey(context);
  if (!apiKey) {
    vscode.window.showWarningMessage(
      'API key required for AI analysis. You can still view a basic structure map without AI.'
    );
  }

  statusBarItem.text = '$(sync~spin) Analyzing...';

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'AI Codebase Mapper',
      cancellable: false
    },
    async (progress) => {
      progress.report({ message: 'Scanning workspace...' });

      try {
        const aiClient = apiKey
          ? createAIClient(apiKey, config)
          : {
              analyzeProject: async () => {
                throw new Error('No API key');
              },
              explainFile: async () => 'Configure an API key to enable AI explanations.',
              chat: async () => 'Configure an API key to enable AI chat.'
            };

        const analyzer = new ProjectAnalyzer(
          root,
          {
            excludePatterns: config.get<string[]>('excludePatterns') || [],
            maxFileSize: config.get<number>('maxFileSize') ?? 100_000,
            sendSourceCode: config.get<boolean>('sendSourceCode') ?? true,
            maxFilesForAI: config.get<number>('maxFilesForAI') ?? 150
          },
          aiClient as any,
          cache
        );

        const snapshot = await analyzer.analyze((p) => {
          const percent =
            p.total > 0 ? Math.round((p.current / p.total) * 100) : undefined;
          progress.report({
            message: p.message,
            increment: percent !== undefined ? undefined : 5
          });
          ArchitecturePanel.currentPanel?.postProgress(p.message, percent);
        });

        currentSnapshot = snapshot;
        statusBarItem.text = '$(hubot) AI Map Ready';
        statusBarItem.tooltip = `Architecture map ready for ${snapshot.name}`;

        if (forceOpen || ArchitecturePanel.currentPanel) {
          ArchitecturePanel.createOrShow(context.extensionUri, snapshot);
        } else {
          vscode.window
            .showInformationMessage(
              `Architecture map ready for ${snapshot.name}`,
              'Open Map'
            )
            .then((choice) => {
              if (choice === 'Open Map') {
                ArchitecturePanel.createOrShow(context.extensionUri, snapshot);
              }
            });
        }
      } catch (err) {
        Logger.error('Analysis failed', err);
        statusBarItem.text = '$(hubot) AI Map';
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`AI analysis failed: ${msg}`);
      }
    }
  );
}

function openMap(context: vscode.ExtensionContext): void {
  if (currentSnapshot) {
    ArchitecturePanel.createOrShow(context.extensionUri, currentSnapshot);
  } else {
    void runAnalysis(context, true);
  }
}

async function explainCurrentFile(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Open a file first.');
    return;
  }

  const apiKey = await getOrPromptApiKey(context);
  if (!apiKey) {
    vscode.window.showWarningMessage('API key required for AI explanations.');
    return;
  }

  const config = vscode.workspace.getConfiguration('aiCodebaseMapper');
  const client = createAIClient(apiKey, config);
  const doc = editor.document;
  const rel = vscode.workspace.asRelativePath(doc.uri);
  let content = doc.getText();
  content = redactSecrets(content);

  const fileMeta = currentSnapshot?.files.find(f => f.relativePath === rel);
  const imports = fileMeta?.imports || [];
  const exports = fileMeta?.exports || [];
  const dependents =
    currentSnapshot?.dependencies
      .filter(d => d.target === rel && !d.isExternal)
      .map(d => d.source) || [];

  const projectContext =
    currentSnapshot?.analysis?.summary ||
    currentSnapshot?.analysis?.projectType ||
    'No prior analysis';

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Explaining file with AI...',
      cancellable: false
    },
    async () => {
      try {
        const explanation = await client.explainFile(
          rel,
          content,
          imports,
          exports,
          dependents,
          projectContext
        );
        const panel = vscode.window.createWebviewPanel(
          'aiExplain',
          `Explain: ${path.basename(rel)}`,
          vscode.ViewColumn.Beside,
          { enableScripts: false }
        );
        panel.webview.html = `<!DOCTYPE html>
<html><head><style>
  body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
  h1 { font-size: 16px; } pre, code { font-family: var(--vscode-editor-font-family); }
  h2 { font-size: 14px; margin-top: 16px; }
</style></head>
<body><h1>${escapeHtml(rel)}</h1><div>${markdownToSimpleHtml(explanation)}</div></body></html>`;
      } catch (err) {
        Logger.error('Explain failed', err);
        vscode.window.showErrorMessage(
          `Explain failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  );
}

async function showDeps(outgoing: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !currentSnapshot) {
    vscode.window.showWarningMessage(
      'Analyze the project first, then open a file.'
    );
    return;
  }
  const rel = vscode.workspace.asRelativePath(editor.document.uri);
  const deps = currentSnapshot.dependencies.filter(d =>
    outgoing ? d.source === rel : d.target === rel
  );
  if (deps.length === 0) {
    vscode.window.showInformationMessage(
      outgoing ? 'No outgoing dependencies found.' : 'No dependents found.'
    );
    return;
  }
  const items = deps.map(d => ({
    label: outgoing ? d.target : d.source,
    description: d.type + (d.isExternal ? ' (external)' : '')
  }));
  const picked = await vscode.window.showQuickPick(items, {
    title: outgoing ? 'Dependencies' : 'Dependents',
    placeHolder: 'Select a file to open'
  });
  if (picked) {
    const targetPath = path.join(currentSnapshot.rootPath, picked.label);
    try {
      const doc = await vscode.workspace.openTextDocument(targetPath);
      await vscode.window.showTextDocument(doc);
    } catch {
      // external package
      vscode.window.showInformationMessage(`${picked.label} (external package)`);
    }
  }
}

async function askAI(context: vscode.ExtensionContext): Promise<void> {
  if (!currentSnapshot) {
    vscode.window.showWarningMessage('Analyze the project first.');
    return;
  }
  const apiKey = await getOrPromptApiKey(context);
  if (!apiKey) {
    vscode.window.showWarningMessage('API key required.');
    return;
  }

  const question = await vscode.window.showInputBox({
    prompt: 'Ask a question about this codebase',
    placeHolder: 'Where is authentication implemented?',
    ignoreFocusOut: true
  });
  if (!question) {
    return;
  }

  const config = vscode.workspace.getConfiguration('aiCodebaseMapper');
  const client = createAIClient(apiKey, config);
  const summary =
    currentSnapshot.analysis?.summary ||
    `${currentSnapshot.analysis?.projectType || 'Project'} using ${(
      currentSnapshot.analysis?.technologies || []
    ).join(', ')}`;

  // Pick relevant files by simple keyword overlap
  const qLower = question.toLowerCase();
  const scored = currentSnapshot.files
    .map(f => {
      let score = 0;
      if (f.relativePath.toLowerCase().includes(qLower.split(/\s+/)[0])) score += 3;
      for (const word of qLower.split(/\s+/)) {
        if (word.length > 3 && f.relativePath.toLowerCase().includes(word)) score += 1;
      }
      if (f.isEntryPoint) score += 1;
      return { f, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const relevant = scored.map(({ f }) => ({
    path: f.relativePath,
    preview: f.contentPreview
  }));

  // Always include entry points if few results
  if (relevant.length < 3) {
    for (const f of currentSnapshot.files.filter(x => x.isEntryPoint).slice(0, 3)) {
      if (!relevant.find(r => r.path === f.relativePath)) {
        relevant.push({ path: f.relativePath, preview: f.contentPreview });
      }
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Asking AI about the project...',
      cancellable: false
    },
    async () => {
      try {
        const answer = await client.chat(question, summary, relevant);
        const panel = vscode.window.createWebviewPanel(
          'aiChat',
          'AI Codebase Chat',
          vscode.ViewColumn.Beside,
          { enableScripts: false }
        );
        panel.webview.html = `<!DOCTYPE html>
<html><head><style>
  body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.5; }
  .q { opacity: 0.7; margin-bottom: 12px; }
  h1 { font-size: 15px; }
</style></head>
<body>
  <h1>AI Codebase Chat</h1>
  <div class="q"><strong>Q:</strong> ${escapeHtml(question)}</div>
  <div>${markdownToSimpleHtml(answer)}</div>
</body></html>`;
      } catch (err) {
        Logger.error('Chat failed', err);
        vscode.window.showErrorMessage(
          `AI chat failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToSimpleHtml(md: string): string {
  // Minimal markdown: headers, bold, code, lists, paragraphs
  let html = escapeHtml(md);
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  return html;
}
