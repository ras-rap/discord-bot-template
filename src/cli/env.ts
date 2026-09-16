import { execFile as execFileCallback, spawn } from 'child_process';
import { access, constants, readFile, writeFile } from 'fs/promises';
import { EOL } from 'os';
import { basename } from 'path';
import util from 'util';

import { logger } from '../utils/logger.js';

const execFile = util.promisify(execFileCallback);

type EditorLaunch = {
  file: string;
  args: string[];
  attachTerminal: boolean;
};

const TERMINAL_EDITORS = new Set(['nano', 'vim', 'vi', 'nvim', 'emacs']);

const ENV_VARS = {
  DISCORD_TOKEN: undefined as string | undefined,
  DISCORD_CLIENT_ID: undefined as string | undefined,
  DISCORD_DEVELOPMENT_GUILD_ID: undefined as string | undefined,
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  AUTO_REGISTER_COMMANDS: '',
} as const;

const REQUIRED_VARS = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_DEVELOPMENT_GUILD_ID'] as const;
type EnvKey = keyof typeof ENV_VARS;

const parseEditorCommand = (editor: string): { file: string; args: string[] } | null => {
  const tokens = editor.trim().split(/\s+/).filter(Boolean);
  const [file, ...args] = tokens;
  if (!file) return null;
  return { file, args };
};

const isTerminalEditorFile = (file: string): boolean =>
  TERMINAL_EDITORS.has(
    basename(file)
      .toLowerCase()
      .replace(/\.exe$/, ''),
  );

const getEditorLaunches = (editor: string): EditorLaunch[] => {
  const parsed = parseEditorCommand(editor);
  if (!parsed) return [];

  const { file, args } = parsed;

  if (file.toLowerCase() === 'start' && process.platform === 'win32')
    return [{ file: 'cmd', args: ['/c', 'start', '', '.env'], attachTerminal: false }];

  if (file === 'xdg-open') return [{ file, args: [...args, '.env'], attachTerminal: false }];

  if (isTerminalEditorFile(file))
    return [
      { file: 'gnome-terminal', args: ['--', file, ...args, '.env'], attachTerminal: false },
      { file: 'xterm', args: ['-e', file, ...args, '.env'], attachTerminal: false },
      { file: 'konsole', args: ['-e', file, ...args, '.env'], attachTerminal: false },
      { file, args: [...args, '.env'], attachTerminal: true },
    ];

  return [{ file, args: [...args, '.env'], attachTerminal: false }];
};

const runEditorLaunch = async (launch: EditorLaunch): Promise<void> => {
  if (launch.attachTerminal)
    await new Promise<void>((resolve, reject) => {
      const child = spawn(launch.file, launch.args, { cwd: process.cwd(), shell: false });
      child.on('error', reject);
      child.on('exit', (code, signal) => {
        if (signal) reject(new Error(`Editor terminated with signal ${signal}`));
        else if (code === 0) resolve();
        else reject(new Error(`Editor exited with code ${code ?? 'unknown'}`));
      });
    });
  else await execFile(launch.file, launch.args, { cwd: process.cwd(), shell: false });
};

const launchEditorWithFallbacks = async (editor: string): Promise<void> => {
  const launches = getEditorLaunches(editor);
  if (launches.length === 0) throw new Error(`Invalid editor: ${editor}`);

  let lastError: unknown;
  for (const launch of launches) {
    try {
      await runEditorLaunch(launch);
      return;
    } catch (err) {
      lastError = err;
      if ((err as { code?: string })?.code !== 'ENOENT') throw err;
    }
  }

  throw lastError;
};

const isEditorAvailable = async (editor: string): Promise<boolean> => {
  try {
    const parsed = parseEditorCommand(editor);
    if (!parsed) return false;
    if (parsed.file.toLowerCase() === 'start') return process.platform === 'win32';
    const checkCommand = process.platform === 'win32' ? 'where' : 'which';
    await execFile(checkCommand, [parsed.file], { cwd: process.cwd(), shell: false });
    return true;
  } catch {
    return false;
  }
};

const getAvailableEditors = async (): Promise<string[]> => {
  const candidates: string[] = [];
  const { EDITOR, VISUAL } = process.env;

  if (EDITOR) candidates.push(EDITOR);
  if (VISUAL) candidates.push(VISUAL);

  if (process.platform === 'win32') candidates.push('notepad', 'code', 'subl', 'atom', 'notepad++', 'start ""');
  else if (process.platform === 'darwin')
    candidates.push('code', 'subl', 'atom', 'nano', 'vim', 'nvim', 'emacs', 'open', 'gedit', 'kate');
  else
    candidates.push(
      'code',
      'subl',
      'atom',
      'nano',
      'vim',
      'vi',
      'nvim',
      'emacs',
      'gedit',
      'kate',
      'mousepad',
      'leafpad',
      'xdg-open',
    );

  const available: string[] = [];
  for (const editor of new Set(candidates)) {
    if (await isEditorAvailable(editor)) available.push(editor);
  }
  return available;
};

const selectEditor = async (editors: string[]): Promise<string> => {
  logger.info(`\n📝 Multiple text editors detected. Please select one:`);
  editors.forEach((editor, index) => logger.info(`  ${index + 1}. ${editor}`));
  logger.info(`\nEnter the number of your choice (or press Ctrl+C to cancel): `);

  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    rl.on('close', () => {
      if (!settled) reject(new Error('Editor selection cancelled'));
    });
    rl.on('SIGINT', () => {
      settled = true;
      rl.close();
      reject(new Error('Editor selection interrupted'));
    });
    rl.on('line', input => {
      const selected = editors[Number.parseInt(input.trim(), 10) - 1];
      if (selected) {
        settled = true;
        rl.close();
        resolve(selected);
      } else logger.warn(`Invalid choice. Enter a number between 1 and ${editors.length}: `);
    });
  });
};

export const openEnvironmentEditor = async (): Promise<void> => {
  const availableEditors = await getAvailableEditors();
  const [fallback] = availableEditors;

  if (!fallback) {
    logger.error('No text editor found. Please set the EDITOR or VISUAL environment variable.');
    process.exit(1);
  }

  const editor = availableEditors.length > 1 ? await selectEditor(availableEditors) : fallback;

  try {
    await launchEditorWithFallbacks(editor);
  } catch (error) {
    logger.error(`Failed to open editor "${editor}": ${(error as Error).message}`);
    process.exit(1);
  }
};

const PLACEHOLDER_PATTERN = /your_.*_here/i;

export const hasPlaceholderValues = async (): Promise<boolean> => {
  try {
    const content = await readFile('.env', 'utf-8');
    return PLACEHOLDER_PATTERN.test(content);
  } catch {
    return false;
  }
};

export const ensureDotenv = async (): Promise<boolean> => {
  try {
    await access('.env', constants.F_OK);

    // .env exists — check if it still has placeholder values
    if (await hasPlaceholderValues()) {
      logger.warn('.env contains placeholder values and needs to be configured.');
      return false;
    }

    return true;
  } catch {
    // .env doesn't exist — copy from .env.example
    try {
      const template = await readFile('.env.example', 'utf-8');
      await writeFile('.env', template, 'utf-8');
      logger.info('Created .env from .env.example template.');
    } catch {
      // Fallback to hardcoded defaults if .env.example is missing
      const content = Object.entries(ENV_VARS)
        .map(([key, defaultValue]) => `${key}=${defaultValue ?? ''}`)
        .join(EOL);
      await writeFile('.env', content, 'utf-8');
      logger.info('Created .env file with default values.');
    }
    return false;
  }
};

export const validateEnvironment = (): boolean => {
  const missing = REQUIRED_VARS.filter(key => !process.env[key]);
  if (missing.length === 0) return true;

  logger.error(`Missing required environment variables: ${missing.join(', ')}`);
  logger.info('Run `bun run commands env` to set up your environment.');
  return false;
};
