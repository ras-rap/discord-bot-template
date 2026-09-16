import { importx } from '@discordx/importer';

import { client } from './client.js';
import { DISCORD_TOKEN } from './utils/env.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Import all decorated classes (commands, events, guards)
    await importx(`${import.meta.dirname}/{commands,events,guards}/**/*.ts`);

    // Build the client (initializes all DiscordX systems)
    await client.build();

    // Start the bot
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    logger.fatal(error, 'Failed to start bot');
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('🔴 Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🔴 Shutting down...');
  client.destroy();
  process.exit(0);
});

main();
