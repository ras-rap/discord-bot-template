import type { ChatInputCommandInteraction } from 'discord.js';
import { ApplicationCommandOptionType, EmbedBuilder, MessageFlags } from 'discord.js';
import { Client, Discord, Slash, SlashOption } from 'discordx';

@Discord()
class HelpCommand {
  @Slash({ description: 'View all available commands or get help for a specific one' })
  async help(
    @SlashOption({
      description: 'Get detailed help for a specific command',
      name: 'command',
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    commandName: string | null,
    interaction: ChatInputCommandInteraction,
  ) {
    const allCommands = Client.applicationCommandSlashes;

    if (commandName) {
      const cmd = allCommands.find(c => c.name === commandName);

      if (!cmd) {
        await interaction.reply({ content: `Command \`${commandName}\` not found.`, flags: MessageFlags.Ephemeral });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`/${cmd.name}`)
        .setDescription(cmd.description || 'No description')
        .setColor('Blurple');

      if (cmd.options.length > 0) {
        embed.addFields({
          name: 'Options',
          value: cmd.options
            .map(opt => {
              const json = opt.toJSON();
              const required = 'required' in json && json.required ? ' *(required)*' : '';
              return `• **${json.name}**${required}: ${json.description}`;
            })
            .join('\n'),
        });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Commands')
      .setColor('Blurple')
      .setDescription(
        allCommands.map(c => `• **/${c.name}** — ${c.description || 'No description'}`).join('\n') ||
          'No commands registered.',
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
