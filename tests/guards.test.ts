import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

import { cooldown, cooldowns, dmOnly, guildOnly, nsfwOnly, ownerOnly } from '../src/guards/index.js';

import {
  getReplyContent,
  mockChatInputInteraction,
  mockDMChannel,
  mockTextChannel,
} from './helpers/mock-interaction.js';

describe('guildOnly', () => {
  it('calls next() when in a guild', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction();

    await (guildOnly as any)(interaction, {}, next);

    expect(next).toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('replies with error when in DM', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ guild: null });

    await (guildOnly as any)(interaction, {}, next);

    expect(next).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
    expect(getReplyContent(interaction)?.content).toContain('servers');
  });
});

describe('dmOnly', () => {
  it('calls next() when in a DM', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ guild: null });

    await (dmOnly as any)(interaction, {}, next);

    expect(next).toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('replies with error when in a guild', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction();

    await (dmOnly as any)(interaction, {}, next);

    expect(next).not.toHaveBeenCalled();
    expect(getReplyContent(interaction)?.content).toContain('DMs');
  });
});

describe('nsfwOnly', () => {
  it('calls next() in an NSFW channel', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ channel: mockTextChannel(true) });

    await (nsfwOnly as any)(interaction, {}, next);

    expect(next).toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('calls next() in a DM (NSFW is allowed)', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ channel: mockDMChannel() as any });

    await (nsfwOnly as any)(interaction, {}, next);

    expect(next).toHaveBeenCalled();
  });

  it('replies with error in a SFW channel', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ channel: mockTextChannel(false) });

    await (nsfwOnly as any)(interaction, {}, next);

    expect(next).not.toHaveBeenCalled();
    expect(getReplyContent(interaction)?.content).toContain('NSFW');
  });

  it('replies with error when channel is null', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ channel: null as any });

    await (nsfwOnly as any)(interaction, {}, next);

    expect(next).not.toHaveBeenCalled();
    expect(getReplyContent(interaction)?.content).toContain('verify');
  });
});

describe('ownerOnly', () => {
  it('calls next() when user ID matches', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ user: { id: 'owner-123' } });

    await (ownerOnly('owner-123', 'owner-456') as any)(interaction, {}, next);

    expect(next).toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('replies with error when user ID does not match', async () => {
    const next = vi.fn();
    const interaction = mockChatInputInteraction({ user: { id: 'not-owner' } });

    await (ownerOnly('owner-123', 'owner-456') as any)(interaction, {}, next);

    expect(next).not.toHaveBeenCalled();
    expect(getReplyContent(interaction)?.content).toContain('owner');
  });
});

describe('cooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cooldowns.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls next() on first use', async () => {
    const next = vi.fn();
    const guard = cooldown(5);
    const interaction = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'ping' });

    await (guard as any)(interaction, {}, next);

    expect(next).toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('blocks second call within cooldown window', async () => {
    const next = vi.fn();
    const guard = cooldown(5);
    const interaction = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'ping' });

    // First call — should pass
    await (guard as any)(interaction, {}, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Advance 2 seconds (still within 5s cooldown)
    vi.advanceTimersByTime(2000);

    const next2 = vi.fn();
    const interaction2 = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'ping' });

    await (guard as any)(interaction2, {}, next2);

    expect(next2).not.toHaveBeenCalled();
    expect(interaction2.reply).toHaveBeenCalled();
    expect(getReplyContent(interaction2)?.content).toContain('wait');
  });

  it('allows call after cooldown expires', async () => {
    const next = vi.fn();
    const guard = cooldown(5);
    const interaction = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'ping' });

    await (guard as any)(interaction, {}, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Advance past the 5s cooldown
    vi.advanceTimersByTime(6000);

    const next2 = vi.fn();
    const interaction2 = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'ping' });

    await (guard as any)(interaction2, {}, next2);

    expect(next2).toHaveBeenCalled();
  });

  it('tracks cooldowns per user separately', async () => {
    const guard = cooldown(5);

    const interaction1 = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'ping' });
    const next1 = vi.fn();
    await (guard as any)(interaction1, {}, next1);
    expect(next1).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);

    // Different user, same command — should still pass
    const interaction2 = mockChatInputInteraction({ user: { id: 'user-2' }, commandName: 'ping' });
    const next2 = vi.fn();
    await (guard as any)(interaction2, {}, next2);
    expect(next2).toHaveBeenCalledTimes(1);
  });

  it('tracks cooldowns per command separately', async () => {
    const guard = cooldown(5);

    const interaction1 = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'ping' });
    const next1 = vi.fn();
    await (guard as any)(interaction1, {}, next1);

    vi.advanceTimersByTime(2000);

    // Same user, different command — should still pass
    const interaction2 = mockChatInputInteraction({ user: { id: 'user-1' }, commandName: 'help' });
    const next2 = vi.fn();
    await (guard as any)(interaction2, {}, next2);
    expect(next2).toHaveBeenCalledTimes(1);
  });

  it('guild scope uses guildId in key', async () => {
    const guard = cooldown(5, 'guild');
    const next = vi.fn();

    const interaction1 = mockChatInputInteraction({
      user: { id: 'user-1' },
      commandName: 'ping',
      guildId: 'guild-1',
    });
    await (guard as any)(interaction1, {}, next);
    expect(next).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);

    // Same guild, different user — should be blocked
    const interaction2 = mockChatInputInteraction({
      user: { id: 'user-2' },
      commandName: 'ping',
      guildId: 'guild-1',
    });
    const next2 = vi.fn();
    await (guard as any)(interaction2, {}, next2);
    expect(next2).not.toHaveBeenCalled();
  });
});
