import * as vscode from 'vscode';
import { ArchitectureAnalysis, ProjectAnalysisInput } from '../models/Architecture';
import { SYSTEM_PROMPT, buildAnalysisUserPrompt, buildExplainFilePrompt, buildChatPrompt } from './prompts';
import { parseArchitectureResponse } from './responseParser';
import { Logger } from '../utils/logger';

export interface AIProvider {
  analyzeProject(input: ProjectAnalysisInput): Promise<ArchitectureAnalysis>;
  explainFile(
    filePath: string,
    content: string,
    imports: string[],
    exports: string[],
    dependents: string[],
    projectContext: string
  ): Promise<string>;
  chat(
    question: string,
    projectSummary: string,
    relevantFiles: Array<{ path: string; preview?: string }>
  ): Promise<string>;
}

export class OpenAICompatibleClient implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async analyzeProject(input: ProjectAnalysisInput): Promise<ArchitectureAnalysis> {
    const userPrompt = buildAnalysisUserPrompt(input);
    const raw = await this.chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      0.2,
      true
    );
    return parseArchitectureResponse(raw);
  }

  async explainFile(
    filePath: string,
    content: string,
    imports: string[],
    exports: string[],
    dependents: string[],
    projectContext: string
  ): Promise<string> {
    const prompt = buildExplainFilePrompt(
      filePath,
      content,
      imports,
      exports,
      dependents,
      projectContext
    );
    return this.chatCompletion(
      [
        {
          role: 'system',
          content: 'You are a senior software engineer explaining code clearly and concisely.'
        },
        { role: 'user', content: prompt }
      ],
      0.3,
      false
    );
  }

  async chat(
    question: string,
    projectSummary: string,
    relevantFiles: Array<{ path: string; preview?: string }>
  ): Promise<string> {
    const prompt = buildChatPrompt(question, projectSummary, relevantFiles);
    return this.chatCompletion(
      [
        {
          role: 'system',
          content: 'You are an expert assistant for this specific codebase.'
        },
        { role: 'user', content: prompt }
      ],
      0.4,
      false
    );
  }

  private async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    temperature: number,
    preferJson: boolean
  ): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature
    };
    // Only request JSON mode for architecture analysis; many compatible
    // endpoints reject response_format on non-JSON chat calls.
    if (preferJson) {
      body.response_format = { type: 'json_object' };
    }

    try {
      let res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      // Retry once without response_format if the provider rejects it
      if (!res.ok && preferJson && (res.status === 400 || res.status === 422)) {
        delete body.response_format;
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        if (res.status === 401) {
          throw new Error(
            'Invalid API key. Please update your AI Codebase Mapper API key.'
          );
        }
        throw new Error(`AI API error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }
      return content;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(
          'AI request timed out. Try again or reduce project size.'
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

const SECRET_KEY = 'aiCodebaseMapper.apiKey';

export async function getOrPromptApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  let key = await context.secrets.get(SECRET_KEY);
  if (key) {
    return key;
  }

  key = await vscode.window.showInputBox({
    prompt: 'Enter your OpenAI (or compatible) API key',
    password: true,
    placeHolder: 'sk-...',
    ignoreFocusOut: true
  });

  if (key) {
    await context.secrets.store(SECRET_KEY, key);
    vscode.window.showInformationMessage('API key saved securely in VS Code Secret Storage.');
  }
  return key;
}

export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SECRET_KEY);
}

export function createAIClient(
  apiKey: string,
  config: vscode.WorkspaceConfiguration
): AIProvider {
  const baseUrl = config.get<string>('apiBaseUrl') || 'https://api.openai.com/v1';
  const model = config.get<string>('model') || 'gpt-4o-mini';
  return new OpenAICompatibleClient(apiKey, baseUrl, model);
}
