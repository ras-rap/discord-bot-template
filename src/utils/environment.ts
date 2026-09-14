import { execFile as execFileCallback, spawn } from 'child_process';
import { access, constants, readFile, writeFile } from 'fs/promises';
import { EOL } from 'os';
import { basename } from 'path';
import util from 'util';

import { logger } from '@utils/logger';

const execFile = util.promisify(execFileCallback);

type EditorLaunch = {
  file: string;
  args: string[];
  attachTerminal: boolean;
};

const TERMINAL_EDITORS = new Set(['nano', 'vim', 'vi', 'nvim', 'emacs']);

/**
 * Mapping of environment variable keys to their default values.
 * Undefined values are required, empty strings are optional.
 */
const ENV_VARS = {
  'DISCORD_TOKEN': undefined,
  'DISCORD_CLIENT_ID': undefined,
  'DISCORD_DEVELOPMENT_GUILD_ID': undefined,
  'MONGODB_URI': '',
  'MONGODB_DB_NAME': '',
  'REDIS_URL': '',
  'NODE_ENV': 'development',
  'LOG_LEVEL': 'info',
  'AUTO_REGISTER_COMMANDS': '',
} as const;

const REQUIRED_VARS: EnvKey[] = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_DEVELOPMENT_GUILD_ID'];

type EnvKey = keyof typeof ENV_VARS;

export type AppConfig = { [K in EnvKey]: string };

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
    return [{ 'file': 'cmd', 'args': ['/c', 'start', '', '.env'], 'attachTerminal': false }];

  if (file === 'xdg-open') return [{ file, 'args': [...args, '.env'], 'attachTerminal': false }];

  if (isTerminalEditorFile(file))
    return [
      { 'file': 'gnome-terminal', 'args': ['--', file, ...args, '.env'], 'attachTerminal': false },
      { 'file': 'xterm', 'args': ['-e', file, ...args, '.env'], 'attachTerminal': false },
      { 'file': 'konsole', 'args': ['-e', file, ...args, '.env'], 'attachTerminal': false },
      { file, 'args': [...args, '.env'], 'attachTerminal': true },
    ];

  return [{ file, 'args': [...args, '.env'], 'attachTerminal': false }];
};

const runEditorLaunch = async (launch: EditorLaunch): Promise<void> => {
  if (launch.attachTerminal)
    await new Promise<void>((resolve, reject) => {
      const child = spawn(launch.file, launch.args, {
        'cwd': process.cwd(),
        'shell': false,
      });
      child.on('error', reject);
      child.on('exit', (code, signal) => {
        if (signal) reject(new Error(`Editor terminated with signal ${signal}`));
        else if (code === 0) resolve();
        else reject(new Error(`Editor exited with code ${code ?? 'unknown'}`));
      });
    });
  else await execFile(launch.file, launch.args, { 'cwd': process.cwd(), 'shell': false });
};

const launchEditorWithFallbacks = async (editor: string): Promise<void> => {
  const launches = getEditorLaunches(editor);
  if (launches.length === 0) throw new Error(`Invalid editor: ${editor}`);

  let lastError: unknown;
  for (const launch of launches)
    try {
      await runEditorLaunch(launch);
      return;
    } catch (err) {
      lastError = err;
      const code = (err as { code?: string } | undefined)?.code;
      if (code !== 'ENOENT') throw err;
    }

  throw lastError;
};

const isEditorAvailable = async (editor: string): Promise<boolean> => {
  try {
    const parsed = parseEditorCommand(editor);
    if (!parsed) return false;

    if (parsed.file.toLowerCase() === 'start') return process.platform === 'win32';

    const checkCommand = process.platform === 'win32' ? 'where' : 'which';
    await execFile(checkCommand, [parsed.file], { 'cwd': process.cwd(), 'shell': false });
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
  for (const editor of new Set(candidates)) if (await isEditorAvailable(editor)) available.push(editor);

  return available;
};

const selectEditor = async (editors: string[]): Promise<string> => {
  logger.info(
    `\n📝 Multiple text editors detected. Please select one:\n${editors.map((editor, index) => `  ${index + 1}. ${editor}`).join('\n')}\n\nEnter the number of your choice (or press Ctrl+C to cancel): `,
  );

  const { createInterface } = await import('readline');
  const rl = createInterface({
    'input': process.stdin,
    'output': process.stdout,
  });

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

const openEnvironmentEditor = async (): Promise<void> => {
  const availableEditors = await getAvailableEditors();
  const [fallback] = availableEditors;

  if (!fallback) {
    logger.error('No text editors found on the system');
    return;
  }

  let selectedEditor = fallback;

  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (availableEditors.length > 1 && isInteractive)
    try {
      selectedEditor = await selectEditor(availableEditors);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ message }, 'Editor selection failed');
      return;
    }

  try {
    await launchEditorWithFallbacks(selectedEditor);
    logger.info({ 'editor': selectedEditor }, 'Opened .env');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ 'editor': selectedEditor, message }, 'Failed to open .env with editor');
  }
};

const ensureEnvFileExists = async (): Promise<void> => {
  try {
    await access('.env', constants.F_OK);

    logger.info('.env file already exists');
  } catch {
    logger.warn('.env not found; creating one now');

    let content: string;

    try {
      content = await readFile('.env.example', 'utf-8');
      logger.info('Copied .env.example contents to .env');
    } catch {
      logger.warn('.env.example not found; generating template');

      const lines = (Object.keys(ENV_VARS) as EnvKey[]).map(key => `${key}=${EOL}`).join('');

      content = `# Environment variables${EOL}${lines}`;
      logger.debug({ 'keys': Object.keys(ENV_VARS) }, 'Template variables');
    }

    await writeFile('.env', content, 'utf-8');

    logger.info('.env file created');
  }
};

const getValidatedConfig = (): AppConfig => {
  logger.debug('Validating environment variables');

  const config: Partial<Record<EnvKey, string>> = {};
  const missing: EnvKey[] = [];

  for (const key of Object.keys(ENV_VARS) as EnvKey[]) {
    const raw = process.env[key];
    const hasRaw = raw !== undefined && raw.length > 0;
    const defaultValue = ENV_VARS[key];
    const value = hasRaw ? raw : defaultValue;

    logger.debug({ key, raw, defaultValue, value }, 'Resolved env var');

    if (value && value.length > 0) config[key] = value;
    else if (REQUIRED_VARS.includes(key)) missing.push(key);
    else config[key] = '';
  }

  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables');

    throw new Error(`Missing required variables: ${missing.join(', ')}`);
  }

  logger.info('All required environment variables are present');

  return config as AppConfig;
};

const initConfig = async (): Promise<AppConfig> => {
  logger.debug('Initializing configuration');

  try {
    await ensureEnvFileExists();
    const cfg = getValidatedConfig();

    logger.info('Configuration loaded successfully');

    return cfg;
  } catch (err) {
    logger.error({ err }, 'Failed to load configuration');
    if (process.env.NODE_ENV !== 'production') await openEnvironmentEditor();

    process.exit(1);
  }
};

const config = await initConfig();

export const DISCORD_TOKEN = config.DISCORD_TOKEN;
export const DISCORD_CLIENT_ID = config.DISCORD_CLIENT_ID;
export const DISCORD_DEVELOPMENT_GUILD_ID = config.DISCORD_DEVELOPMENT_GUILD_ID;
export const MONGODB_URI = config.MONGODB_URI || undefined;
export const MONGODB_DB_NAME = config.MONGODB_DB_NAME || undefined;
export const REDIS_URL = config.REDIS_URL || undefined;
export const NODE_ENV = config.NODE_ENV;
export const LOG_LEVEL = config.LOG_LEVEL;
export const AUTO_REGISTER_COMMANDS =
  config.AUTO_REGISTER_COMMANDS.toLowerCase() === 'true' ||
  (config.AUTO_REGISTER_COMMANDS === '' && config.NODE_ENV !== 'production');
