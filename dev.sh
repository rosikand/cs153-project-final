#!/usr/bin/env bash
# Launch Parallax: FastAPI backend + Vite frontend together.
# Usage: ./dev.sh   then open http://localhost:5173
set -e
cd "$(dirname "$0")"

if [ ! -f backend/.env ]; then
  echo "⚠  backend/.env not found. Copy backend/.env.example to backend/.env and add your ANTHROPIC_API_KEY."
  exit 1
fi

# Start backend.
( cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload ) &
BACK=$!

# Start frontend.
( cd frontend && npm run dev ) &
FRONT=$!

echo ""
echo "  ◐ Parallax running"
echo "    Frontend → http://localhost:5173"
echo "    Backend  → http://localhost:8000/api/health"
echo ""

# Shut both down together on Ctrl-C.
trap "kill $BACK $FRONT 2>/dev/null" EXIT
wait
