<div align="center">

# ARC SPATIAL - Autonomous Robotics Control

*Launch and Fund Startup – Edition 1 - AI Meets Robotics Hackathon 2026 built by Google Studio - Surge - LabLab.ai - VULTR - Nvidia - Kiro (AWS)*

[Live Dashboard](https://arcspatial.portaltestnet.com) • [Presentation](/presentation) • [Hackathon 2026](https://lablab.ai/ai-hackathons/launch-fund-ai-meets-robotics)

</div>

---

## Overview

Transform Blueprint to Autonomous Execution - Empower your facility to perform autonomous material transport, optimize workflows, and enhance productivity with our intelligent robot fleet management system. From planning to measurable results.

---

## Key Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **3D Robot Arm** | 3D pick-and-place simulation with physics engine, auto mode, and floor plan integration |
| 2 | **Floor Plan** | Upload PDF/image floor plans with AI-powered zone detection (Gemini Vision) |
| 3 | **Fleet Simulation** | Real-time 2D fleet simulation with LiDAR, A* pathfinding, and AI auto-scheduling |
| 4 | **Setup & Zones** | Upload maps, draw zones manually or auto-detect with AI, sync across all tabs |
| 5 | **AI Planner** | Natural language task planning powered by Google Gemini 2.0 Flash |
| 6 | **Analytics** | Fleet performance dashboard with charts (throughput, utilization, battery) |
| 7 | **Dashboard** | Overview stats, fleet monitoring, activity feed, and quick actions |

<details>
<summary><b>Feature Details</b></summary>

### 3D Simulation (Three.js + Rapier)
- 3D pick-and-place with physics engine
- 4 robot types with animations
- Auto mode — automated task creation & delivery every 800ms
- Floor plan ground texture overlay
- Inline task creation and material addition in top control bar
- Zone sync from Setup & Zones tab

### 2D Fleet Simulation (Canvas + WebSocket)
- Real-time canvas rendering via Socket.IO
- Multiple robots with LiDAR visualization
- A* pathfinding with obstacle avoidance
- Battery indicators and status badges
- Zoom (mouse wheel) and pan (drag) controls with fullscreen
- Speed control 0.1x — 10x
- AI Auto-Schedule: one-click auto task creation & robot assignment
- Bulk task mode for multiple objects
- View toggles: Zones, Paths, LiDAR, Robot Labels
- Active click effects on all buttons
- Live fleet activity and task tracking below canvas

### AI Integration
- **Google Gemini 2.0 Flash**: Task scheduling, task planning, floor plan analysis
- Natural language task commands
- Multi-factor optimization (battery, distance, capability, gripper availability)

### Setup & Zones
- Upload floor plans (PDF, PNG, JPG, SVG, DXF, DWG — up to 50MB)
- AI-powered zone detection with Gemini Vision (auto-detect rooms, areas, stations)
- Manual zone drawing tool (draw, select, resize, edit)
- Zone types: Material Storage, Assembly Area, Staging Zone, Work Zone, Charging Station, Robot Home, Restricted Area, Inspection Point, and more
- Zone sync across all simulation tabs — robots navigate using these zones

### Analytics Dashboard
- Throughput chart (Area)
- Task completion (Bar)
- Robot utilization (Horizontal Bar)
- Task distribution (Pie)
- Battery consumption (Line)

</details>

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | React framework (standalone output) |
| React | 19.2.4 | UI components |
| Three.js | 0.182.0 | 3D robot visualization |
| React Three Fiber | 9.5.0 | React Three.js bindings |
| @react-three/rapier | 2.2.0 | 3D physics engine |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui (Radix) | — | Accessible UI components |
| Socket.IO | 4.8.3 | Real-time WebSocket |
| Prisma | 6.19.2 | Database ORM |
| Google Gemini | @google/genai 1.39.0 | AI scheduling, planning, vision |
| Recharts | 2.15.4 | Charts & analytics |
| Framer Motion | 12.23.2 | Animations |
| Zustand | 5.0.6 | State management |
| Zod | 4.0.2 | Validation |

---

## Quick Start

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# REQUIRED - Google Gemini for AI Scheduling & Task Planning
GEMINI_API_KEY="your-gemini-api-key-here"
GOOGLE_AI_API_KEY="your-gemini-api-key-here"

# Database (default: file-based SQLite for development)
DATABASE_URL="file:./db/arcspatial.db"
# PostgreSQL (production):
DATABASE_URL="postgres://user:password@host:5432/xxxxxx?sslmode=require"

# ROS 2 Bridge (optional - for Gazebo/Isaac Sim integration)
ROS_BRIDGE_URL="ws://localhost:9090"
GAZEBO_URL="http://localhost:11345"

NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="ARC SPATIAL"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Dev: http://localhost:3003
# Pro: https://your-domain.com
NEXT_PUBLIC_WS_URL="http://localhost:3003"
NEXT_PUBLIC_WS_PORT="3003"
```

**How to get API Keys:**
- **Gemini**: https://aistudio.google.com/apikey

### 2. Install Dependencies

```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Start the Application

**Option A: Run both services concurrently (recommended):**
```bash
npm run dev:all
```

**Option B: Run manually in 2 terminals:**

Terminal 1 - Next.js Frontend/Backend:
```bash
npm run dev
# Runs at http://localhost:3000
```

Terminal 2 - WebSocket Simulation Server:
```bash
npm run ws:server
# Runs at http://localhost:3003
```

### 4. Access Application

| Page | URL |
|------|-----|
| Frontend | http://localhost:3000 |
| Simulation | http://localhost:3000/dashboard/simulation |
| Simulation Status API | http://localhost:3000/api/ws-status |
| WebSocket Health | http://localhost:3003/health |
| Full Simulation State | http://localhost:3003/api/status |

---

## Simulation Overview

The simulation page (`/dashboard/simulation`) contains **5 tabs**:

### Tab 1: 3D Robot Arm
- **3D pick-and-place** with React Three Fiber + Rapier physics
- **4 robot types**: Box Truck, Forklift, AMR (Autonomous Mobile Robot)
- **Auto Mode**: Automated task creation & assignment every 800ms — robots autonomously pick materials and deliver to target zones
- **Floor Plan Integration**: Upload a floor plan image as ground texture
- **Controls**: Start/Pause/Reset/Auto + Task Creation + Add Material (all in top bar)
- **Zone Sync**: Automatically uses zones detected from Setup & Zones tab
- **How to use**:
  1. Click **Start** to begin
  2. Select an object from dropdown, pick a target zone, click **Task**
  3. Or enable **Auto** mode — robots will continuously pick & deliver materials
  4. Robot will: pickup -> move to zone -> place -> continue

### Tab 2: Floor Plan
- **Upload PDF or image** floor plans (PNG, JPG, SVG, DXF, DWG — up to 50MB)
- **AI auto-detection**: Gemini AI detects zones (Meeting Room, Office, Kitchen, etc.) from layout image
- **Manual editing**: Drag and resize zones on the floor plan
- **How to use**:
  1. Click **Upload Floor Plan** — drag & drop or browse files
  2. Upload image/PDF
  3. AI will detect zones automatically
  4. Zones are saved and usable in 3D Robot Arm & Fleet Simulation tabs

### Tab 3: Fleet Simulation
- **Real-time 2D canvas** simulation with Socket.IO WebSocket
- **Multiple robots** with LiDAR visualization
- **A* pathfinding** with obstacle avoidance
- **Speed control 0.1x — 10x** for fast-forward simulation
- **AI Auto-Schedule** (Zap button): Automatically creates pick-and-place tasks and assigns robots — no manual task creation needed
- **Bulk Task Mode**: Select multiple objects and create tasks in batch
- **View Toggles**: Zones, Paths, LiDAR, Robot Labels — each with visual on/off indicator
- **Zoom & Pan**: Mouse wheel zoom (non-blocking scroll), drag to pan, fullscreen mode
- **Live Fleet Activity**: Real-time robot status tracking below canvas
- **Active Tasks Panel**: Real-time task progress with step counter
- **How to use**:
  1. Ensure WebSocket server is running (`npm run ws:server`)
  2. Click **Start** to begin
  3. Click the **Zap** button for AI auto-scheduling (robots auto-pick & deliver)
  4. Or create tasks manually: select object + target zone + click **Task**
  5. Click a robot to select, click canvas to move manually

### Tab 4: Setup & Zones
- **Upload Environment Map**: Drag & drop or click to upload floor plans (PDF, PNG, JPG, SVG, DXF, DWG — max 50MB)
- **AI Detect**: Click to auto-detect zones from uploaded map using Google Gemini Vision — identifies rooms, areas, and suggests zone types (Office, Kitchen, Material Storage, Charging Station, etc.)
- **Zone Drawing Tool**: Manually draw zones on the canvas
  - Click **Draw** mode, drag on canvas to create zone rectangles
  - Choose zone type from dropdown (Material Storage, Assembly Area, Staging Zone, Work Zone, Charging Station, Robot Home, Restricted Area, Inspection Point, and more)
  - Set zone name, color, and capacity
  - Click **Select** mode to drag/resize existing zones
  - Double-click a zone to edit properties
- **Zone Sync**: All zones sync automatically to 3D Robot Arm and Fleet Simulation tabs — robots navigate using these zones
- **How to use**:
  1. Upload a map on the left panel (drag & drop floor plan)
  2. Click **AI Detect** to auto-detect zones, or draw manually with **Draw** tool
  3. Edit zone names and types as needed (double-click to edit)
  4. Zones sync live to all simulation tabs

### Tab 5: AI Planner
- **Natural language** task planning with Google Gemini AI
- **Task scheduling** optimization — analyzes fleet state, battery levels, and distances
- **Send tasks** directly to simulation — generated plans can be pushed to robots
- **How to use**:
  1. Type a natural language command (e.g., "Move all steel beams to assembly area")
  2. AI generates a task plan with robot assignments
  3. Click **Send to Simulation** to execute

---

## Simulation Data

### Robots (4 units)

| ID | Name | Type |
|----|------|------|
| `robot-mm-01` | Mobile Manipulator 01 | MOBILE_MANIPULATOR |
| `robot-mm-02` | Mobile Manipulator 02 | MOBILE_MANIPULATOR |
| `robot-forklift-01` | Forklift 01 | FORKLIFT |
| `robot-transport-01` | Transport Robot 01 | AMR_TRANSPORT |

### Zones (6 zones)

| ID | Name | Type |
|----|------|------|
| `zone-material-storage` | Material Storage | MATERIAL_STORAGE |
| `zone-assembly` | Assembly Area | ASSEMBLY_AREA |
| `zone-staging` | Staging Zone | STAGING_ZONE |
| `zone-charging` | Charging Station | CHARGING_STATION |
| `zone-work-1` | Work Zone A | WORK_ZONE |
| `zone-inspection` | Inspection Point | INSPECTION_POINT |

### Objects (45 total, 17 types)

**Construction Materials:**
- [x] `STEEL_BEAM`, `CONCRETE_BLOCK`, `PIPE_SECTION`, `ELECTRICAL_PANEL`
- [x] `TOOL_BOX`, `SCAFFOLDING_PART`, `CEMENT_BAG`, `SAND_BAG`, `HVAC_UNIT`
- [x] `CARDBOARD_BOX`, `BRICK_PALLET`, `GRAVEL_BAG`, `TILE_STACK`, `WOOD_PLANK`
- [x] `REBAR_BUNDLE`, `MIXED_MATERIAL`, `SAFETY_EQUIPMENT`

Distribution: 30 in Material Storage, 10 in Staging Zone, 5 in Work Zone A.

---

## Track 3 Alignment

**Robotic Interaction and Task Execution (Simulation-First)**

This project builds a simulation-based robotic system that performs concrete physical tasks:

| Task | Description |
|------|-------------|
| **Pick and Place** | Picking up and placing construction materials |
| **Sorting** | Sorting items by type |
| **Fleet Coordination** | Multi-robot coordination with AI scheduling |
| **AI Scheduling** | Task planning with Google Gemini 2.0 Flash |

**Domain: Construction & Facilities** — Robots operate in a construction environment with 45 objects across 17 material types, 6 zones, and 4 robots.

---

## API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api` | GET | Health check |
| `/api/ws-status` | GET | Full simulation status (fleet, tasks, objects, zones, metrics) |
| `/api/environments` | GET/POST | List/Create environments |
| `/api/environments/[id]` | GET/PUT/DELETE | Environment CRUD |
| `/api/robots` | GET/POST | List/Create robots |
| `/api/tasks` | GET/POST/PUT | List/Create/Update tasks |
| `/api/zones` | GET/POST | List/Create zones |
| `/api/upload` | POST | Upload files (images, PDFs) |
| `/api/upload/[...path]` | GET | Serve uploaded files |
| `/api/pdf-to-image` | POST | Convert PDF to image |

### AI Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/gemini` | POST | Direct Gemini AI proxy |
| `/api/ai/analyze-map` | POST | AI floor plan analysis & zone detection |
| `/api/ai/plan-task` | POST | AI task planning (natural language) |
| `/api/ai/schedule` | POST | AI auto-scheduling for robots |

### WebSocket Events (Port 3003)

**Client to Server:**

| Event | Description |
|-------|-------------|
| `simulation:start/pause/stop/reset` | Control simulation state |
| `simulation:speed` | Set time multiplier (0.1x - 10x) |
| `task:create` | Create pick-and-place task |
| `task:create-bulk` | Create multiple tasks |
| `task:sort` | Sort objects in a zone |
| `task:assemble` | Assemble components |
| `robot:move/stop` | Manual robot control |
| `ai:schedule` | AI auto-create & assign tasks to idle robots |
| `object:create` | Spawn new object |

**Server to Client:**

| Event | Description |
|-------|-------------|
| `simulation:state` | Full state broadcast (every tick) |
| `simulation:started/paused/stopped` | State change confirmations |
| `task:created/failed/cancelled` | Task lifecycle events |

### Simulation REST API (WebSocket Server - Port 3003)

The WebSocket server also exposes REST endpoints for monitoring and integration:

| Endpoint | URL | Description |
|----------|-----|-------------|
| Health Check | `GET /health` | Basic status: `{"status":"ok","connections":N}` |
| Full Status | `GET /api/status` | Complete simulation state with fleet, tasks, objects, zones, metrics |
| Socket.IO | `GET /socket.io/?EIO=4&transport=polling` | Socket.IO handshake |

**Production URLs (via nginx):**

| Endpoint | Production URL |
|----------|----------------|
| Full Status (Next.js) | `https://arcspatial.portaltestnet.com/api/ws-status` |
| Full Status (nginx) | `https://arcspatial.portaltestnet.com/ws-health` |
| Socket.IO Handshake | `https://arcspatial.portaltestnet.com/socket.io/?EIO=4&transport=polling` |
| Dashboard UI | `https://arcspatial.portaltestnet.com/dashboard/simulation` |

<details>
<summary><b>Example Response</b> — <code>GET /api/ws-status</code></summary>

```json
{
  "status": "ok",
  "service": "ArcSpatial Simulation Server",
  "timestamp": "2026-02-13T16:19:36.416Z",
  "connections": 3,
  "simulation": {
    "name": "Construction Site Alpha",
    "state": "RUNNING",
    "environment": "CONSTRUCTION_SITE",
    "tick": 1542,
    "speed": 1,
    "uptime": 385
  },
  "fleet": {
    "total": 4, "active": 3, "idle": 0, "charging": 1,
    "robots": [
      { "name": "Mobile Manipulator 01", "status": "CARRYING", "battery": 72, "position": { "x": 450, "y": 320 } },
      { "name": "Forklift 01", "status": "MOVING", "battery": 65, "position": { "x": 200, "y": 500 } }
    ]
  },
  "tasks": { "pending": 2, "inProgress": 3, "completed": 18, "failed": 1, "total": 24 },
  "objects": { "total": 45, "available": 22, "beingCarried": 3, "delivered": 20, "types": ["STEEL_BEAM", "CEMENT_BAG", "...17 types"] },
  "zones": { "total": 6, "list": [{ "name": "Material Storage", "type": "MATERIAL_STORAGE" }, "..."] },
  "metrics": {
    "totalTasksCompleted": 18, "totalTasksFailed": 1,
    "averageTaskTime": 12.4, "fleetEfficiency": 0.85, "pickSuccessRate": 0.95
  }
}
```

</details>

---

## Deployment

### Development
```bash
npm run dev:all    # Start Next.js + WebSocket server concurrently
```

### Docker
```bash
npm run docker:build    # Build image
npm run docker:run      # Run with .env file
```

### Production (PM2)
```bash
pm2 start npm --name "robot" -- start
pm2 start npm --name "robot-ws" -- run ws:server
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev -p 3000` | Start Next.js dev server |
| `build` | `next build + copy static` | Build for production |
| `start` | `node .next/standalone/server.js` | Start production server |
| `ws:server` | `tsx websocket-services/websocket-server.ts` | Start WebSocket server |
| `ws:build` | `tsc websocket-server.ts` | Compile WebSocket to JS |
| `dev:all` | `concurrently dev + ws:server` | Start both services |
| `db:push` | `prisma db push` | Push schema to database |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `docker:build` | `docker build -t arc-spatial .` | Build Docker image |
| `docker:run` | `docker run ... arc-spatial` | Run Docker container |

---

## Project Structure

```
/workspaces/agent-robotics/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing page
│   │   ├── globals.css               # Global styles
│   │   ├── api/                      # API Routes
│   │   │   ├── ai/
│   │   │   │   ├── gemini/           # Gemini AI proxy
│   │   │   │   ├── analyze-map/      # AI floor plan analysis
│   │   │   │   ├── plan-task/        # AI task planning
│   │   │   │   └── schedule/         # AI auto-scheduling
│   │   │   ├── upload/               # File upload (images, PDFs)
│   │   │   ├── environments/         # Environment CRUD
│   │   │   ├── robots/               # Robot CRUD
│   │   │   ├── tasks/                # Task CRUD
│   │   │   ├── ws-status/            # WebSocket simulation status API
│   │   │   └── zones/                # Zone CRUD
│   │   └── dashboard/                # Dashboard app
│   │       ├── layout.tsx            # Dashboard shell (sidebar)
│   │       ├── page.tsx              # Overview page
│   │       ├── simulation/           # Live simulation (5 tabs)
│   │       ├── environments/         # Environment management
│   │       ├── robots/               # Robot fleet management
│   │       ├── tasks/                # Task management
│   │       ├── analytics/            # Analytics dashboard
│   │       ├── settings/             # Settings page
│   │       └── team/                 # Team management
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (40+)
│   │   └── simulation/              # Simulation components
│   │       ├── Robot3DSimulation.tsx  # 3D Robot Arm (Three.js + Rapier)
│   │       ├── ConstructionSimulation.tsx # Fleet Simulation (2D Canvas)
│   │       ├── FloorPlanViewer.tsx    # Floor Plan Upload & AI Detection
│   │       ├── ZoneDrawingTool.tsx    # Zone Drawing Tool
│   │       ├── MapUploader.tsx        # Map Upload Component
│   │       ├── AITaskPlanner.tsx      # AI Task Planner
│   │       ├── RosBridgeConnector.tsx # ROS2 Bridge Integration
│   │       └── SimulationCanvas.tsx   # Legacy 2D Canvas
│   └── lib/
│       ├── db.ts                     # Prisma client
│       ├── gemini.ts                 # Google Gemini AI integration
│       ├── llm.ts                    # z.ai LLM integration (backup)
│       ├── sensors.ts                # Sensor simulation (LiDAR, camera)
│       ├── utils.ts                  # Utility functions
│       ├── websocket-url.ts          # WebSocket URL detection
│       ├── simulation-context.tsx    # Simulation state context
│       └── robotics/                 # Core robotics engine
│           ├── index.ts              # Factory functions
│           ├── robot-interface.ts    # Types & interfaces
│           ├── simulated-controller.ts # Browser physics
│           ├── ai-decision-engine.ts # Gemini AI decisions
│           ├── navigation-service.ts # A* pathfinding
│           └── simulation-manager.ts # Orchestration
├── websocket-services/
│   └── websocket-server.ts          # Socket.IO simulation engine
├── prisma/
│   └── schema.prisma                # Database schema
├── Dockerfile                        # Multi-stage Docker build
├── example.nginx.conf                # Nginx reverse proxy config
├── .env.example                      # Environment template
└── upload/                           # Uploaded maps & floor plans
```

---

## Documentation

| File | Description |
|------|-------------|
| [README.md](#) | Project overview & quick start |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture & technical design |
| [SOLVING-CASE.md](./SOLVING-CASE.md) | Problem solving & business model |
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Setup & troubleshooting |

---
