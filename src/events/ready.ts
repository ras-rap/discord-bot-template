import { Discord, Once } from 'discordx';
import { logger } from '../utils/logger.js';

@Discord()
class ReadyEvent {
  @Once({ event: 'ready' })
  async onReady() {
    logger.info('🟢 Bot is ready!');
  }
}
