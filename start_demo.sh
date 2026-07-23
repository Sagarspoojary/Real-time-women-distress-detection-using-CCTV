#!/bin/bash

# ============================================================
#  Women Distress AI — Demo Startup Script
#  Starts backend + frontend in one click
#  Usage: ./start_demo.sh
# ============================================================

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/sagars/Documents/Women_Distress_AI"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Women Distress AI — Demo Launcher        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Start Backend ────────────────────────────────────
echo -e "${YELLOW}[1/3] Starting FastAPI Backend...${NC}"
osascript -e "tell app \"Terminal\" to do script \"
    cd $PROJECT_DIR
    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    echo '  BACKEND — FastAPI Server'
    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    source venv/bin/activate
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
\""
sleep 3
echo -e "${GREEN}  ✓ Backend starting on http://localhost:8000${NC}"

# ── Step 2: Start ngrok tunnel ───────────────────────────────
echo -e "${YELLOW}[2/3] Starting ngrok tunnel for Backend...${NC}"
osascript -e "tell app \"Terminal\" to do script \"
    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    echo '  NGROK — Public Tunnel'
    echo '  Copy the https:// URL and paste in VITE_API_URL'
    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    sleep 2
    ngrok http 8000
\""
sleep 2
echo -e "${GREEN}  ✓ ngrok starting — copy the https URL from its window${NC}"

# ── Step 3: Start Frontend ───────────────────────────────────
echo -e "${YELLOW}[3/3] Starting React Frontend...${NC}"
osascript -e "tell app \"Terminal\" to do script \"
    cd $FRONTEND_DIR
    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    echo '  FRONTEND — React Dashboard'
    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    npm run dev
\""
sleep 2
echo -e "${GREEN}  ✓ Frontend starting on http://localhost:5173${NC}"

# ── Done ─────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  All services launching in new windows!      ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  Frontend:  http://localhost:5173            ║${NC}"
echo -e "${CYAN}║  Backend:   http://localhost:8000            ║${NC}"
echo -e "${CYAN}║  API Docs:  http://localhost:8000/docs       ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}║  IMPORTANT: Copy the ngrok https:// URL      ║${NC}"
echo -e "${CYAN}║  from the ngrok window and paste it into:    ║${NC}"
echo -e "${CYAN}║  frontend/.env  → VITE_API_URL=...           ║${NC}"
echo -e "${CYAN}║  Then restart: npm run dev in frontend       ║${NC}"
echo -e "${CYAN}║                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Open browser after a short delay
echo -e "${YELLOW}Opening dashboard in browser in 5 seconds...${NC}"
sleep 5
open http://localhost:5173
