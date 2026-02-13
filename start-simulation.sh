#!/bin/bash

# RoboOps Intelligence - Simulation Startup Script
# Runs all simulation services

echo "=========================================="
echo "  RoboOps Intelligence - Simulation"
echo "  Track 3: Pick-and-Place Operations"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Run this script from the project root directory"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $SIM_SERVER_PID 2>/dev/null
    kill $PYBULLET_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Fleet Simulation Server (WebSocket on port 3003)
echo -e "\n${BLUE}[1/3] Starting WebSocket Simulation Server...${NC}"
npx tsx websocket-services/websocket-server.ts &
SIM_SERVER_PID=$!
sleep 2

if kill -0 $SIM_SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✓ WebSocket Simulation server started (PID: $SIM_SERVER_PID)${NC}"
    echo "  WebSocket: ws://localhost:3003"
else
    echo -e "${RED}Warning: WebSocket Simulation server may have failed${NC}"
fi

# Start PyBullet simulation server (optional)
echo -e "\n${BLUE}[2/3] Starting PyBullet Simulation Server...${NC}"
if [ -f "simulation/robot_server.py" ]; then
    cd simulation
    python robot_server.py &
    PYBULLET_PID=$!
    cd ..
    sleep 2
    if kill -0 $PYBULLET_PID 2>/dev/null; then
        echo -e "${GREEN}✓ PyBullet server started (PID: $PYBULLET_PID)${NC}"
    fi
else
    echo -e "${YELLOW}Skipping PyBullet (not required)${NC}"
fi

# Start Next.js development server
echo -e "\n${BLUE}[3/3] Starting Next.js Frontend...${NC}"
npm run dev &
NEXTJS_PID=$!

# Wait for Next.js to start
sleep 5

if kill -0 $NEXTJS_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Next.js server started (PID: $NEXTJS_PID)${NC}"
    echo "  Dashboard: http://localhost:3000/dashboard/simulation"
else
    echo -e "${RED}Error: Next.js server failed to start${NC}"
    cleanup
fi

echo -e "\n${GREEN}=========================================="
echo "  All servers running!"
echo "=========================================="
echo -e "${NC}"
echo ""
echo "🌐 Open your browser to:"
echo "   http://localhost:3000/dashboard/simulation"
echo ""
echo "📋 Available Tabs:"
echo "   - 3D Robot Arm: Multiple robots (box truck, forklift, AMR)"
echo "   - Floor Plan: Upload PDF/image for AI zone detection"
echo "   - Fleet Simulation: Real-time fleet control (WebSocket)"
echo "   - Setup & Zones: Manual zone drawing"
echo "   - AI Planner: Gemini AI task planning"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for all processes
wait

# Wait for any process to exit
wait
