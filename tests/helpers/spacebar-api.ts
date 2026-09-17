/**
 * Spacebar API wrapper for E2E testing.
 *
 * Provides helpers to:
 *  - Register/login test users
 *  - Create and destroy guilds
 *  - Create bot applications and retrieve tokens
 *
 * Designed to work with a local Spacebar Docker instance
 * (see docker-compose.test.yml).
 *
 * All resources created via this wrapper are tagged with a unique
 * prefix so they can be cleaned up reliably.
 */

const TEST_PREFIX = 'bottest';

export interface SpacebarConfig {
  /** Base URL of the Spacebar API, e.g. http://localhost:3002/api */
  apiUrl: string;
}

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  token: string;
}

export interface TestGuild {
  id: string;
  name: string;
  ownerToken: string;
}

export interface TestBot {
  applicationId: string;
  botToken: string;
  name: string;
}

export interface TestEnvironment {
  owner: TestUser;
  guild: TestGuild;
  bot: TestBot;
}

async function api<T = any>(config: SpacebarConfig, path: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.apiUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Spacebar API ${res.status} ${res.statusText} at ${path}: ${body}`);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Wait for the Spacebar API to become healthy.
 * Retries with exponential backoff.
 */
export async function waitForSpacebar(config: SpacebarConfig, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${config.apiUrl}/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 2000 * Math.min(i + 1, 5)));
  }
  throw new Error(`Spacebar API not ready after ${maxRetries} attempts`);
}

/**
 * Register a new user on Spacebar.
 */
export async function registerUser(
  config: SpacebarConfig,
  suffix: string = Math.random().toString(36).slice(2, 8),
): Promise<TestUser> {
  const username = `${TEST_PREFIX}_user_${suffix}`;
  const email = `${username}@test.local`;
  const password = 'TestPassword123!';

  const data = await api<{ token: string; user: { id: string } }>(config, '/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password,
      consent: true,
      date_of_birth: '2000-01-01',
    }),
  });

  // Register returns a token directly
  return {
    id: data.user?.id ?? '',
    username,
    email,
    password,
    token: data.token,
  };
}

/**
 * Login an existing user.
 */
export async function loginUser(config: SpacebarConfig, email: string, password: string): Promise<string> {
  const data = await api<{ token: string }>(config, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: email, password }),
  });
  return data.token;
}

/**
 * Create a guild.
 */
export async function createGuild(config: SpacebarConfig, ownerToken: string, name?: string): Promise<TestGuild> {
  const guildName = name ?? `${TEST_PREFIX}_guild_${Math.random().toString(36).slice(2, 8)}`;

  const data = await api<{ id: string }>(config, '/guilds', {
    method: 'POST',
    headers: { Authorization: ownerToken },
    body: JSON.stringify({ name: guildName }),
  });

  return { id: data.id, name: guildName, ownerToken };
}

/**
 * Delete a guild.
 */
export async function deleteGuild(config: SpacebarConfig, guild: TestGuild): Promise<void> {
  try {
    await api(config, `/guilds/${guild.id}`, {
      method: 'DELETE',
      headers: { Authorization: guild.ownerToken },
    });
  } catch {
    // Guild may already be deleted
  }
}

/**
 * Create a bot application and return its token.
 */
export async function createBotApplication(config: SpacebarConfig, userToken: string, name?: string): Promise<TestBot> {
  const botName = name ?? `${TEST_PREFIX}_bot_${Math.random().toString(36).slice(2, 8)}`;

  // Create the application
  const app = await api<{ id: string }>(config, '/applications', {
    method: 'POST',
    headers: { Authorization: userToken },
    body: JSON.stringify({ name: botName }),
  });

  // Create a bot user for the application
  const bot = await api<{ token: string }>(config, `/applications/${app.id}/bot`, {
    method: 'POST',
    headers: { Authorization: userToken },
    body: JSON.stringify({ username: botName }),
  });

  return {
    applicationId: app.id,
    botToken: bot.token,
    name: botName,
  };
}

/**
 * Delete a bot application.
 */
export async function deleteBotApplication(config: SpacebarConfig, bot: TestBot, userToken: string): Promise<void> {
  try {
    await api(config, `/applications/${bot.applicationId}`, {
      method: 'DELETE',
      headers: { Authorization: userToken },
    });
  } catch {
    // Application may already be deleted
  }
}

/**
 * Add a bot to a guild (bot must be authorized via OAuth2, but
 * on Spacebar we can use the guild members endpoint directly).
 */
export async function addBotToGuild(config: SpacebarConfig, guild: TestGuild, bot: TestBot): Promise<void> {
  // On Spacebar, bots can be added via the guild members endpoint
  // if the user has MANAGE_GUILD permission.
  try {
    await api(config, `/guilds/${guild.id}/members/${bot.applicationId}`, {
      method: 'PUT',
      headers: { Authorization: guild.ownerToken },
      body: JSON.stringify({}),
    });
  } catch {
    // Some Spacebar versions may not support this directly.
    // The bot can still connect via WebSocket and receive events.
  }
}

/**
 * Create a full test environment: user + guild + bot.
 * Returns everything needed to run E2E tests.
 */
export async function createTestEnvironment(config: SpacebarConfig): Promise<TestEnvironment> {
  const owner = await registerUser(config, 'owner');
  const guild = await createGuild(config, owner.token);
  const bot = await createBotApplication(config, owner.token);

  return { owner, guild, bot };
}

/**
 * Tear down a test environment: delete guild, application, etc.
 */
export async function destroyTestEnvironment(config: SpacebarConfig, env: TestEnvironment): Promise<void> {
  await deleteBotApplication(config, env.bot, env.owner.token);
  await deleteGuild(config, env.guild);
}
