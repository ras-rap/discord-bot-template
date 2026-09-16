import { importx } from '@discordx/importer';
import { Events, REST, Routes } from 'discord.js';
import { Client } from 'discordx';
import { readFile } from 'fs/promises';

import { ensureDotenv, openEnvironmentEditor } from './cli/env.js';
import { client } from './client.js';
import {
  AUTO_REGISTER_COMMANDS,
  DISCORD_CLIENT_ID,
  DISCORD_DEVELOPMENT_GUILD_ID,
  DISCORD_TOKEN,
  NODE_ENV,
} from './utils/env.js';
import { logger } from './utils/logger.js';

const deployCommands = async () => {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = Client.applicationCommandSlashes.map(cmd => cmd.toJSON());

  const isGlobal = NODE_ENV === 'production';
  const route = isGlobal
    ? Routes.applicationCommands(DISCORD_CLIENT_ID)
    : Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_DEVELOPMENT_GUILD_ID);
  const label = isGlobal ? 'globally' : `guild ${DISCORD_DEVELOPMENT_GUILD_ID}`;

  try {
    await rest.put(route, { body: commands });
    logger.info(`Registered ${commands.length} command(s) ${label}`);
  } catch (error: any) {
    logger.error(
      { statusCode: error.status, code: error.code, errors: error.errors, message: error.message },
      'Failed to register commands',
    );
  }
};

async function main() {
  try {
    // Ensure .env exists — prompt editor if missing or has placeholders
    const envReady = await ensureDotenv();
    if (!envReady) {
      await openEnvironmentEditor();
      // Bun loaded the old/missing .env at startup — reload vars from disk
      const envContent = await readFile('.env', 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
      }
    }

    // Import all decorated classes (commands, events, guards)
    await importx(`${import.meta.dirname}/{commands,events,guards}/**/*.ts`);

    // Initialize DiscordX
    await client.build();

    // Route incoming interactions to decorated handlers
    client.on(Events.InteractionCreate, interaction => {
      client.executeInteraction(interaction);
    });

    // Auto-register commands if enabled
    if (AUTO_REGISTER_COMMANDS) {
      await deployCommands();
    }

    // Connect to Discord
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
