import { MessageFlags, PermissionFlagsBits, PermissionsBitField } from 'discord.js';

import type { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';
import type { Client, GuardFunction, Next } from 'discordx';

type CooldownScope = 'user' | 'guild' | 'channel' | 'global';
/** @internal Exported for testing — reset between test runs. */
export const cooldowns = new Map<string, number>();

export const cooldown =
  (seconds: number, scope: CooldownScope = 'user'): GuardFunction =>
  async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
    const commandName = interaction.commandName;
    let key: string;

    switch (scope) {
      case 'user':
        key = `${interaction.user.id}-${commandName}`;
        break;
      case 'guild':
        key = interaction.guildId
          ? `guild-${interaction.guildId}-${commandName}`
          : `dm-${interaction.user.id}-${commandName}`;
        break;
      case 'channel':
        key = `channel-${interaction.channelId}-${commandName}`;
        break;
      case 'global':
        key = `global-${commandName}`;
        break;
    }

    const now = Date.now();
    const cooldownEnd = cooldowns.get(key);

    if (cooldownEnd !== undefined && now < cooldownEnd) {
      const timeLeft = Math.ceil((cooldownEnd - now) / 1000);
      await interaction.reply({
        content: `Please wait ${timeLeft}s before using this command again.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    cooldowns.set(key, now + seconds * 1000);
    setTimeout(() => cooldowns.delete(key), seconds * 1000);

    return next();
  };

export const userCooldown = (seconds: number) => cooldown(seconds, 'user');
export const guildCooldown = (seconds: number) => cooldown(seconds, 'guild');
export const channelCooldown = (seconds: number) => cooldown(seconds, 'channel');
export const globalCooldown = (seconds: number) => cooldown(seconds, 'global');

// --- Channel guards ---

export const guildOnly: GuardFunction = async (
  interaction: ChatInputCommandInteraction,
  _client: Client,
  next: Next,
) => {
  if (interaction.guild !== null) return next();
  await interaction.reply({ content: 'This command can only be used in servers.', flags: MessageFlags.Ephemeral });
  return;
};

export const dmOnly: GuardFunction = async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
  if (interaction.guild === null) return next();
  await interaction.reply({ content: 'This command can only be used in DMs.', flags: MessageFlags.Ephemeral });
  return;
};

export const nsfwOnly: GuardFunction = async (
  interaction: ChatInputCommandInteraction,
  _client: Client,
  next: Next,
) => {
  if (interaction.channel === null) {
    await interaction.reply({ content: 'Could not verify channel.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.channel.isDMBased() || ('nsfw' in interaction.channel && interaction.channel.nsfw)) return next();
  await interaction.reply({
    content: 'This command can only be used in NSFW channels.',
    flags: MessageFlags.Ephemeral,
  });
  return;
};

// --- Access guards ---

export const ownerOnly =
  (...ownerIds: string[]): GuardFunction =>
  async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
    if (ownerIds.includes(interaction.user.id)) return next();
    await interaction.reply({ content: 'Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    return;
  };

export const allowUsers =
  (...userIds: string[]): GuardFunction =>
  async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
    if (userIds.includes(interaction.user.id)) return next();
    await interaction.reply({ content: 'You are not allowed to use this command.', flags: MessageFlags.Ephemeral });
    return;
  };

export const allowGuilds =
  (...guildIds: string[]): GuardFunction =>
  async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
    if (interaction.guildId !== null && guildIds.includes(interaction.guildId)) return next();
    await interaction.reply({
      content: 'This command is not available in this server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  };

export const requireRoles =
  (...roleIds: string[]): GuardFunction =>
  async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
    if (interaction.guild === null) {
      await interaction.reply({ content: 'This command can only be used in servers.', flags: MessageFlags.Ephemeral });
      return;
    }

    const member = interaction.member;
    if (member === null) {
      await interaction.reply({ content: 'Could not verify your roles.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Check if member has any of the required roles
    if ('roles' in member && typeof member.roles === 'object' && 'cache' in member.roles) {
      const hasRole = member.roles.cache.some((r: any) => roleIds.includes(r.id));
      if (hasRole) return next();
    }

    await interaction.reply({ content: 'You do not have the required roles.', flags: MessageFlags.Ephemeral });
    return;
  };

// --- Permission guards ---

export const requirePermissions =
  (...permissions: PermissionResolvable[]): GuardFunction =>
  async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
    if (interaction.guild === null) {
      await interaction.reply({ content: 'This command can only be used in servers.', flags: MessageFlags.Ephemeral });
      return;
    }

    const member = interaction.member;
    if (member === null || !(member.permissions instanceof PermissionsBitField)) {
      await interaction.reply({ content: 'Could not verify your permissions.', flags: MessageFlags.Ephemeral });
      return;
    }

    const missing = member.permissions.missing(permissions);
    if (missing.length === 0) return next();

    const formatted = missing.map(p => `\`${p}\``).join(', ');
    await interaction.reply({
      content: `You need the following permissions: ${formatted}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  };

export const requireBotPermissions =
  (...permissions: PermissionResolvable[]): GuardFunction =>
  async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
    if (interaction.guild === null) {
      await interaction.reply({ content: 'This command can only be used in servers.', flags: MessageFlags.Ephemeral });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (botMember === null) {
      await interaction.reply({ content: 'Could not verify bot permissions.', flags: MessageFlags.Ephemeral });
      return;
    }

    const missing = botMember.permissions.missing(permissions);
    if (missing.length === 0) return next();

    const formatted = missing.map(p => `\`${p}\``).join(', ');
    await interaction.reply({
      content: `I need the following permissions: ${formatted}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  };

export const adminOnly = requirePermissions(PermissionFlagsBits.Administrator);

export const modOnly: GuardFunction = async (interaction: ChatInputCommandInteraction, _client: Client, next: Next) => {
  if (interaction.guild === null) {
    await interaction.reply({ content: 'This command can only be used in servers.', flags: MessageFlags.Ephemeral });
    return;
  }

  const member = interaction.member;
  if (member === null || !(member.permissions instanceof PermissionsBitField)) {
    await interaction.reply({ content: 'Could not verify your permissions.', flags: MessageFlags.Ephemeral });
    return;
  }

  const hasModPerms =
    member.permissions.has(PermissionFlagsBits.KickMembers) ||
    member.permissions.has(PermissionFlagsBits.BanMembers) ||
    member.permissions.has(PermissionFlagsBits.ModerateMembers);

  if (hasModPerms) return next();

  await interaction.reply({
    content: 'You need moderation permissions to use this command.',
    flags: MessageFlags.Ephemeral,
  });
  return;
};
