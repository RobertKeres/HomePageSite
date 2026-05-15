#!/usr/bin/env bash
# Run without Docker Compose: build image and start container with ./data mounted.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${IMAGE:-homepagesite:local}"
PORT="${PORT:-8080}"

docker build -t "${IMAGE}" "${ROOT}"
mkdir -p "${ROOT}/data"
exec docker run --rm \
  -p "${PORT}:8080" \
  -v "${ROOT}/data:/data" \
  -e DATA_DIR=/data \
  -e PORT=8080 \
  -e STATIC_DIR=/app/static \
  "${IMAGE}"
