#!/usr/bin/env sh
# Run npm inside node:22-alpine so package-lock.json stays compatible with
# the Docker build environment (npm 10.9.7). Use this instead of bare `npm`
# whenever you install, update, or remove packages.
#
# Usage:
#   ./scripts/npm.sh install
#   ./scripts/npm.sh install some-package
#   ./scripts/npm.sh uninstall some-package
#   ./scripts/npm.sh update some-package
#
# The .npmrc file is mounted so private registry auth (NODE_AUTH_TOKEN) is
# honoured. node_modules on the host are also mounted so the install lands
# in the right place and subsequent local `npm run dev` picks it up.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

docker run --rm \
  -v "$REPO_ROOT:/app" \
  -w /app \
  node:22-alpine \
  npm "$@"
