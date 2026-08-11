#!/usr/bin/env bash
#
# AI Codebase Mapper — sequential install & build script
# Installs every component one by one with clear progress.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors (disabled if not a TTY)
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN='' YELLOW='' RED='' BLUE='' BOLD='' NC=''
fi

step=0
total_steps=7

log_step() {
  step=$((step + 1))
  echo ""
  echo -e "${BLUE}${BOLD}[$step/$total_steps]${NC} ${BOLD}$1${NC}"
  echo "----------------------------------------"
}

ok() {
  echo -e "${GREEN}✓ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

fail() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

# ---------------------------------------------------------------------------
log_step "Checking prerequisites (Node.js & npm)"

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is not installed. Install Node.js 18+ from https://nodejs.org"
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "npm is not installed. It usually comes with Node.js."
fi

NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  fail "Node.js 18+ required (found $(node -v))"
fi

ok "Node.js $(node -v)"
ok "npm $(npm -v)"

# ---------------------------------------------------------------------------
log_step "Installing extension host dependencies (root package.json)"

npm install --no-audit --no-fund
ok "Root dependencies installed"

# ---------------------------------------------------------------------------
log_step "Installing webview dependencies (React + React Flow + Vite)"

if [[ ! -d webview ]]; then
  fail "webview/ folder not found"
fi

(
  cd webview
  npm install --no-audit --no-fund
)
ok "Webview dependencies installed"

# ---------------------------------------------------------------------------
log_step "Building webview UI (Vite production build)"

(
  cd webview
  npm run build
)

if [[ ! -d webview/dist ]]; then
  fail "webview/dist was not created — build may have failed"
fi
ok "Webview built → webview/dist/"

# ---------------------------------------------------------------------------
log_step "Compiling extension TypeScript (tsc → out/)"

npm run compile
# compile script already runs build:webview; if tsc fails, set -e will stop us

if [[ ! -d out ]]; then
  # Some setups only emit .js under out after tsc; ensure it exists
  npx tsc -p ./
fi

if [[ ! -f out/extension.js ]]; then
  fail "out/extension.js not found — TypeScript compile failed"
fi
ok "Extension compiled → out/extension.js"

# ---------------------------------------------------------------------------
log_step "Running unit tests (Vitest)"

if npm test; then
  ok "All tests passed"
else
  warn "Some tests failed — extension may still run; fix tests when you can"
fi

# ---------------------------------------------------------------------------
log_step "Done — how to launch"

echo ""
echo -e "${GREEN}${BOLD}Install complete.${NC}"
echo ""
echo "Next steps:"
echo "  1. Open this folder in VS Code:"
echo "       code \"$ROOT_DIR\""
echo ""
echo "  2. Press F5 to start the Extension Development Host"
echo ""
echo "  3. In the new window:"
echo "       • Open any project folder"
echo "       • Command Palette → AI Codebase Mapper: Analyze Project"
echo "       • Enter your OpenAI (or compatible) API key when prompted"
echo ""
echo "Optional:"
echo "  • Watch mode:   npm run watch"
echo "  • Re-build UI:  cd webview && npm run build"
echo "  • Package VSIX: npm run package"
echo ""
