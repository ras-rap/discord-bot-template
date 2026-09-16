// Bun automatically loads .env files — no need for dotenv
export const DISCORD_TOKEN = process.env['DISCORD_TOKEN'] ?? '';
export const DISCORD_CLIENT_ID = process.env['DISCORD_CLIENT_ID'] ?? '';
export const DISCORD_DEVELOPMENT_GUILD_ID = process.env['DISCORD_DEVELOPMENT_GUILD_ID'] ?? '';
export const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
export const AUTO_REGISTER_COMMANDS = process.env['AUTO_REGISTER_COMMANDS'] === 'true';
