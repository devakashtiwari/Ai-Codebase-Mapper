import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectSnapshot } from '../models/Project';
import { Logger } from '../utils/logger';

export async function handleWebviewMessage(
  message: { type: string; path?: string; question?: string; payload?: unknown },
  webview: vscode.Webview,
  snapshot: ProjectSnapshot | undefined
): Promise<void> {
  switch (message.type) {
    case 'openFile': {
      if (!message.path || !snapshot) {
        return;
      }
      const abs = path.isAbsolute(message.path)
        ? message.path
        : path.join(snapshot.rootPath, message.path);
      try {
        const uri = vscode.Uri.file(abs);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (err) {
        Logger.error('Failed to open file', err);
        vscode.window.showWarningMessage(`Could not open file: ${message.path}`);
      }
      break;
    }
    case 'ready': {
      // Webview loaded; host can re-send snapshot if needed
      break;
    }
    case 'refresh': {
      await vscode.commands.executeCommand('aiCodebaseMapper.refreshAnalysis');
      break;
    }
    case 'askAI': {
      // Handled by extension command primarily
      break;
    }
    default:
      Logger.info('Unknown webview message', message.type);
  }
}
