import { describe, expect, it } from 'bun:test';

import { PingCommand } from '../../src/commands/ping.js';

import { getReplyContent, mockChatInputInteraction, mockClient } from '../helpers/mock-interaction.js';

describe('PingCommand', () => {
  it('replies with Pong and latency info', async () => {
    const cmd = new PingCommand();
    const client = mockClient({ ws: { ping: 42 } });
    const interaction = mockChatInputInteraction({ client });

    await cmd.ping(interaction);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const reply = getReplyContent(interaction);
    expect(reply?.content).toContain('Pong!');
    expect(reply?.content).toContain('Latency:');
    expect(reply?.content).toContain('API Latency:');
    expect(reply?.content).toContain('42ms');
  });

  it('replies as ephemeral', async () => {
    const cmd = new PingCommand();
    const interaction = mockChatInputInteraction();

    await cmd.ping(interaction);

    const reply = getReplyContent(interaction);
    // MessageFlags.Ephemeral = 64
    expect(reply?.flags).toBe(64);
  });
});
