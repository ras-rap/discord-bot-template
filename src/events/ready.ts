import { Events } from 'discord.js';
import { Discord, Once } from 'discordx';
import { logger } from '../utils/logger.js';

@Discord()
class ReadyEvent {
  @Once({ event: Events.ClientReady })
  async onReady(client: any) {
    logger.info(`Logged in as ${client.user.tag} (${client.user.id})`);
  }
}
