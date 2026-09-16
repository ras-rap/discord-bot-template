import { Client } from 'discordx';

import { DEFAULT_INTENTS, DEFAULT_PARTIALS } from './utils/constants.js';

export const client = new Client({
  intents: [...DEFAULT_INTENTS],
  partials: [...DEFAULT_PARTIALS],
});
