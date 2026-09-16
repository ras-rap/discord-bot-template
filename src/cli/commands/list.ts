import { importx } from '@discordx/importer';
import { REST, Routes } from 'discord.js';
import { Client } from 'discordx';

import { DISCORD_CLIENT_ID, DISCORD_DEVELOPMENT_GUILD_ID, DISCORD_TOKEN, NODE_ENV } from '../../utils/env.js';
import { logger } from '../../utils/logger.js';

import type { DeployScope } from './registry.js';

interface Flags {
  scope?: DeployScope | undefined;
}

// Import all decorated command classes
await importx(`${import.meta.dirname}/../../../{commands,guards}/**/*.ts`);

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const resolveScope = (override?: DeployScope): DeployScope => {
  if (override !== undefined) return override;
  return NODE_ENV === 'production' ? 'global' : 'guild';
};

const getRoute = (scope: DeployScope) =>
  scope === 'guild'
    ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_DEVELOPMENT_GUILD_ID)
    : Routes.applicationCommands(DISCORD_CLIENT_ID);

export const list = async (flags: Flags): Promise<void> => {
  const scope = resolveScope(flags.scope);
  const route = getRoute(scope);

  // Get local commands from DiscordX's static registry
  const local = Client.applicationCommandSlashes
    .map(cmd => cmd.toJSON())
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  let remote: any[] = [];
  try {
    const response = await rest.get(route);
    if (Array.isArray(response)) remote = response;
  } catch {
    logger.warn('Could not fetch remote commands');
  }

  const localNames = new Set(local.map((c: any) => c.name));
  const remoteNames = new Set(remote.map((c: any) => c.name));
  const remoteByName = new Map(remote.map((c: any) => [c.name, c]));

  const added = local.filter((c: any) => !remoteNames.has(c.name)).map((c: any) => c.name);
  const removed = remote.filter((c: any) => !localNames.has(c.name)).map((c: any) => c.name);
  const modified: string[] = [];
  const unchanged: string[] = [];

  for (const cmd of local) {
    const existing = remoteByName.get((cmd as any).name);
    if (!existing) continue;
    if (JSON.stringify(cmd) === JSON.stringify(existing)) unchanged.push((cmd as any).name);
    else modified.push((cmd as any).name);
  }

  if (added.length > 0) logger.info({ commands: added }, 'New (will be added)');
  if (removed.length > 0) logger.info({ commands: removed }, 'Stale (will be removed)');
  if (modified.length > 0) logger.info({ commands: modified }, 'Modified (will be updated)');
  if (unchanged.length > 0) logger.info({ commands: unchanged }, 'Unchanged');

  const changes = added.length + removed.length + modified.length;
  if (changes === 0) logger.info('✅ Local and remote commands are in sync.');
  else logger.info(`${changes} change(s) detected.`);
};
