import * as vscode from 'vscode';

const OUTPUT_CHANNEL = vscode.window.createOutputChannel('AI Codebase Mapper');

export class Logger {
  static info(message: string, ...args: unknown[]): void {
    const msg = format(message, args);
    OUTPUT_CHANNEL.appendLine(`[INFO] ${msg}`);
  }

  static warn(message: string, ...args: unknown[]): void {
    const msg = format(message, args);
    OUTPUT_CHANNEL.appendLine(`[WARN] ${msg}`);
  }

  static error(message: string, err?: unknown): void {
    const extra = err instanceof Error ? err.message : err ? String(err) : '';
    OUTPUT_CHANNEL.appendLine(`[ERROR] ${message}${extra ? ': ' + extra : ''}`);
    if (err instanceof Error && err.stack) {
      OUTPUT_CHANNEL.appendLine(err.stack);
    }
  }

  static show(): void {
    OUTPUT_CHANNEL.show(true);
  }
}

function format(message: string, args: unknown[]): string {
  if (args.length === 0) {
    return message;
  }
  return `${message} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`;
}
