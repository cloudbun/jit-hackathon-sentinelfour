#!/usr/bin/env bash
set -euo pipefail

IMAGE="sentinelfour"
CONTAINER="sentinelfour"
PORT="${PORT:-3000}"

# Colors
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

banner() {
  echo ""
  echo -e "${BOLD}${CYAN}  ┌─────────────────────────────────┐${RESET}"
  echo -e "${BOLD}${CYAN}  │          SENTINEL${RED}FOUR${CYAN}           │${RESET}"
  echo -e "${BOLD}${CYAN}  │       ${DIM}security monitoring${RESET}${BOLD}${CYAN}       │${RESET}"
  echo -e "${BOLD}${CYAN}  └─────────────────────────────────┘${RESET}"
  echo ""
}

info()    { echo -e "  ${CYAN}▸${RESET} $1"; }
success() { echo -e "  ${GREEN}✓${RESET} $1"; }
warn()    { echo -e "  ${YELLOW}!${RESET} $1"; }
error()   { echo -e "  ${RED}✗${RESET} $1"; }
step()    { echo -e "  ${DIM}─${RESET} $1"; }

usage() {
  banner
  echo -e "  ${BOLD}Usage:${RESET} ./run.sh ${DIM}[command]${RESET}"
  echo ""
  echo -e "  ${BOLD}Commands:${RESET}"
  echo -e "    ${CYAN}build${RESET}          Build the Docker image"
  echo -e "    ${CYAN}start${RESET}          Build and start the container"
  echo -e "    ${CYAN}stop${RESET}           Stop and remove the container"
  echo -e "    ${CYAN}seed${RESET}           Seed the database with sample data"
  echo -e "    ${CYAN}logs${RESET}           Tail container logs"
  echo -e "    ${CYAN}restart${RESET}        Stop, rebuild, and start"
  echo -e "    ${CYAN}compose${RESET}        Start with Docker Compose (includes n8n)"
  echo -e "    ${CYAN}compose-down${RESET}   Stop Docker Compose stack"
  echo ""
  echo -e "  ${BOLD}Environment:${RESET}"
  echo -e "    ${DIM}PORT${RESET}        Host port (default: 3000)"
  echo ""
}

build() {
  info "Building ${BOLD}$IMAGE${RESET} image..."
  docker build -t "$IMAGE" . 2>&1 | while IFS= read -r line; do
    echo -e "    ${DIM}${line}${RESET}"
  done
  success "Image built."
}

start() {
  banner

  if docker ps -q -f name="^${CONTAINER}$" | grep -q .; then
    warn "Container ${BOLD}$CONTAINER${RESET} is already running."
    echo ""
    echo -e "  ${GREEN}→${RESET} ${BOLD}http://localhost:$PORT${RESET}"
    echo ""
    return
  fi

  # Remove stopped container with the same name if it exists
  docker rm -f "$CONTAINER" 2>/dev/null || true

  build

  info "Starting ${BOLD}$CONTAINER${RESET} on port ${BOLD}$PORT${RESET}..."
  docker run -d \
    --name "$CONTAINER" \
    -p "$PORT:3000" \
    -v sentinelfour-data:/app/data \
    "$IMAGE" > /dev/null

  # Wait for server to be ready, then seed
  step "Waiting for server..."
  for i in $(seq 1 10); do
    if docker exec "$CONTAINER" bun -e "await fetch('http://localhost:3000/api/dashboard/stats')" 2>/dev/null; then
      break
    fi
    sleep 1
  done

  step "Seeding database..."
  docker exec "$CONTAINER" bun run src/seed-applications.ts > /dev/null 2>&1

  success "Ready."
  echo ""
  echo -e "  ${GREEN}→${RESET} ${BOLD}http://localhost:$PORT${RESET}"
  echo ""
}

stop() {
  banner
  info "Stopping ${BOLD}$CONTAINER${RESET}..."
  docker rm -f "$CONTAINER" 2>/dev/null || true
  success "Stopped."
  echo ""
}

seed() {
  if ! docker ps -q -f name="^${CONTAINER}$" | grep -q .; then
    error "Container ${BOLD}$CONTAINER${RESET} is not running."
    info "Run ${CYAN}./run.sh start${RESET} first."
    exit 1
  fi
  info "Seeding database..."
  docker exec "$CONTAINER" bun run src/seed-applications.ts > /dev/null 2>&1
  success "Database seeded."
}

logs() {
  docker logs -f "$CONTAINER"
}

compose() {
  banner
  info "Starting stack with Docker Compose..."
  docker compose up --build -d 2>&1 | while IFS= read -r line; do
    echo -e "    ${DIM}${line}${RESET}"
  done

  # Wait for server, then seed
  step "Waiting for server..."
  for i in $(seq 1 15); do
    if docker compose exec sentinelfour bun -e "await fetch('http://localhost:3000/api/dashboard/summary')" 2>/dev/null; then
      break
    fi
    sleep 1
  done

  step "Seeding database..."
  docker compose exec sentinelfour bun run src/seed-applications.ts > /dev/null 2>&1

  success "Ready."
  echo ""
  echo -e "  ${GREEN}→${RESET} Dashboard: ${BOLD}http://localhost:3000${RESET}"
  echo -e "  ${GREEN}→${RESET} n8n:       ${BOLD}http://localhost:5678${RESET}"
  echo ""
}

compose_down() {
  banner
  info "Stopping Docker Compose stack..."
  docker compose down
  success "Stopped."
  echo ""
}

case "${1:-start}" in
  build)   build ;;
  start)   start ;;
  stop)    stop ;;
  seed)    seed ;;
  logs)    logs ;;
  restart) stop; start ;;
  compose) compose ;;
  compose-down) compose_down ;;
  help|-h|--help) usage ;;
  *)
    error "Unknown command: ${BOLD}$1${RESET}"
    usage
    exit 1
    ;;
esac
