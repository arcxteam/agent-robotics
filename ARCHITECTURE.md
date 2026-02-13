# Architecture - ARC SPATIAL Intelligence

## Track 3: Robotic Interaction and Task Execution

**Hackathon**: lablab.ai "Launch & Fund Your Startup" - AI Meets Robotics
**Domain**: Construction & Facilities
**Focus**: Pick-and-place, sorting, organizing, and assembly tasks in simulation

### Challenge Requirements
- Simulation-based robotic system (software-only, browser-accessible)
- Pick and place construction materials
- Multi-robot fleet coordination
- AI-powered task scheduling (Google Gemini 2.0 Flash)
- Real-time WebSocket updates (Socket.IO)
- Production-ready web application deployed on Vultr

---

## High-Level Architecture

```
+-------------------------------------------------------------------+
|                        CLIENT LAYER                                |
|                       (Browser-Based)                              |
|                                                                    |
|   +-------------+   +-------------+   +-------------+             |
|   |   Desktop   |   |   Mobile    |   |   Tablet    |             |
|   |   Browser   |   |   Browser   |   |   Browser   |             |
|   +------+------+   +------+------+   +------+------+             |
|          +------------------+------------------+                   |
|                             |                                      |
|                    +--------v--------+                             |
|                    |   Next.js 16    |                             |
|                    |  React 19 SPA   |                             |
|                    |  + Three.js 3D  |                             |
|                    |  + Canvas 2D    |                             |
|                    |  + Socket.IO    |                             |
|                    +--------+--------+                             |
+-----------------------------+--------------------------------------+
                              |
+-----------------------------+--------------------------------------+
|                     GATEWAY LAYER                                  |
|                (Nginx Reverse Proxy)                               |
|   - SSL termination (HTTPS)                                       |
|   - /socket.io/ proxy to port 3003                                |
|   - /api proxy to port 3000                                       |
|   - Gzip compression                                              |
|   - Security headers (X-Frame-Options, CSP, etc.)                 |
+-----------------------------+--------------------------------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
+--------v--------+  +-------v--------+  +--------v-------+
|   Next.js       |  |   WebSocket    |  |   Google       |
|   API Server    |  |   Simulation   |  |   Gemini AI    |
|   (Port 3000)   |  |   (Port 3003)  |  |   (External)   |
+--------+--------+  +-------+--------+  +--------+-------+
         |                    |                    |
         |           +--------v--------+           |
         |           |   Simulation    |           |
         |           |   Engine        |-----------+
         |           |   - A* Path     |
         |           |   - Physics     |
         |           |   - Task Exec   |
         |           +--------+--------+
         |                    |
         +--------------------+
                              |
+-----------------------------v--------------------------------------+
|                        DATA LAYER                                  |
|   +-------------+   +--------------------+                        |
|   | SQLite      |   | File Storage       |                        |
|   | (Prisma)    |   | (upload/ dir)      |                        |
|   | Dev DB      |   | Floor plans, maps  |                        |
|   +-------------+   +--------------------+                        |
+-------------------------------------------------------------------+

+-------------------------------------------------------------------+
|                      EXTERNAL SERVICES                            |
|   +-------------+   +-------------+   +-------------+            |
|   | Google      |   |   z.ai LLM  |   |   Vultr     |            |
|   | Gemini 2.0  |   |   (Backup)  |   |   VM Host   |            |
|   | Flash       |   |             |   |             |            |
|   +-------------+   +-------------+   +-------------+            |
+-------------------------------------------------------------------+
```

---

## Construction Site Domain Model

### Simulation Robots (4 units)

| ID | Name | Type | Capabilities |
|----|------|------|-------------|
| `robot-mm-01` | Mobile Manipulator 01 | MOBILE_MANIPULATOR | Pick-and-place with robotic arm |
| `robot-mm-02` | Mobile Manipulator 02 | MOBILE_MANIPULATOR | Pick-and-place with robotic arm |
| `robot-forklift-01` | Forklift 01 | FORKLIFT | Heavy lifting operations |
| `robot-transport-01` | Transport Robot 01 | AMR_TRANSPORT | Autonomous mobile transport |

### Simulation Zones (6 zones)

| ID | Name | Type | Purpose |
|----|------|------|---------|
| `zone-material-storage` | Material Storage | MATERIAL_STORAGE | Storage for construction materials |
| `zone-assembly` | Assembly Area | ASSEMBLY_AREA | Where materials are assembled |
| `zone-staging` | Staging Zone | STAGING_ZONE | Temporary staging for transport |
| `zone-charging` | Charging Station | CHARGING_STATION | Robot charging points |
| `zone-work-1` | Work Zone A | WORK_ZONE | Active work areas |
| `zone-inspection` | Inspection Point | INSPECTION_POINT | Quality inspection areas |

### Construction Materials (17 object types, 45 objects)

| Object Type | Description |
|-------------|-------------|
| STEEL_BEAM | Structural steel beams |
| CONCRETE_BLOCK | Building blocks |
| PIPE_SECTION | Plumbing/HVAC pipes |
| ELECTRICAL_PANEL | Electrical components |
| HVAC_UNIT | HVAC equipment |
| TOOL_BOX | Worker tools |
| SAFETY_EQUIPMENT | Safety gear |
| SCAFFOLDING_PART | Scaffolding components |
| CEMENT_BAG | Bags of cement |
| SAND_BAG | Bags of sand |
| CARDBOARD_BOX | Packaging materials |
| BRICK_PALLET | Pallets of bricks |
| GRAVEL_BAG | Bags of gravel |
| TILE_STACK | Stacks of tiles |
| WOOD_PLANK | Wooden planks |
| REBAR_BUNDLE | Rebar bundles |
| MIXED_MATERIAL | Mixed materials |

**Distribution**: 30 objects in Material Storage, 10 in Staging Zone, 5 in Work Zone A.

---

## Real-Time Simulation Flow

### WebSocket Communication (Port 3003)

```
+----------------+     Socket.IO       +----------------+
|    Browser     | <------------------> |  Sim Server    |
|  (Client App)  |                      |  (Port 3003)   |
+-------+--------+                      +-------+--------+
        |                                       |
        | simulation:state (every tick)         |
        | <-------------------------------------+
        |                                       |
        | simulation:start/pause/stop/reset     |
        +-------------------------------------->|
        |                                       |
        | simulation:speed (0.1x - 5x)          |
        +-------------------------------------->|
        |                                       |
        | task:create (objectId, targetZoneId)   |
        +-------------------------------------->|
        |                                       |
        | task:create-bulk (objectIds[])         |
        +-------------------------------------->|
        |                                       |
        | task:sort / task:assemble              |
        +-------------------------------------->|
        |                                       |
        | robot:move / robot:stop                |
        +-------------------------------------->|
        |                                       |
        | ai:schedule (Gemini)                   |
        +-------------------------------------->|
        |                                       |
        | object:create                          |
        +-------------------------------------->|
        |                                       |
        | task:created / task:failed             |
        | <-------------------------------------+
        |                                       |
        | simulation:started/paused/stopped      |
        | <-------------------------------------+
```

### Client-to-Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `simulation:start` | — | Start simulation loop |
| `simulation:pause` | — | Pause simulation |
| `simulation:stop` | — | Stop and reset simulation |
| `simulation:reset` | — | Reset to initial state |
| `simulation:speed` | `{ speed: number }` | Set time multiplier (0.1 - 5.0) |
| `task:create` | `{ objectId, targetZoneId, robotId? }` | Create a pick-and-place task |
| `task:create-bulk` | `{ objectIds[], targetZoneId }` | Create multiple tasks at once |
| `task:cancel` | `{ taskId }` | Cancel a pending/active task |
| `task:sort` | `{ zoneId, criteria }` | Sort objects in a zone |
| `task:assemble` | `{ componentIds[], targetZoneId }` | Assemble components |
| `robot:move` | `{ robotId, x, y }` | Manual robot movement |
| `robot:stop` | `{ robotId }` | Stop robot movement |
| `ai:schedule` | — | AI auto-assign all pending tasks |
| `object:create` | `{ type, zoneId }` | Spawn a new object |

### Server-to-Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `simulation:state` | Full state object | Broadcast every tick (robots, objects, tasks, metrics, zones) |
| `simulation:started` | — | Simulation has started |
| `simulation:paused` | — | Simulation paused |
| `simulation:stopped` | — | Simulation stopped |
| `task:created` | Task object | A task was successfully created |
| `task:failed` | `{ error }` | Task creation failed |
| `task:cancelled` | `{ taskId }` | Task was cancelled |

### Task Execution Flow (Pick and Place)

```
1. Task Created (via UI, AI Planner, or Bulk)
   |
   +-> AI Scheduler (Gemini 2.0 Flash)
   |   +-> Evaluate available robots (IDLE, battery > 30%)
   |   +-> Calculate optimal assignment (distance, battery, capability)
   |   +-> Return assignment with reasoning
   |
   +-> Task Assigned to Robot
   |
   +-> Task Execution Steps:
       |
       +-> Step 1: MOVE_TO_PICKUP (source object)
       |   +-> A* pathfinding
       |   +-> Collision avoidance
       |   +-> Battery consumption
       |
       +-> Step 2: PICKING
       |   +-> Approach object
       |   +-> Gripper close
       |   +-> Object status -> PICKED
       |
       +-> Step 3: MOVE_TO_DROP (target zone)
       |   +-> Path with object weight
       |   +-> Status -> CARRYING
       |   +-> Real-time position updates
       |
       +-> Step 4: PLACING
           +-> Navigate to placement point
           +-> Gripper open
           +-> Object status -> PLACED
           +-> Task status -> COMPLETED
           +-> Robot returns to IDLE
```

### Robot State Machine

```
          +-------------+
          |    IDLE     |
          +------+------+
                 | Task assigned
                 v
          +-------------+
     +--->|   MOVING    |<-----------+
     |    +------+------+            |
     |           | Reached object    |
     |           v                   |
     |    +-------------+            |
     |    |   PICKING   |            |
     |    +------+------+            |
     |           | Object grabbed    |
     |           v                   |
     |    +-------------+            |
     |    |  CARRYING   |------------+
     |    +------+------+  Moving to target
     |           | Reached target
     |           v
     |    +-------------+
     |    |   PLACING   |
     |    +------+------+
     |           | Object placed
     |           v
     |    +-------------+
     +----|    IDLE     |
          +-------------+

Battery < 20%:
  Any state --> MOVING to charging --> CHARGING --> IDLE
```

---

## Project Structure

```
/workspaces/armada-robot/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout with fonts, metadata
│   │   ├── page.tsx                      # Landing page (hero, features, tech stack)
│   │   ├── globals.css                   # Global styles (Tailwind CSS 4)
│   │   ├── pricing/
│   │   │   └── page.tsx                  # Pricing page
│   │   ├── api/
│   │   │   ├── route.ts                  # Health check endpoint
│   │   │   ├── environments/             # Environment CRUD
│   │   │   │   ├── route.ts              # GET/POST environments
│   │   │   │   └── [id]/route.ts         # GET/PUT/DELETE by ID
│   │   │   ├── robots/route.ts           # Robot CRUD
│   │   │   ├── tasks/route.ts            # Task CRUD
│   │   │   ├── zones/route.ts            # Zone CRUD
│   │   │   ├── upload/
│   │   │   │   ├── route.ts              # File upload (POST)
│   │   │   │   └── [...path]/route.ts    # Serve uploaded files (GET)
│   │   │   ├── pdf-to-image/route.ts     # PDF to image conversion
│   │   │   ├── ai/
│   │   │   │   ├── gemini/route.ts       # Gemini AI direct proxy
│   │   │   │   ├── analyze-map/route.ts  # AI floor plan analysis & zone detection
│   │   │   │   ├── plan-task/route.ts    # AI task planning (natural language)
│   │   │   │   └── schedule/route.ts     # AI auto-scheduling
│   │   │   ├── settings/
│   │   │   │   ├── api-keys/route.ts     # API key management
│   │   │   │   ├── database/route.ts     # Database config
│   │   │   │   └── webhooks/route.ts     # Webhook config
│   │   │   └── ros/bridge/route.ts       # ROS2 bridge integration
│   │   └── dashboard/
│   │       ├── layout.tsx                # Dashboard shell (sidebar, nav)
│   │       ├── page.tsx                  # Overview stats
│   │       ├── simulation/page.tsx       # Main simulation page (5 tabs)
│   │       ├── environments/
│   │       │   ├── page.tsx              # Environment list
│   │       │   └── [id]/page.tsx         # Environment detail
│   │       ├── robots/
│   │       │   ├── page.tsx              # Robot fleet list
│   │       │   └── [id]/page.tsx         # Robot detail
│   │       ├── tasks/page.tsx            # Task management
│   │       ├── analytics/page.tsx        # Fleet analytics
│   │       ├── settings/page.tsx         # Settings
│   │       └── team/page.tsx             # Team management
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components (40+ components)
│   │   └── simulation/
│   │       ├── Robot3DSimulation.tsx      # 3D simulation (Three.js + Rapier)
│   │       ├── ConstructionSimulation.tsx # 2D canvas fleet simulation
│   │       ├── FloorPlanViewer.tsx        # Floor plan upload & AI detection
│   │       ├── ZoneDrawingTool.tsx        # Manual zone drawing tool
│   │       ├── MapUploader.tsx            # Map upload component
│   │       ├── AITaskPlanner.tsx          # AI task planner UI
│   │       ├── RosBridgeConnector.tsx     # ROS2 bridge integration UI
│   │       └── SimulationCanvas.tsx       # Legacy 2D canvas
│   ├── hooks/
│   │   ├── use-toast.ts                  # Toast notification hook
│   │   └── use-mobile.ts                 # Mobile detection hook
│   └── lib/
│       ├── db.ts                         # Prisma client instance
│       ├── gemini.ts                     # Google Gemini AI integration
│       ├── llm.ts                        # z.ai LLM integration (backup)
│       ├── sensors.ts                    # Sensor simulation (LiDAR, camera)
│       ├── utils.ts                      # Utility functions (cn, etc.)
│       ├── websocket-url.ts              # WebSocket URL detection
│       ├── simulation-context.tsx        # React context for simulation state
│       └── robotics/                     # Core robotics engine
│           ├── index.ts                  # Factory functions, exports
│           ├── robot-interface.ts        # IRobotController, types, interfaces
│           ├── simulated-controller.ts   # Browser-based physics simulation
│           ├── ai-decision-engine.ts     # Gemini-powered decision making
│           ├── navigation-service.ts     # A* pathfinding + map processing
│           └── simulation-manager.ts     # Orchestration & state management
├── websocket-services/
│   └── websocket-server.ts              # Socket.IO simulation engine (port 3003)
├── prisma/
│   └── schema.prisma                    # Database schema (PostgreSQL/SQLite)
├── public/                              # Static assets
├── upload/                              # Uploaded floor plans & maps
├── Dockerfile                           # Multi-stage Docker build
├── example.nginx.conf                   # Nginx reverse proxy config
├── next.config.ts                       # Next.js configuration (standalone)
├── package.json                         # Dependencies & scripts
├── .env.example                         # Environment variable template
└── tsconfig.json                        # TypeScript configuration
```

---

## Simulation Tabs (5 Tabs)

The main simulation page (`/dashboard/simulation`) has 5 tabs:

### Tab 1: 3D Robot Arm
- **Technology**: React Three Fiber + Rapier physics
- **Features**: 3D pick-and-place with 4 robot types (Box Truck, Forklift, AMR)
- **Modes**: Manual task assignment or Auto Mode
- **Controls**: Start/Pause/Reset/Auto + inline task creation + add material (all in top bar)
- **Floor Plan**: Upload a floor plan image to display as ground texture
- **Activity Feed**: Live auto-mode status showing robot actions in real-time
- **Zone Sync**: Receives AI-detected zones from Setup & Zones tab as `externalZones` prop

### Tab 2: Floor Plan
- **Technology**: Canvas 2D + Google Gemini AI
- **Features**: Upload PDF or image floor plan
- **AI Detection**: Gemini analyzes the image to detect zones (Meeting Room, Office, etc.)
- **Manual Editing**: Drag and resize zones manually

### Tab 3: Fleet Simulation
- **Technology**: Canvas 2D + Socket.IO WebSocket
- **Features**: Real-time 2D robot fleet simulation with LiDAR visualization
- **Layout**: Vertical stacking — controls at top, canvas in middle, metrics + live fleet activity + active tasks below
- **Pathfinding**: A* algorithm with obstacle avoidance
- **Connection**: WebSocket to simulation server (port 3003)
- **Controls**: Start/Pause/Stop/Reset + compact task creation + add material (above canvas)
- **Live Fleet Activity**: Real-time status display below canvas showing all robots and their current actions
- **Active Tasks Panel**: Real-time task progress tracking below fleet activity
- **Zone Sync**: Receives AI-detected zones from Setup & Zones tab, syncs to WebSocket server

### Tab 4: Setup & Zones
- **Technology**: Canvas 2D
- **Features**: Upload environment map, draw zones manually
- **AI Detect**: Auto-detect zones from uploaded images using Gemini Vision
- **Sync**: Zones sync to all other tabs (3D Robot Arm + Fleet Simulation)

### Tab 5: AI Planner
- **Technology**: Google Gemini 2.0 Flash
- **Features**: Natural language task planning
- **Usage**: Type commands like "Move all steel beams to assembly area"
- **Output**: Generates task plan and sends to simulation

---

## AI Integration

### Google Gemini 2.0 Flash (Primary)

Used for three purposes:

1. **Task Scheduling** (`/api/ai/schedule`): Evaluates available robots, pending tasks, and zone information to generate optimal task-robot assignments.

2. **Task Planning** (`/api/ai/plan-task`): Accepts natural language commands and generates structured task plans with object types, source/target zones, and robot assignments.

3. **Floor Plan Analysis** (`/api/ai/analyze-map`): Analyzes uploaded floor plan images to detect room types, zones, and spatial layout.

```typescript
// Gemini API integration (src/lib/gemini.ts)
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Task scheduling with low temperature for deterministic output
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: schedulingPrompt,
  config: { temperature: 0.3, maxOutputTokens: 2048 }
});
```

### z.ai GLM-4.7 (Backup)

Available as a fallback LLM for task scheduling via `/api/ai/schedule`.

---

## Database Schema (Prisma)

**Provider**: SQLite (development) / PostgreSQL (production)

### Key Models

| Model | Fields | Purpose |
|-------|--------|---------|
| Organization | id, name, plan | Multi-tenant support |
| User | id, email, role | User management (ADMIN, OPERATOR, VIEWER) |
| Environment | id, name, type, width, height, layout | Digital twin spaces |
| Robot | id, name, type, status, x, y, battery | Robot fleet tracking |
| Task | id, type, priority, status, items | Task management |
| TaskAssignment | robotId, taskId, status, timing | Robot-task mapping |
| Zone | id, name, type, bounds | Spatial zones |
| Obstacle | id, type, position, dimensions | Physical obstacles |
| ConstructionObject | id, type, weight, dimensions | Construction materials |
| Simulation | id, status, config, metrics | Simulation runs |

---

## Deployment

### Development

```bash
# Terminal 1 - Next.js frontend
npm run dev          # http://localhost:3000

# Terminal 2 - WebSocket simulation server
npm run ws:server    # ws://localhost:3003

# Or run both concurrently
npm run dev:all
```

### Production (Docker)

```bash
# Build image
docker build -t arc-spatial .

# Run container (exposes 3000 + 3003)
docker run -p 3000:3000 -p 3003:3003 --env-file .env arc-spatial
```

The Dockerfile uses multi-stage build:
1. **deps** stage: Install npm dependencies + generate Prisma
2. **builder** stage: Build Next.js (standalone output) + compile WebSocket TS to JS
3. **runner** stage: Minimal production image with non-root user

### Production (Nginx)

The `example.nginx.conf` provides a production Nginx configuration:
- HTTP to HTTPS redirect
- SSL termination
- `/socket.io/` proxy to port 3003 (WebSocket)
- `/api` proxy with disabled buffering (SSE support)
- Static asset caching (`/_next/static` cached for 1 year)
- Gzip compression
- Security headers

### Production (PM2)

```bash
pm2 start npm --name "next-app" -- start
pm2 start npm --name "ws-server" -- run ws:server
```

---

## Next.js Configuration

```typescript
// next.config.ts
{
  output: "standalone",        // Optimized for Docker/containerization
  reactStrictMode: false,

  // Proxy WebSocket connections to simulation server
  async rewrites() {
    return [
      { source: '/socket.io',       destination: 'http://localhost:3003/socket.io' },
      { source: '/socket.io/:path*', destination: 'http://localhost:3003/socket.io/:path*' },
    ];
  },
}
```

---

## WebSocket URL Resolution

The client-side WebSocket URL is resolved dynamically (`src/lib/websocket-url.ts`):

| Environment | URL |
|-------------|-----|
| `NEXT_PUBLIC_WS_URL` set | Uses the env variable directly |
| GitHub Codespaces | `https://{codespace}-3003.app.github.dev` |
| Production (Nginx) | `https://{hostname}/ws` |
| Local development | `http://localhost:3003` |

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | Next.js | 16.1.6 | React framework with SSR, standalone output |
| UI Library | React | 19.2.4 | Component rendering |
| 3D Engine | Three.js | 0.182.0 | 3D robot visualization |
| 3D React Bindings | React Three Fiber | 9.5.0 | React wrapper for Three.js |
| 3D Helpers | @react-three/drei | 10.7.7 | OrbitControls, Environment, etc. |
| Physics | @react-three/rapier | 2.2.0 | Physics engine for 3D simulation |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Component Library | shadcn/ui | — | Accessible UI components (Radix UI) |
| State Management | Zustand | 5.0.6 | Client state |
| Data Fetching | TanStack Query | 5.82.0 | Server state |
| Animations | Framer Motion | 12.23.2 | UI animations |
| Charts | Recharts | 2.15.4 | Data visualization |
| Canvas | HTML5 Canvas API | — | 2D simulation rendering |
| ORM | Prisma | 6.19.2 | Type-safe database access |
| AI (Primary) | Google Gemini 2.0 Flash | @google/genai 1.39.0 | Task scheduling, planning, map analysis |
| AI (Backup) | z.ai GLM-4.7 | z-ai-web-dev-sdk 0.0.15 | LLM fallback |
| Real-time | Socket.IO | 4.8.3 | WebSocket communication |
| Validation | Zod | 4.0.2 | Runtime type validation |
| PDF Processing | pdfjs-dist | 5.4.624 | PDF to image conversion |
| Image Processing | Sharp | 0.34.3 | Image optimization |
| Deployment | Docker + Nginx | — | Containerized deployment |
| Hosting | Vultr VM | — | Backend infrastructure (hackathon requirement) |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Task completion rate | >95% |
| Pick success rate | >90% |
| Fleet utilization | >70% |
| Average task time | <60 seconds |
| WebSocket latency | <50ms |
| Canvas FPS | 60 |

---

**Architecture Version: 3.1**
**Hackathon: lablab.ai "Launch & Fund Your Startup" - AI Meets Robotics (Feb 6-15, 2026)**
