import { beforeEach, describe, expect, it } from 'bun:test';

import { Client } from 'discordx';

import { getReplyContent, mockChatInputInteraction } from '../helpers/mock-interaction.js';

// We need to test HelpCommand, but it uses Client.applicationCommandSlashes (static).
// We'll mock that getter before each test.
describe('HelpCommand', () => {
  let HelpCommand: any;

  beforeEach(async () => {
    // Import fresh module each time to avoid stale state
    const mod = await import('../../src/commands/help.js');
    HelpCommand = mod.HelpCommand;
  });

  it('lists all commands when no specific command is given', async () => {
    // Mock the static getter
    const originalGetter = Object.getOwnPropertyDescriptor(Client, 'applicationCommandSlashes');
    Object.defineProperty(Client, 'applicationCommandSlashes', {
      get: () => [
        { name: 'ping', description: 'Replies with Pong!', options: [] },
        { name: 'help', description: 'View all available commands', options: [] },
      ],
      configurable: true,
    });

    try {
      const cmd = new HelpCommand();
      const interaction = mockChatInputInteraction();

      await cmd.help(null, interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const reply = getReplyContent(interaction);
      expect(reply?.content).toBeUndefined(); // no content, only embeds
      expect(reply?.embeds).toHaveLength(1);
    } finally {
      // Restore original
      if (originalGetter) {
        Object.defineProperty(Client, 'applicationCommandSlashes', originalGetter);
      }
    }
  });

  it('shows specific command help when command name is provided', async () => {
    const originalGetter = Object.getOwnPropertyDescriptor(Client, 'applicationCommandSlashes');
    Object.defineProperty(Client, 'applicationCommandSlashes', {
      get: () => [
        {
          name: 'ping',
          description: 'Replies with Pong!',
          options: [
            {
              name: 'verbose',
              description: 'Show verbose output',
              required: false,
              toJSON: () => ({ name: 'verbose', description: 'Show verbose output', required: false }),
            },
          ],
        },
      ],
      configurable: true,
    });

    try {
      const cmd = new HelpCommand();
      const interaction = mockChatInputInteraction();

      await cmd.help('ping', interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const reply = getReplyContent(interaction);
      expect(reply?.embeds).toHaveLength(1);
    } finally {
      if (originalGetter) {
        Object.defineProperty(Client, 'applicationCommandSlashes', originalGetter);
      }
    }
  });

  it('replies with error for unknown command', async () => {
    const originalGetter = Object.getOwnPropertyDescriptor(Client, 'applicationCommandSlashes');
    Object.defineProperty(Client, 'applicationCommandSlashes', {
      get: () => [],
      configurable: true,
    });

    try {
      const cmd = new HelpCommand();
      const interaction = mockChatInputInteraction();

      await cmd.help('nonexistent', interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const reply = getReplyContent(interaction);
      expect(reply?.content).toContain('not found');
    } finally {
      if (originalGetter) {
        Object.defineProperty(Client, 'applicationCommandSlashes', originalGetter);
      }
    }
  });
});
