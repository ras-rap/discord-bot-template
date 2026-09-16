import { importx } from '@discordx/importer';
import { REST, Routes } from 'discord.js';
import { Client } from 'discordx';

import { DISCORD_CLIENT_ID, DISCORD_DEVELOPMENT_GUILD_ID, DISCORD_TOKEN, NODE_ENV } from '../../utils/env.js';
import { logger } from '../../utils/logger.js';

import type { DeployScope } from './registry.js';

interface Flags {
  scope?: DeployScope | undefined;
  force: boolean;
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

export const deploy = async (flags: Flags): Promise<void> => {
  const scope = resolveScope(flags.scope);
  const route = getRoute(scope);

  // Get commands from DiscordX's static registry
  const commands = Client.applicationCommandSlashes.map(cmd => cmd.toJSON());
  const label = scope === 'guild' ? `to guild ${DISCORD_DEVELOPMENT_GUILD_ID}` : 'globally';

  try {
    await rest.put(route, { body: commands });
    logger.info(`✅ Registered ${commands.length} command(s) ${label}`);
  } catch (error) {
    logger.error({ error }, '❌ Failed to register commands');
    process.exit(1);
  }
};
