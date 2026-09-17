#!/usr/bin/env bash
# Start the Spacebar test instance and wait for it to be ready.
#
# Usage:
#   ./scripts/setup-spacebar.sh          # start
#   ./scripts/setup-spacebar.sh stop     # stop and clean up
#   ./scripts/setup-spacebar.sh status   # check if running

set -euo pipefail

COMPOSE_FILE="docker-compose.test.yml"
API_URL="${SPACEBAR_API_URL:-http://localhost:3002/api}"

cmd="${1:-start}"

case "$cmd" in
  start)
    echo "🚀 Starting Spacebar test instance..."
    docker compose -f "$COMPOSE_FILE" up -d

    echo "⏳ Waiting for Spacebar API to be ready..."
    for i in $(seq 1 30); do
      if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
        echo "✅ Spacebar is ready at ${API_URL}"
        exit 0
      fi
      sleep 2
    done

    echo "❌ Spacebar did not become ready in time"
    docker compose -f "$COMPOSE_FILE" logs --tail=20
    exit 1
    ;;

  stop)
    echo "🛑 Stopping Spacebar test instance..."
    docker compose -f "$COMPOSE_FILE" down -v
    echo "✅ Stopped and volumes removed"
    ;;

  status)
    docker compose -f "$COMPOSE_FILE" ps
    if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
      echo "✅ API is healthy"
    else
      echo "❌ API is not responding"
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
