import { vi } from 'bun:test';

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Guild,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  TextChannel,
  User,
} from 'discord.js';

/**
 * Creates a minimal mock User object.
 */
export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: '100000000000000001',
    bot: false,
    username: 'TestUser',
    discriminator: '0',
    tag: 'TestUser#0',
    displayName: 'Test User',
    ...overrides,
  } as unknown as User;
}

/**
 * Creates a minimal mock Guild object.
 */
export function mockGuild(overrides: Partial<Guild> = {}): Guild {
  return {
    id: '200000000000000001',
    name: 'Test Guild',
    ...overrides,
  } as unknown as Guild;
}

/**
 * Creates a mock TextChannel with nsfw flag.
 */
export function mockTextChannel(nsfw = false): TextChannel {
  return {
    id: '300000000000000001',
    name: 'test-channel',
    nsfw,
    isDMBased: () => false,
    ...({ nsfw } as {}),
  } as unknown as TextChannel;
}

/**
 * Creates a mock DM channel.
 */
export function mockDMChannel() {
  return {
    id: '300000000000000002',
    name: null,
    isDMBased: () => true,
  } as unknown as import('discord.js').DMChannel;
}

/**
 * Creates a mock Client with ws.ping.
 */
export function mockClient(overrides: Partial<Client> = {}): Client {
  return {
    ws: { ping: 50 },
    ...overrides,
  } as unknown as Client;
}

interface MockInteractionOptions {
  /** User performing the interaction */
  user?: Partial<User>;
  /** Guild context (null = DM). Pass explicit `null` to simulate DMs. */
  guild?: Guild | null;
  /** Channel context. Pass explicit `null` to simulate missing channel. */
  channel?: ReturnType<typeof mockTextChannel | typeof mockDMChannel> | null;
  /** Command name */
  commandName?: string;
  /** Channel ID */
  channelId?: string;
  /** Guild ID. Pass explicit `null` for DMs. */
  guildId?: string | null;
  /** Client reference */
  client?: Client;
}

/**
 * Creates a mock ChatInputCommandInteraction with spied reply/edit.deferReply methods.
 */
export function mockChatInputInteraction(options: MockInteractionOptions = {}) {
  const user = mockUser(options.user);
  const guild = options.guild !== undefined ? options.guild : mockGuild();
  const channel = 'channel' in options ? options.channel : mockTextChannel();
  const client = options.client ?? mockClient();
  const commandName = options.commandName ?? 'test';
  const channelId = options.channelId ?? '300000000000000001';
  const guildId = options.guildId !== undefined ? options.guildId : (guild?.id ?? null);

  const interaction = {
    user,
    guild,
    channel,
    client,
    commandName,
    channelId,
    guildId,
    createdTimestamp: Date.now(),
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    isButton: () => false,
    isChatInputCommand: () => true,
    isStringSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isModalSubmit: () => false,
  } as unknown as ChatInputCommandInteraction;

  return interaction;
}

/**
 * Creates a mock ButtonInteraction.
 */
export function mockButtonInteraction(options: MockInteractionOptions = {}) {
  const user = mockUser(options.user);
  const guild = options.guild !== undefined ? options.guild : mockGuild();
  const client = options.client ?? mockClient();

  return {
    user,
    guild,
    client,
    customId: 'example_button',
    channelId: options.channelId ?? '300000000000000001',
    guildId: guild?.id ?? null,
    createdTimestamp: Date.now(),
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    isButton: () => true,
    isChatInputCommand: () => false,
  } as unknown as ButtonInteraction;
}

/**
 * Creates a mock StringSelectMenuInteraction.
 */
export function mockStringSelectInteraction(values: string[], options: MockInteractionOptions = {}) {
  const user = mockUser(options.user);
  const guild = options.guild !== undefined ? options.guild : mockGuild();
  const client = options.client ?? mockClient();

  return {
    user,
    guild,
    client,
    customId: 'example_select',
    values,
    channelId: options.channelId ?? '300000000000000001',
    guildId: guild?.id ?? null,
    createdTimestamp: Date.now(),
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    isStringSelectMenu: () => true,
    isChatInputCommand: () => false,
  } as unknown as StringSelectMenuInteraction;
}

/**
 * Creates a mock ModalSubmitInteraction with fields.
 */
export function mockModalSubmitInteraction(fields: Record<string, string> = {}, options: MockInteractionOptions = {}) {
  const user = mockUser(options.user);
  const guild = options.guild !== undefined ? options.guild : mockGuild();
  const client = options.client ?? mockClient();

  return {
    user,
    guild,
    client,
    customId: 'example_modal',
    channelId: options.channelId ?? '300000000000000001',
    guildId: guild?.id ?? null,
    createdTimestamp: Date.now(),
    reply: vi.fn().mockResolvedValue(undefined),
    fields: {
      getTextInputValue: (id: string) => {
        const val = fields[id];
        if (val === undefined) throw new Error(`No field with id "${id}"`);
        return val;
      },
    },
    isModalSubmit: () => true,
    isChatInputCommand: () => false,
  } as unknown as ModalSubmitInteraction;
}

/**
 * Helper: extract the content from a reply call.
 */
export function getReplyContent(interaction: ReturnType<typeof mockChatInputInteraction>) {
  const call = (interaction.reply as ReturnType<typeof vi.fn>).mock.calls[0];
  return call?.[0] as { content?: string; embeds?: unknown[]; components?: unknown[]; flags?: number } | undefined;
}
