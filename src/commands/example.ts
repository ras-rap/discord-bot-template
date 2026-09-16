import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';
import { Discord, Guard, Slash, SlashGroup } from 'discordx';

import { cooldown, guildOnly } from '../guards/index.js';

import type {
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ModalSubmitInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from 'discord.js';

@Discord()
class ExampleCommand {
  @Slash({ description: 'Showcase all interactable examples' })
  @SlashGroup('example')
  @Guard(guildOnly, cooldown(10))
  async show(interaction: any) {
    await interaction.reply({
      content: '**Example Command**\nUse a subcommand to test different interactable types.',
    });
  }

  // --- Subcommands ---

  @Slash({ description: 'Show example buttons' })
  @SlashGroup('button', 'example')
  @Guard(guildOnly, cooldown(10))
  async buttonSub(interaction: any) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('example_button').setLabel('Click Me!').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('confirm_123').setLabel('Confirm (Regex)').setStyle(ButtonStyle.Success),
    );

    await interaction.reply({
      content: '**Button Examples**\nClick the buttons below to test the handlers.',
      components: [row],
    });
  }

  @Slash({ description: 'Show example modal' })
  @SlashGroup('modal', 'example')
  @Guard(guildOnly, cooldown(10))
  async modalSub(interaction: any) {
    const modal = new ModalBuilder().setCustomId('example_modal').setTitle('Example Modal');

    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel('Title')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter a title')
            .setRequired(true),
        ),
      new LabelBuilder()
        .setLabel('Description')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter a description')
            .setRequired(true),
        ),
    );

    await interaction.showModal(modal);
  }

  @Slash({ description: 'Show example select menu' })
  @SlashGroup('select', 'example')
  @Guard(guildOnly, cooldown(10))
  async selectSub(interaction: any) {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('example_select')
        .setPlaceholder('Select an option')
        .setMinValues(1)
        .setMaxValues(3)
        .addOptions(
          { label: 'Option 1', value: 'option_1', description: 'First option' },
          { label: 'Option 2', value: 'option_2', description: 'Second option' },
          { label: 'Option 3', value: 'option_3', description: 'Third option' },
        ),
    );

    await interaction.reply({
      content: '**String Select Menu Example**\nSelect one or more options below.',
      components: [row],
    });
  }

  @Slash({ description: 'Show example user select menu' })
  @SlashGroup('user-select', 'example')
  @Guard(guildOnly, cooldown(10))
  async userSelectSub(interaction: any) {
    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('user_select')
        .setPlaceholder('Select users')
        .setMinValues(1)
        .setMaxValues(5),
    );

    await interaction.reply({
      content: '**User Select Menu Example**\nSelect one or more users below.',
      components: [row],
    });
  }

  @Slash({ description: 'Show example role select menu' })
  @SlashGroup('role-select', 'example')
  @Guard(guildOnly, cooldown(10))
  async roleSelectSub(interaction: any) {
    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('role_select')
        .setPlaceholder('Select roles')
        .setMinValues(1)
        .setMaxValues(5),
    );

    await interaction.reply({
      content: '**Role Select Menu Example**\nSelect one or more roles below.',
      components: [row],
    });
  }

  @Slash({ description: 'Show example channel select menu' })
  @SlashGroup('channel-select', 'example')
  @Guard(guildOnly, cooldown(10))
  async channelSelectSub(interaction: any) {
    const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('channel_select')
        .setPlaceholder('Select channels')
        .setMinValues(1)
        .setMaxValues(5),
    );

    await interaction.reply({
      content: '**Channel Select Menu Example**\nSelect one or more channels below.',
      components: [row],
    });
  }

  // --- Interaction handlers (colocated!) ---

  async exampleButton(interaction: ButtonInteraction) {
    await interaction.reply({ content: '✅ Button clicked!', flags: 64 });
  }

  async confirmRegex(interaction: ButtonInteraction) {
    await interaction.reply({ content: '✅ Regex-matched button clicked!', flags: 64 });
  }

  async exampleSelect(interaction: StringSelectMenuInteraction) {
    await interaction.reply({ content: `You selected: ${interaction.values.join(', ')}`, flags: 64 });
  }

  async userSelect(interaction: UserSelectMenuInteraction) {
    await interaction.reply({ content: `You selected users: ${interaction.values.join(', ')}`, flags: 64 });
  }

  async roleSelect(interaction: RoleSelectMenuInteraction) {
    await interaction.reply({ content: `You selected roles: ${interaction.values.join(', ')}`, flags: 64 });
  }

  async channelSelect(interaction: ChannelSelectMenuInteraction) {
    await interaction.reply({ content: `You selected channels: ${interaction.values.join(', ')}`, flags: 64 });
  }

  async exampleModal(interaction: ModalSubmitInteraction) {
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    await interaction.reply({ content: `**${title}**\n${description}`, flags: 64 });
  }
}
