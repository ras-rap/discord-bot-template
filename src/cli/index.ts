import { logger } from '@utils/logger';

import type { DeployScope } from '@typings/registry';

const SUBCOMMANDS = ['deploy', 'clear', 'list'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

const isSubcommand = (value: string): value is Subcommand => (SUBCOMMANDS as readonly string[]).includes(value);

const printUsage = () => {
  logger.info('Usage: bun run commands <subcommand>');
  logger.info('Subcommands:');
  logger.info('  deploy   Deploy slash commands to Discord');
  logger.info('  clear    Remove all registered commands from Discord');
  logger.info('  list     Compare local commands against registered commands');
  logger.info('Flags:');
  logger.info('  --global   Force global scope (production)');
  logger.info('  --guild    Force guild scope (development)');
  logger.info('  --force    Skip change detection and force deploy');
};

const args = process.argv.slice(2);
const subcommand = args[0];

if (subcommand === undefined || isSubcommand(subcommand) === false) {
  printUsage();
  process.exit(subcommand === undefined ? 0 : 1);
}

const hasFlag = (flag: string) => args.includes(flag);

if (hasFlag('--global') && hasFlag('--guild')) {
  logger.error('Cannot specify both --global and --guild');
  process.exit(1);
}

const scope: DeployScope | undefined = hasFlag('--global') ? 'global' : hasFlag('--guild') ? 'guild' : undefined;

const force = hasFlag('--force');

const handler = await import(`@cli/commands/${subcommand}`);
await handler.run({ scope, force });
