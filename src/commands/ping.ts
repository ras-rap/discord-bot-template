import { MessageFlags } from 'discord.js';
import { Discord, Guard, Slash } from 'discordx';

import { cooldown, guildOnly } from '../guards/index.js';

import type { ChatInputCommandInteraction } from 'discord.js';

@Discord()
export class PingCommand {
  @Slash({ 'description': 'Replies with Pong!' })
  @Guard(guildOnly, cooldown(5))
  async ping(interaction: ChatInputCommandInteraction) {
    const latency = Date.now() - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.reply({
      'content': `Pong!\n> **Latency:** ${latency}ms\n> **API Latency:** ${apiLatency}ms`,
      'flags': MessageFlags.Ephemeral,
    });
  }
}
