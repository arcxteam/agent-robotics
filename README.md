<div align="center">
  
# ARC SPATIAL - Autonomous Robotics Control

*Launch and Fund Startup – Edition 1 - AI Meets Robotics Hackathon 2026 built by Google Studio - Surge - LabLab.ai - VULTR - Nvidia - Kiro (AWS)*

[Live Dashboard](https://arcspatial.portaltestnet.com) • [Presentation](/presentation) • [Hackathon 2026](https://lablab.ai/ai-hackathons/launch-fund-ai-meets-robotics)

</div>

---

## Overview

Transform Blueprint to Autonomous Execution - Empower your facility to perform autonomous material transport, optimize workflows, and enhance productivity with our intelligent robot fleet management system. From planning to measurable results.

---

## Quick Start

### 1. Setup Environment Variables

Copy `.env.example` to `.env`:

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

- **Frontend**: http://localhost:3000
- **Simulation**: http://localhost:3000/dashboard/simulation
- **Fleet WebSocket**: Port 3003 (auto-connected via Socket.IO)

---

## Simulation Overview

The simulation page (`/dashboard/simulation`) contains 5 tabs:

### Tab 1: 3D Robot Arm
- **3D pick-and-place** with React Three Fiber + Rapier physics
- **4 robot types**: Box Truck, Forklift, AMR (Autonomous Mobile Robot)
- **Auto Mode**: Automated task assignment with live activity feed
- **Floor Plan Integration**: Upload a floor plan image as ground texture
- **Controls**: Start/Pause/Reset/Auto + Task Creation + Add Material (all in top bar)
- **Zone Sync**: Automatically uses zones detected from Setup & Zones tab
- **How to use**:
  1. Click **Start** to begin
  2. Select an object from dropdown, pick a target zone, click **Task**
  3. Or enable **Auto** mode for automated tasks
  4. Robot will: pickup -> move to zone -> place -> continue

### Tab 2: Floor Plan
- **Upload PDF or image** floor plans
- **AI auto-detection**: Gemini AI detects zones (Meeting Room, Office, etc.)
- **Manual editing**: Drag and resize zones
- **How to use**:
  1. Click **Upload Floor Plan**
  2. Upload image/PDF
  3. AI will detect zones automatically
  4. Zones are saved and usable in 3D Robot Arm tab

### Tab 3: Fleet Simulation
- **Real-time 2D canvas** simulation with Socket.IO WebSocket
- **Multiple robots** with LiDAR visualization
- **A* pathfinding** with obstacle avoidance
- **Vertical layout**: Controls at top, canvas in middle, metrics + live activity below
- **Live Fleet Activity**: Real-time robot status tracking below canvas
- **Active Tasks Panel**: Real-time task progress tracking
- **How to use**:
  1. Ensure WebSocket server is running (`npm run ws:server`)
  2. Click **Start** to begin
  3. Click a robot to select, click canvas to move
  4. Create tasks: select object + target zone (compact controls above canvas)

### Tab 4: Setup & Zones
- **Upload environment map**
- **Zone Drawing Tool** with manual drawing
- **AI Detect** for auto-detecting zones from images
- **How to use**:
  1. Upload a map on the left panel
  2. Draw zones on the canvas with drag
  3. Double-click a zone to edit name/type
  4. Zones sync to all tabs (3D Robot Arm + Fleet Simulation)

### Tab 5: AI Planner
- **Natural language** task planning with Google Gemini AI
- **Task scheduling** optimization
- **Send tasks** directly to simulation
- **How to use**:
  1. Type a natural language command (e.g., "Move all steel beams to assembly area")
  2. AI generates a task plan
  3. Click **Send to Simulation**

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

**Example Objects Material:**
- [x] `STEEL_BEAM`, `CONCRETE_BLOCK`, `PIPE_SECTION`, `ELECTRICAL_PANEL`
- [x] `TOOL_BOX`, `SCAFFOLDING_PART`, `CEMENT_BAG`, `SAND_BAG`, `HVAC_UNIT`
- [x] `CARDBOARD_BOX`, `BRICK_PALLET`, `GRAVEL_BAG`, `TILE_STACK`, `WOOD_PLANK`
- [x] `REBAR_BUNDLE`, `MIXED_MATERIAL`, `SAFETY_EQUIPMENT`

Distribution: 30 in Material Storage, 10 in Staging Zone, 5 in Work Zone A.

---

## Track 3 Alignment

**Robotic Interaction and Task Execution (Simulation-First)**

This project builds a simulation-based robotic system that performs concrete physical tasks:
- **Pick and Place** - Picking up and placing construction materials
- **Sorting** - Sorting items by type
- **Fleet Coordination** - Multi-robot coordination with AI scheduling
- **AI Scheduling** - Task planning with Google Gemini 2.0 Flash

### Domain: Construction & Facilities

Robots operate in a construction environment with:
- 45 construction objects across 17 material types
- 6 zones (Material Storage, Assembly, Staging, Charging, Work Zone, Inspection)
- 4 robots (2 Mobile Manipulators, 1 Forklift, 1 Transport)

---

## Project Structure

```
/workspaces/armada-robot/
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

## Key Features

### 1. Landing Page
- Animated hero with gradient backgrounds
- Features showcase with technology stack
- Platform capabilities section
- Pricing tiers
- Responsive design

### 2. Dashboard
- Overview stats (active robots, tasks, sites)
- Fleet status monitoring
- Recent activity feed
- Quick actions

### 3. 3D Simulation (Three.js + Rapier)
- 3D pick-and-place with physics engine
- 4 robot types with animations
- Auto mode with live activity feed
- Floor plan ground texture overlay
- Inline task creation and material addition in top control bar
- Zone sync from Setup & Zones tab

### 4. 2D Fleet Simulation (Canvas + WebSocket)
- Real-time canvas rendering via Socket.IO
- Multiple robots with LiDAR visualization
- A* pathfinding with obstacle avoidance
- Battery indicators and status badges
- Zoom and pan controls
- Vertical layout with live fleet activity and task tracking below canvas
- Compact task creation and material controls above canvas

### 5. AI Integration
- **Google Gemini 2.0 Flash**: Task scheduling, task planning, floor plan analysis
- **z.ai GLM-4.7**: Backup LLM for scheduling
- Natural language task commands
- Multi-factor optimization (battery, distance, capability)

### 6. Floor Plan Management
- Upload PDF or image floor plans
- AI-powered zone detection (Gemini)
- Manual zone drawing tool
- Zone sync across all simulation tabs

### 7. Analytics Dashboard
- Throughput chart (Area)
- Task completion (Bar)
- Robot utilization (Horizontal Bar)
- Task distribution (Pie)
- Battery consumption (Line)

---

## API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api` | GET | Health check |
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
| `simulation:speed` | Set time multiplier (0.1x - 5x) |
| `task:create` | Create pick-and-place task |
| `task:create-bulk` | Create multiple tasks |
| `task:sort` | Sort objects in a zone |
| `task:assemble` | Assemble components |
| `robot:move/stop` | Manual robot control |
| `ai:schedule` | AI auto-assign tasks (Gemini) |
| `object:create` | Spawn new object |

**Server to Client:**

| Event | Description |
|-------|-------------|
| `simulation:state` | Full state broadcast (every tick) |
| `simulation:started/paused/stopped` | State change confirmations |
| `task:created/failed/cancelled` | Task lifecycle events |

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
pm2 start npm --name "next-app" -- start
pm2 start npm --name "ws-server" -- run ws:server
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
| Google Gemini | @google/genai 1.39.0 | AI scheduling, planning |
| Recharts | 2.15.4 | Charts & analytics |
| Framer Motion | 12.23.2 | Animations |
| Zustand | 5.0.6 | State management |
| Zod | 4.0.2 | Validation |

---

## Documentation

| File | Description |
|------|-------------|
| [README.md](#) | Project overview & quick start |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture & technical design |
| [SOLVING-CASE.md](./SOLVING-CASE.md) | Problem solving & business model |
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Setup & troubleshooting |

---