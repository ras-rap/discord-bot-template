import { describe, expect, it } from 'bun:test';

import { ExampleCommand } from '../../src/commands/example.js';

import {
  getReplyContent,
  mockButtonInteraction,
  mockChatInputInteraction,
  mockModalSubmitInteraction,
  mockStringSelectInteraction,
} from '../helpers/mock-interaction.js';

describe('ExampleCommand', () => {
  const cmd = new ExampleCommand();

  describe('show', () => {
    it('replies with usage info', async () => {
      const interaction = mockChatInputInteraction();

      await cmd.show(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      expect(getReplyContent(interaction)?.content).toContain('Example Command');
    });
  });

  describe('buttonSub', () => {
    it('replies with button components', async () => {
      const interaction = mockChatInputInteraction();

      await cmd.buttonSub(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const reply = getReplyContent(interaction);
      expect(reply?.components).toHaveLength(1);
    });
  });

  describe('modalSub', () => {
    it('shows a modal', async () => {
      const interaction = mockChatInputInteraction();

      await cmd.modalSub(interaction);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      expect(interaction.reply).not.toHaveBeenCalled();
    });
  });

  describe('selectSub', () => {
    it('replies with a string select menu', async () => {
      const interaction = mockChatInputInteraction();

      await cmd.selectSub(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const reply = getReplyContent(interaction);
      expect(reply?.components).toHaveLength(1);
    });
  });

  describe('userSelectSub', () => {
    it('replies with a user select menu', async () => {
      const interaction = mockChatInputInteraction();

      await cmd.userSelectSub(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });
  });

  describe('roleSelectSub', () => {
    it('replies with a role select menu', async () => {
      const interaction = mockChatInputInteraction();

      await cmd.roleSelectSub(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });
  });

  describe('channelSelectSub', () => {
    it('replies with a channel select menu', async () => {
      const interaction = mockChatInputInteraction();

      await cmd.channelSelectSub(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });
  });

  describe('exampleButton', () => {
    it('replies with button click confirmation', async () => {
      const interaction = mockButtonInteraction();

      await cmd.exampleButton(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      expect(getReplyContent(interaction)?.content).toBe('Button clicked!');
    });
  });

  describe('confirmRegex', () => {
    it('replies with regex match confirmation', async () => {
      const interaction = mockButtonInteraction();
      (interaction as any).customId = 'confirm_42';

      await cmd.confirmRegex(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      expect(getReplyContent(interaction)?.content).toContain('Regex-matched');
    });
  });

  describe('exampleSelect', () => {
    it('replies with selected values', async () => {
      const interaction = mockStringSelectInteraction(['option_1', 'option_3']);

      await cmd.exampleSelect(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      expect(getReplyContent(interaction)?.content).toContain('option_1');
      expect(getReplyContent(interaction)?.content).toContain('option_3');
    });
  });

  describe('exampleModal', () => {
    it('replies with submitted field values', async () => {
      const interaction = mockModalSubmitInteraction({
        title: 'My Title',
        description: 'My Description',
      });

      await cmd.exampleModal(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const reply = getReplyContent(interaction);
      expect(reply?.content).toContain('My Title');
      expect(reply?.content).toContain('My Description');
    });
  });
});
