# Testing

This project uses [Bun's built-in test runner](https://bun.sh/docs/cli/test).

## Unit Tests

Unit tests mock Discord interactions and test guards/commands in isolation.

```bash
# Run all unit tests
bun run test:unit

# Run all tests (unit + e2e)
bun test
```

### What's covered

- **Guards** (`tests/guards.test.ts`): `guildOnly`, `dmOnly`, `nsfwOnly`, `ownerOnly`, `cooldown` (all scopes)
- **Commands** (`tests/commands/`): `ping`, `help`, `example` (all subcommands + component handlers)

## E2E Tests (Spacebar)

E2E tests run the bot against a local [Spacebar](https://spacebar.chat/) instance — an open-source Discord-compatible server.

### Prerequisites

- Docker & Docker Compose
- The bot source code (already here)

### Quick start

```bash
# 1. Start Spacebar
./scripts/setup-spacebar.sh

# 2. Run E2E tests
bun run test:e2e

# 3. Stop Spacebar
./scripts/setup-spacebar.sh stop
```

### How it works

1. `docker-compose.test.yml` starts Spacebar (gateway, API, CDN, Postgres, RabbitMQ)
2. The E2E test creates a test user, guild, and bot application via Spacebar's REST API
3. The bot starts and connects to the Spacebar gateway
4. Tests verify the bot is connected and commands are registered
5. Everything is cleaned up automatically (guild, application, bot process)

### Manual setup

```bash
# Start Spacebar in background
docker compose -f docker-compose.test.yml up -d

# Check status
./scripts/setup-spacebar.sh status

# View logs
docker compose -f docker-compose.test.yml logs -f

# Stop and clean up
docker compose -f docker-compose.test.yml down -v
```

### Environment variables

| Variable           | Default                     | Description                    |
| ------------------ | --------------------------- | ------------------------------ |
| `SPACEBAR_API_URL` | `http://localhost:3002/api` | Spacebar API base URL          |
| `SPACEBAR_GATEWAY` | `ws://localhost:3001`       | Spacebar gateway WebSocket URL |
