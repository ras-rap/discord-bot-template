import { REST, Routes } from 'discord.js';

import { DISCORD_CLIENT_ID, DISCORD_DEVELOPMENT_GUILD_ID, DISCORD_TOKEN, NODE_ENV } from '../../utils/env.js';
import { logger } from '../../utils/logger.js';

import type { DeployScope } from './registry.js';

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const resolveScope = (override?: DeployScope): DeployScope => {
  if (override !== undefined) return override;
  return NODE_ENV === 'production' ? 'global' : 'guild';
};

const getRoute = (scope: DeployScope) =>
  scope === 'guild'
    ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_DEVELOPMENT_GUILD_ID)
    : Routes.applicationCommands(DISCORD_CLIENT_ID);

export const clear = async (scope?: DeployScope): Promise<void> => {
  const resolved = resolveScope(scope);
  const route = getRoute(resolved);
  const label = resolved === 'guild' ? `from guild ${DISCORD_DEVELOPMENT_GUILD_ID}` : 'globally';

  try {
    await rest.put(route, { body: [] });
    logger.info(`✅ Cleared all commands ${label}`);
  } catch (error) {
    logger.error({ error }, '❌ Failed to clear commands');
  }
};
