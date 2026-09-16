import { logger } from '../utils/logger.js';
import { ensureDotenv, openEnvironmentEditor } from './env.js';

const SUBCOMMANDS = ['env', 'deploy', 'clear', 'list'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const isSubcommand = (value: string): value is Subcommand => (SUBCOMMANDS as readonly string[]).includes(value);

const printUsage = () => {
  logger.info('Usage: bun run commands <subcommand>\n');
  logger.info('Subcommands:');
  logger.info('  env      Create .env file and open it in your editor');
  logger.info('  deploy   Deploy slash commands to Discord');
  logger.info('  clear    Remove all registered commands from Discord');
  logger.info('  list     Compare local commands against registered commands\n');
  logger.info('Flags:');
  logger.info('  --global   Force global scope (production)');
  logger.info('  --guild    Force guild scope (development)');
  logger.info('  --force    Skip change detection and force deploy');
};

const args = process.argv.slice(2);
const subcommand = args[0];

if (subcommand === undefined || !isSubcommand(subcommand)) {
  printUsage();
  process.exit(subcommand === undefined ? 0 : 1);
}

const hasFlag = (flag: string) => args.includes(flag);

if (hasFlag('--global') && hasFlag('--guild')) {
  logger.error('Cannot specify both --global and --guild');
  process.exit(1);
}

const scope = hasFlag('--global') ? 'global' : hasFlag('--guild') ? 'guild' : undefined;
const force = hasFlag('--force');

switch (subcommand) {
  case 'env': {
    await ensureDotenv();
    await openEnvironmentEditor();
    break;
  }
  case 'deploy': {
    const { deploy } = await import('./commands/deploy.js');
    await deploy({ scope: scope as 'guild' | 'global' | undefined, force });
    break;
  }
  case 'clear': {
    const { clear } = await import('./commands/clear.js');
    await clear(scope as 'guild' | 'global' | undefined);
    break;
  }
  case 'list': {
    const { list } = await import('./commands/list.js');
    await list({ scope: scope as 'guild' | 'global' | undefined });
    break;
  }
}
