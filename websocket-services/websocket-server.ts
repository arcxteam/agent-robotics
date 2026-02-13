/**
 * ArcSpatial Intelligence - Construction & Facilities Simulation Server
 * Real-time WebSocket server for robot fleet simulation with pick-and-place operations
 * 
 * Track 3: Robotic Interaction and Task Execution (Simulation-First)
 * - Picking and placing objects (construction materials)
 * - Sorting and organizing items
 * - Simple assembly operations
 * - Structured interaction with environment
 */

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const PORT = 3003;
const TICK_RATE = 60; // 60 FPS simulation
const TICK_INTERVAL = 1000 / TICK_RATE;

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Vector2D {
  x: number;
  y: number;
}

interface Pose {
  x: number;
  y: number;
  rotation: number; // in degrees
}

interface GripperState {
  isOpen: boolean;
  heldObject: string | null;
  gripForce: number; // 0-100
}

interface ArmState {
  joints: number[]; // 6-DOF joint angles
  endEffectorPose: Vector2D;
  isMoving: boolean;
  targetPose: Vector2D | null;
}

type RobotStatus = 'IDLE' | 'MOVING' | 'PICKING' | 'PLACING' | 'CARRYING' | 'CHARGING' | 'ERROR';

interface Robot {
  id: string;
  name: string;
  type: 'MOBILE_MANIPULATOR' | 'AMR_TRANSPORT' | 'FORKLIFT';
  
  // Base position
  pose: Pose;
  targetPose: Pose | null;
  
  // Movement
  speed: number; // m/s
  maxSpeed: number;
  angularSpeed: number; // deg/s
  
  // Battery
  battery: number;
  maxBattery: number;
  batteryDrainRate: number; // per tick
  
  // Arm & Gripper (for mobile manipulators)
  arm: ArmState | null;
  gripper: GripperState | null;
  
  // Status
  status: RobotStatus;
  currentTaskId: string | null;
  
  // Path planning
  path: Vector2D[];
  pathIndex: number;
  
  // Metrics
  tasksCompleted: number;
  distanceTraveled: number;
  pickSuccessRate: number;
  
  // Sensor data
  lidarPoints: Vector2D[];
  cameraView: string | null; // Base64 encoded
}

type ObjectType = 
  | 'STEEL_BEAM' 
  | 'CONCRETE_BLOCK' 
  | 'PIPE_SECTION'
  | 'ELECTRICAL_PANEL'
  | 'HVAC_UNIT'
  | 'TOOL_BOX'
  | 'SAFETY_EQUIPMENT'
  | 'SCAFFOLDING_PART'
  // Construction materials (lightweight)
  | 'CEMENT_BAG'        // Karung semen 40-50kg
  | 'SAND_BAG'          // Karung pasir 25-30kg
  | 'CARDBOARD_BOX'     // Kardus material ringan
  | 'BRICK_PALLET'      // Palet bata/batako
  | 'GRAVEL_BAG'        // Karung kerikil
  | 'TILE_STACK'        // Tumpukan keramik/ubin
  | 'WOOD_PLANK'        // Papan kayu
  | 'REBAR_BUNDLE'      // Bundel besi beton
  | 'MIXED_MATERIAL';   // Material campur

type ObjectStatus = 'AVAILABLE' | 'PICKED' | 'PLACED' | 'RESERVED';

interface ConstructionObject {
  id: string;
  type: ObjectType;
  name: string;
  pose: Pose;
  dimensions: { width: number; height: number; depth: number };
  weight: number; // kg
  status: ObjectStatus;
  pickedBy: string | null;
  targetZone: string | null;
  color: string;
}

type ZoneType =
  | 'MATERIAL_STORAGE'
  | 'ASSEMBLY_AREA'
  | 'STAGING_ZONE'
  | 'CHARGING_STATION'
  | 'WORK_ZONE'
  | 'RESTRICTED_AREA'
  | 'INSPECTION_POINT'
  | 'ROBOT_HOME';

interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  capacity: number;
  currentOccupancy: number;
  objects: string[]; // Object IDs
}

interface Obstacle {
  id: string;
  type: 'WALL' | 'PILLAR' | 'EQUIPMENT' | 'SCAFFOLDING' | 'TEMPORARY_BARRIER';
  pose: Pose;
  dimensions: { width: number; height: number };
  isTemporary: boolean;
}

type TaskType = 
  | 'PICK_AND_PLACE'
  | 'TRANSPORT'
  | 'SORT_MATERIALS'
  | 'ASSEMBLE'
  | 'INSPECT'
  | 'CHARGE';

type TaskStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

interface TaskStep {
  action: 'MOVE_TO' | 'PICK_OBJECT' | 'PLACE_OBJECT' | 'WAIT' | 'ROTATE' | 'INSPECT';
  target: Vector2D | string; // Position or object ID
  completed: boolean;
  startTime: number | null;
  endTime: number | null;
}

interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  
  // Assignment
  assignedRobotId: string | null;
  
  // Target
  objectId: string | null;
  sourceZone: string | null;
  targetZone: string | null;
  
  // Steps (for multi-step tasks)
  steps: TaskStep[];
  currentStep: number;
  
  // Timing
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  estimatedDuration: number; // seconds
  
  // AI Planning
  aiScore: number;
  aiReasoning: string;

  // Failure handling
  retryCount: number;
  maxRetries: number;
  failureReason: string | null;
}

interface SimulationState {
  id: string;
  name: string;
  status: 'STOPPED' | 'RUNNING' | 'PAUSED';
  
  // Environment
  environmentType: 'CONSTRUCTION_SITE' | 'FACILITY_MAINTENANCE' | 'INDUSTRIAL_PLANT';
  dimensions: { width: number; height: number };
  
  // Entities
  robots: Map<string, Robot>;
  objects: Map<string, ConstructionObject>;
  zones: Map<string, Zone>;
  obstacles: Map<string, Obstacle>;
  tasks: Map<string, Task>;
  
  // Timing
  tick: number;
  startTime: number;
  timeMultiplier: number;
  
  // Metrics
  metrics: {
    totalTasksCreated: number;
    totalTasksCompleted: number;
    totalTasksFailed: number;
    averageTaskTime: number;
    fleetEfficiency: number;
    pickSuccessRate: number;
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function distance(a: Vector2D, b: Vector2D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function normalize(v: Vector2D): Vector2D {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function angleBetween(from: Vector2D, to: Vector2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isInsideBounds(point: Vector2D, bounds: { x: number; y: number; width: number; height: number }): boolean {
  return point.x >= bounds.x && 
         point.x <= bounds.x + bounds.width && 
         point.y >= bounds.y && 
         point.y <= bounds.y + bounds.height;
}

// ============================================
// SHARED OBJECT TYPE CONFIGS (used by createInitialState + zones:update)
// ============================================

const OBJECT_TYPE_CONFIGS: Record<ObjectType, { color: string; weight: number; shape: string; dimensions: { width: number; height: number; depth: number } }> = {
  'STEEL_BEAM': { color: '#64748b', weight: 50, shape: 'beam', dimensions: { width: 60, height: 15, depth: 15 } },
  'CONCRETE_BLOCK': { color: '#78716c', weight: 30, shape: 'block', dimensions: { width: 30, height: 20, depth: 20 } },
  'PIPE_SECTION': { color: '#0ea5e9', weight: 15, shape: 'cylinder', dimensions: { width: 50, height: 12, depth: 12 } },
  'ELECTRICAL_PANEL': { color: '#eab308', weight: 20, shape: 'box', dimensions: { width: 25, height: 35, depth: 15 } },
  'HVAC_UNIT': { color: '#22c55e', weight: 40, shape: 'box', dimensions: { width: 40, height: 30, depth: 30 } },
  'TOOL_BOX': { color: '#ef4444', weight: 10, shape: 'box', dimensions: { width: 25, height: 15, depth: 15 } },
  'SAFETY_EQUIPMENT': { color: '#f97316', weight: 5, shape: 'box', dimensions: { width: 20, height: 20, depth: 15 } },
  'SCAFFOLDING_PART': { color: '#a855f7', weight: 25, shape: 'beam', dimensions: { width: 50, height: 10, depth: 10 } },
  'CEMENT_BAG': { color: '#94a3b8', weight: 50, shape: 'bag', dimensions: { width: 35, height: 20, depth: 15 } },
  'SAND_BAG': { color: '#d4a574', weight: 30, shape: 'bag', dimensions: { width: 35, height: 18, depth: 12 } },
  'CARDBOARD_BOX': { color: '#c9a66b', weight: 8, shape: 'box', dimensions: { width: 30, height: 25, depth: 25 } },
  'BRICK_PALLET': { color: '#b45309', weight: 45, shape: 'pallet', dimensions: { width: 50, height: 30, depth: 30 } },
  'GRAVEL_BAG': { color: '#6b7280', weight: 25, shape: 'bag', dimensions: { width: 30, height: 18, depth: 12 } },
  'TILE_STACK': { color: '#f5f5f4', weight: 35, shape: 'stack', dimensions: { width: 40, height: 25, depth: 20 } },
  'WOOD_PLANK': { color: '#a16207', weight: 12, shape: 'plank', dimensions: { width: 70, height: 8, depth: 15 } },
  'REBAR_BUNDLE': { color: '#44403c', weight: 60, shape: 'bundle', dimensions: { width: 80, height: 15, depth: 15 } },
  'MIXED_MATERIAL': { color: '#71717a', weight: 20, shape: 'mixed', dimensions: { width: 35, height: 25, depth: 20 } }
};

const OBJECT_TYPE_LIST = Object.keys(OBJECT_TYPE_CONFIGS) as ObjectType[];

const OBJECT_NAME_PREFIXES: Record<ObjectType, string[]> = {
  STEEL_BEAM: ['Main', 'Support', 'Cross', 'Frame'],
  CONCRETE_BLOCK: ['Foundation', 'Wall', 'Pillar', 'Corner'],
  PIPE_SECTION: ['Plumbing', 'Drain', 'Supply', 'Vent'],
  ELECTRICAL_PANEL: ['Main', 'Sub', 'Circuit', 'Control'],
  HVAC_UNIT: ['AC', 'Ventilation', 'Exhaust', 'Supply'],
  TOOL_BOX: ['Red', 'Blue', 'Yellow', 'Green'],
  SAFETY_EQUIPMENT: ['Fire', 'First Aid', 'PPE', 'Emergency'],
  SCAFFOLDING_PART: ['Tower', 'Bridge', 'Platform', 'Frame'],
  CEMENT_BAG: ['Portland', 'Quick', 'White', 'Gray'],
  SAND_BAG: ['Fine', 'Coarse', 'River', 'Beach'],
  CARDBOARD_BOX: ['Large', 'Medium', 'Small', 'Heavy'],
  BRICK_PALLET: ['Red', 'Clay', 'Concrete', 'Fire'],
  GRAVEL_BAG: ['Pea', 'Crushed', 'River', 'Decorative'],
  TILE_STACK: ['Ceramic', 'Porcelain', 'Marble', 'Granite'],
  WOOD_PLANK: ['Oak', 'Pine', 'Cedar', 'Plywood'],
  REBAR_BUNDLE: ['#4', '#5', '#6', '#8'],
  MIXED_MATERIAL: ['Batch', 'Set', 'Kit', 'Package']
};

function generateObjectNameShared(type: ObjectType, index: number, zonePrefix: string): string {
  const prefixes = OBJECT_NAME_PREFIXES[type] || ['Item'];
  const prefix = prefixes[index % prefixes.length];
  return `${prefix} ${type.replace(/_/g, ' ')} ${zonePrefix}${String(index + 1).padStart(2, '0')}`;
}

// Zone types that should receive materials
const MATERIAL_ZONE_TYPES = new Set(['MATERIAL_STORAGE', 'ASSEMBLY_AREA', 'STAGING_ZONE', 'WORK_ZONE', 'INSPECTION_POINT']);
// Zone types that should NOT receive materials
const NON_MATERIAL_ZONE_TYPES = new Set([
  'CHARGING_STATION', 'ROBOT_HOME', 'RESTRICTED_AREA',
  'OFFICE', 'LOBBY', 'KITCHEN', 'RESTAURANT', 'MEETING_ROOM',
  'BATHROOM', 'HALLWAY', 'STORAGE', 'RECEPTION'
]);

/** Generate objects for zones used by zones:update handler */
function generateObjectsForZones(state: SimulationState): void {
  const allZones = Array.from(state.zones.values());
  const materialZones = allZones.filter(z => {
    const upperType = z.type.toUpperCase();
    if (NON_MATERIAL_ZONE_TYPES.has(upperType)) return false;
    // If it's a known material zone type or unknown type that is not excluded
    return MATERIAL_ZONE_TYPES.has(upperType) || !NON_MATERIAL_ZONE_TYPES.has(upperType);
  });

  let totalGenerated = 0;
  const zoneObjectCounts: Array<{ zone: Zone; count: number }> = [];

  for (const zone of materialZones) {
    const area = zone.bounds.width * zone.bounds.height;
    // More generous formula: 5–12 objects per zone
    const count = Math.max(5, Math.min(12, Math.floor(area / 8000)));
    zoneObjectCounts.push({ zone, count });
    totalGenerated += count;
  }

  // Ensure minimum 25 objects total
  if (totalGenerated < 25 && zoneObjectCounts.length > 0) {
    // Add extras to the largest zone
    const sorted = [...zoneObjectCounts].sort((a, b) =>
      (b.zone.bounds.width * b.zone.bounds.height) - (a.zone.bounds.width * a.zone.bounds.height)
    );
    const deficit = 25 - totalGenerated;
    sorted[0].count += deficit;
    totalGenerated += deficit;
  }

  for (const { zone, count } of zoneObjectCounts) {
    const prefix = zone.name.charAt(0).toUpperCase();
    for (let i = 0; i < count; i++) {
      const objType = OBJECT_TYPE_LIST[i % OBJECT_TYPE_LIST.length];
      const cfg = OBJECT_TYPE_CONFIGS[objType];
      const obj: ConstructionObject = {
        id: `obj-${generateId()}`,
        type: objType,
        name: generateObjectNameShared(objType, i, prefix),
        pose: {
          x: zone.bounds.x + 20 + Math.random() * Math.max(10, zone.bounds.width - 40),
          y: zone.bounds.y + 20 + Math.random() * Math.max(10, zone.bounds.height - 40),
          rotation: Math.random() * 30 - 15
        },
        dimensions: cfg.dimensions,
        weight: cfg.weight,
        status: 'AVAILABLE',
        pickedBy: null,
        targetZone: null,
        color: cfg.color
      };
      state.objects.set(obj.id, obj);
      zone.currentOccupancy++;
      zone.objects.push(obj.id);
    }
  }
}

// ============================================
// PATHFINDING (Simple A* implementation)
// ============================================

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

function findPath(
  start: Vector2D, 
  end: Vector2D, 
  obstacles: Map<string, Obstacle>,
  gridSize: number = 20
): Vector2D[] {
  // Simple grid-based A* pathfinding
  const openSet: PathNode[] = [];
  const closedSet: Set<string> = new Set();
  
  const startNode: PathNode = {
    x: Math.round(start.x / gridSize) * gridSize,
    y: Math.round(start.y / gridSize) * gridSize,
    g: 0,
    h: distance(start, end),
    f: distance(start, end),
    parent: null
  };
  
  openSet.push(startNode);
  
  const endX = Math.round(end.x / gridSize) * gridSize;
  const endY = Math.round(end.y / gridSize) * gridSize;
  
  const maxIterations = 1000;
  let iterations = 0;
  
  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // Get node with lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: Vector2D[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }
    
    closedSet.add(`${current.x},${current.y}`);
    
    // Check neighbors
    const neighbors = [
      { x: current.x + gridSize, y: current.y },
      { x: current.x - gridSize, y: current.y },
      { x: current.x, y: current.y + gridSize },
      { x: current.x, y: current.y - gridSize },
      { x: current.x + gridSize, y: current.y + gridSize },
      { x: current.x - gridSize, y: current.y - gridSize },
      { x: current.x + gridSize, y: current.y - gridSize },
      { x: current.x - gridSize, y: current.y + gridSize },
    ];
    
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(key)) continue;
      
      // Check collision with obstacles
      let blocked = false;
      for (const obstacle of obstacles.values()) {
        if (isInsideBounds(neighbor, {
          x: obstacle.pose.x - obstacle.dimensions.width / 2,
          y: obstacle.pose.y - obstacle.dimensions.height / 2,
          width: obstacle.dimensions.width,
          height: obstacle.dimensions.height
        })) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      
      const g = current.g + distance(current, neighbor);
      const h = distance(neighbor, { x: endX, y: endY });
      const f = g + h;
      
      const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
      } else {
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g,
          h,
          f,
          parent: current
        });
      }
    }
  }
  
  // No path found, return direct line
  return [start, end];
}

// ============================================
// ROBOT CONTROLLER
// ============================================

function updateRobot(robot: Robot, state: SimulationState, deltaTime: number): void {
  // Charging logic first
  if (robot.status === 'CHARGING') {
    robot.battery = Math.min(robot.maxBattery, robot.battery + 0.5 * deltaTime);
    if (robot.battery >= robot.maxBattery) {
      robot.status = 'IDLE';
    }
    return;
  }
  
  // Battery drain (not charging)
  if (robot.status !== 'IDLE') {
    robot.battery = Math.max(0, robot.battery - robot.batteryDrainRate * deltaTime);
  }
  
  // Low battery - return to charging station
  if (robot.battery < 20) {
    // Force return to charging station
    const chargingZone = Array.from(state.zones.values())
      .find(z => z.type === 'CHARGING_STATION');
    if (chargingZone) {
      robot.status = 'MOVING';
      robot.targetPose = {
        x: chargingZone.bounds.x + chargingZone.bounds.width / 2,
        y: chargingZone.bounds.y + chargingZone.bounds.height / 2,
        rotation: 0
      };
      robot.path = findPath(robot.pose, robot.targetPose, state.obstacles);
      robot.pathIndex = 0;
      robot.currentTaskId = null;
    }
  }
  
  // Movement along path
  if (robot.path.length > 0 && robot.pathIndex < robot.path.length) {
    const target = robot.path[robot.pathIndex];
    const dist = distance(robot.pose, target);
    
    if (dist < 5) {
      // Reached waypoint
      robot.pathIndex++;
      if (robot.pathIndex >= robot.path.length) {
        // Reached destination
        robot.path = [];
        robot.pathIndex = 0;
        
        // Check if we should pick or place
        const task = robot.currentTaskId ? state.tasks.get(robot.currentTaskId) : null;
        if (task) {
          executeTaskStep(robot, task, state);
        } else {
          robot.status = 'IDLE';
        }
      }
    } else {
      // Move towards waypoint
      const direction = normalize({ x: target.x - robot.pose.x, y: target.y - robot.pose.y });
      const moveDistance = robot.speed * deltaTime;
      
      robot.pose.x += direction.x * moveDistance;
      robot.pose.y += direction.y * moveDistance;
      robot.pose.rotation = angleBetween(robot.pose, target);
      robot.distanceTraveled += moveDistance;
      
      if (robot.status !== 'CARRYING') {
        robot.status = 'MOVING';
      }
    }
  }
  
  // Check if robot is in charging zone
  for (const zone of state.zones.values()) {
    if (zone.type === 'CHARGING_STATION' && isInsideBounds(robot.pose, zone.bounds)) {
      if (robot.battery < 100 && robot.currentTaskId === null) {
        robot.status = 'CHARGING';
      }
    }
  }
  
  // Generate LiDAR data (simulated)
  robot.lidarPoints = generateLidarData(robot, state.obstacles, state.objects);
}

function generateLidarData(
  robot: Robot, 
  obstacles: Map<string, Obstacle>,
  objects: Map<string, ConstructionObject>
): Vector2D[] {
  const points: Vector2D[] = [];
  const numRays = 36;
  const maxRange = 200;
  
  for (let i = 0; i < numRays; i++) {
    const angle = (i * 360 / numRays) + robot.pose.rotation;
    const rad = angle * Math.PI / 180;
    
    let hitDistance = maxRange;
    
    // Check obstacles
    for (const obstacle of obstacles.values()) {
      const obstacleCenter = { x: obstacle.pose.x, y: obstacle.pose.y };
      const dist = distance(robot.pose, obstacleCenter);
      if (dist < hitDistance && dist < obstacle.dimensions.width + maxRange) {
        hitDistance = Math.min(hitDistance, dist - obstacle.dimensions.width / 2);
      }
    }
    
    // Check objects
    for (const obj of objects.values()) {
      if (obj.status === 'PICKED') continue;
      const dist = distance(robot.pose, obj.pose);
      if (dist < hitDistance) {
        hitDistance = Math.min(hitDistance, dist - obj.dimensions.width / 2);
      }
    }
    
    hitDistance = Math.max(10, hitDistance);
    
    points.push({
      x: robot.pose.x + Math.cos(rad) * hitDistance,
      y: robot.pose.y + Math.sin(rad) * hitDistance
    });
  }
  
  return points;
}

// ============================================
// TASK EXECUTION
// ============================================

function executeTaskStep(robot: Robot, task: Task, state: SimulationState): void {
  if (task.currentStep >= task.steps.length) {
    completeTask(task, robot, state);
    return;
  }
  
  const step = task.steps[task.currentStep];
  
  switch (step.action) {
    case 'MOVE_TO': {
      const target = typeof step.target === 'string' 
        ? getObjectPosition(step.target, state)
        : step.target;
      
      if (target) {
        robot.path = findPath(robot.pose, target, state.obstacles);
        robot.pathIndex = 0;
        robot.status = robot.gripper?.heldObject ? 'CARRYING' : 'MOVING';
      }
      step.completed = true;
      step.endTime = Date.now();
      task.currentStep++;
      break;
    }
    
    case 'PICK_OBJECT': {
      const objectId = typeof step.target === 'string' ? step.target : null;
      if (objectId && robot.gripper) {
        const obj = state.objects.get(objectId);
        if (!obj) {
          // Object no longer exists
          failTask(task, robot, state, `Object ${objectId} not found`);
          return;
        }
        if (obj.status !== 'AVAILABLE') {
          // Object already picked by another robot
          failTask(task, robot, state, `Object ${objectId} unavailable (status: ${obj.status})`);
          return;
        }

        // Simulate pick operation
        robot.status = 'PICKING';

        // Check if robot is close enough
        const dist = distance(robot.pose, obj.pose);
        if (dist < 50) {
          // Success! Pick up the object
          robot.gripper.isOpen = false;
          robot.gripper.heldObject = objectId;
          obj.status = 'PICKED';
          obj.pickedBy = robot.id;

          step.completed = true;
          step.endTime = Date.now();
          task.currentStep++;

          // Move to next step
          if (task.currentStep < task.steps.length) {
            executeTaskStep(robot, task, state);
          }
        }
        // If dist >= 50, robot is still moving toward object (wait for next tick)
      } else if (!robot.gripper) {
        failTask(task, robot, state, `Robot ${robot.id} has no gripper for pick operation`);
        return;
      }
      break;
    }
    
    case 'PLACE_OBJECT': {
      if (robot.gripper && robot.gripper.heldObject) {
        const objectId = robot.gripper.heldObject;
        const obj = state.objects.get(objectId);
        
        if (obj) {
          robot.status = 'PLACING';
          
          // Place at current position
          obj.pose = { ...robot.pose };
          obj.status = 'PLACED';
          obj.pickedBy = null;
          
          robot.gripper.isOpen = true;
          robot.gripper.heldObject = null;
          
          // Update zone occupancy
          for (const zone of state.zones.values()) {
            if (isInsideBounds(obj.pose, zone.bounds)) {
              zone.currentOccupancy++;
              zone.objects.push(objectId);
              break;
            }
          }
          
          step.completed = true;
          step.endTime = Date.now();
          task.currentStep++;
          
          robot.tasksCompleted++;
          robot.pickSuccessRate = (robot.pickSuccessRate * (robot.tasksCompleted - 1) + 1) / robot.tasksCompleted;
          
          // Check if task is complete
          if (task.currentStep >= task.steps.length) {
            completeTask(task, robot, state);
          }
        }
      }
      break;
    }
    
    case 'WAIT': {
      // Just wait for a moment
      step.completed = true;
      step.endTime = Date.now();
      task.currentStep++;
      break;
    }
    
    case 'INSPECT': {
      // Simulate inspection
      robot.status = 'IDLE';
      step.completed = true;
      step.endTime = Date.now();
      task.currentStep++;
      break;
    }
  }
}

function getObjectPosition(objectId: string, state: SimulationState): Vector2D | null {
  const obj = state.objects.get(objectId);
  if (obj) return { x: obj.pose.x, y: obj.pose.y };
  
  const zone = state.zones.get(objectId);
  if (zone) return { 
    x: zone.bounds.x + zone.bounds.width / 2, 
    y: zone.bounds.y + zone.bounds.height / 2 
  };
  
  return null;
}

function completeTask(task: Task, robot: Robot, state: SimulationState): void {
  task.status = 'COMPLETED';
  task.completedAt = Date.now();
  robot.currentTaskId = null;
  robot.status = 'IDLE';

  state.metrics.totalTasksCompleted++;

  // Calculate average task time
  const taskTime = (task.completedAt - (task.startedAt || task.createdAt)) / 1000;
  state.metrics.averageTaskTime = (state.metrics.averageTaskTime * (state.metrics.totalTasksCompleted - 1) + taskTime) / state.metrics.totalTasksCompleted;

  // Update fleet efficiency
  const activeRobots = Array.from(state.robots.values()).filter(r => r.status !== 'ERROR');
  const workingRobots = activeRobots.filter(r => r.currentTaskId !== null);
  state.metrics.fleetEfficiency = workingRobots.length / Math.max(1, activeRobots.length);
}

function failTask(task: Task, robot: Robot, state: SimulationState, reason: string): void {
  task.retryCount = (task.retryCount || 0) + 1;

  if (task.retryCount < (task.maxRetries || 3)) {
    // Retry: reset task steps and re-assign
    console.log(`⚠️ Task ${task.id} failed (attempt ${task.retryCount}/${task.maxRetries || 3}): ${reason}. Retrying...`);
    task.status = 'PENDING';
    task.currentStep = 0;
    task.failureReason = reason;
    task.assignedRobotId = null;
    task.steps.forEach(s => { s.completed = false; s.startTime = null; s.endTime = null; });

    // Release robot
    robot.currentTaskId = null;
    robot.status = 'IDLE';
    if (robot.gripper) {
      // Drop held object back
      if (robot.gripper.heldObject) {
        const obj = state.objects.get(robot.gripper.heldObject);
        if (obj) {
          obj.status = 'AVAILABLE';
          obj.pickedBy = null;
        }
        robot.gripper.heldObject = null;
        robot.gripper.isOpen = true;
      }
    }
  } else {
    // Final failure
    console.log(`❌ Task ${task.id} FAILED permanently after ${task.retryCount} attempts: ${reason}`);
    task.status = 'FAILED';
    task.completedAt = Date.now();
    task.failureReason = reason;
    state.metrics.totalTasksFailed++;

    // Release robot
    robot.currentTaskId = null;
    robot.status = 'IDLE';
    if (robot.gripper && robot.gripper.heldObject) {
      const obj = state.objects.get(robot.gripper.heldObject);
      if (obj) {
        obj.status = 'AVAILABLE';
        obj.pickedBy = null;
      }
      robot.gripper.heldObject = null;
      robot.gripper.isOpen = true;
    }

    // Update pick success rate
    const totalAttempts = state.metrics.totalTasksCompleted + state.metrics.totalTasksFailed;
    state.metrics.pickSuccessRate = totalAttempts > 0
      ? state.metrics.totalTasksCompleted / totalAttempts
      : 1;
  }
}

// ============================================
// TASK CREATION & ASSIGNMENT
// ============================================

function createPickAndPlaceTask(
  objectId: string, 
  targetZoneId: string, 
  state: SimulationState
): Task {
  const obj = state.objects.get(objectId);
  const targetZone = state.zones.get(targetZoneId);
  
  if (!obj || !targetZone) {
    throw new Error('Invalid object or zone');
  }
  
  const task: Task = {
    id: generateId(),
    type: 'PICK_AND_PLACE',
    priority: 'NORMAL',
    status: 'PENDING',
    assignedRobotId: null,
    objectId,
    sourceZone: null,
    targetZone: targetZoneId,
    steps: [
      {
        action: 'MOVE_TO',
        target: objectId,
        completed: false,
        startTime: null,
        endTime: null
      },
      {
        action: 'PICK_OBJECT',
        target: objectId,
        completed: false,
        startTime: null,
        endTime: null
      },
      {
        action: 'MOVE_TO',
        target: targetZoneId,
        completed: false,
        startTime: null,
        endTime: null
      },
      {
        action: 'PLACE_OBJECT',
        target: targetZoneId,
        completed: false,
        startTime: null,
        endTime: null
      }
    ],
    currentStep: 0,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    estimatedDuration: 60,
    aiScore: 0,
    aiReasoning: '',
    retryCount: 0,
    maxRetries: 3,
    failureReason: null
  };
  
  state.tasks.set(task.id, task);
  state.metrics.totalTasksCreated++;

  return task;
}

function createSortTask(
  objectIds: string[],
  targetZoneId: string,
  state: SimulationState
): Task[] {
  const targetZone = state.zones.get(targetZoneId);
  if (!targetZone) throw new Error('Invalid target zone');

  // Group objects by type and create one task per object
  const tasks: Task[] = [];
  for (const objectId of objectIds) {
    const obj = state.objects.get(objectId);
    if (!obj || obj.status !== 'AVAILABLE') continue;

    const task: Task = {
      id: generateId(),
      type: 'SORT_MATERIALS',
      priority: 'NORMAL',
      status: 'PENDING',
      assignedRobotId: null,
      objectId,
      sourceZone: null,
      targetZone: targetZoneId,
      steps: [
        { action: 'MOVE_TO', target: objectId, completed: false, startTime: null, endTime: null },
        { action: 'INSPECT', target: objectId, completed: false, startTime: null, endTime: null },
        { action: 'PICK_OBJECT', target: objectId, completed: false, startTime: null, endTime: null },
        { action: 'MOVE_TO', target: targetZoneId, completed: false, startTime: null, endTime: null },
        { action: 'PLACE_OBJECT', target: targetZoneId, completed: false, startTime: null, endTime: null },
      ],
      currentStep: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      estimatedDuration: 45,
      aiScore: 0,
      aiReasoning: `Sorting ${obj.type} to ${targetZone.name}`,
      retryCount: 0,
      maxRetries: 3,
      failureReason: null,
    };

    state.tasks.set(task.id, task);
    state.metrics.totalTasksCreated++;
    tasks.push(task);
  }
  return tasks;
}

function createAssembleTask(
  objectIds: string[],
  assemblyZoneId: string,
  state: SimulationState
): Task[] {
  const zone = state.zones.get(assemblyZoneId);
  if (!zone) throw new Error('Invalid assembly zone');
  if (objectIds.length < 2) throw new Error('Assembly needs at least 2 objects');

  // Create sequential pick-and-deliver tasks for each part, then a final assemble step
  const tasks: Task[] = [];
  for (let i = 0; i < objectIds.length; i++) {
    const objectId = objectIds[i];
    const obj = state.objects.get(objectId);
    if (!obj || obj.status !== 'AVAILABLE') continue;

    const isLast = i === objectIds.length - 1;
    const steps: TaskStep[] = [
      { action: 'MOVE_TO', target: objectId, completed: false, startTime: null, endTime: null },
      { action: 'PICK_OBJECT', target: objectId, completed: false, startTime: null, endTime: null },
      { action: 'MOVE_TO', target: assemblyZoneId, completed: false, startTime: null, endTime: null },
      { action: 'PLACE_OBJECT', target: assemblyZoneId, completed: false, startTime: null, endTime: null },
    ];

    // Last part includes an inspection/assembly verification step
    if (isLast) {
      steps.push({ action: 'INSPECT', target: assemblyZoneId, completed: false, startTime: null, endTime: null });
    }

    const task: Task = {
      id: generateId(),
      type: 'ASSEMBLE',
      priority: isLast ? 'HIGH' : 'NORMAL',
      status: 'PENDING',
      assignedRobotId: null,
      objectId,
      sourceZone: null,
      targetZone: assemblyZoneId,
      steps,
      currentStep: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      estimatedDuration: 90,
      aiScore: 0,
      aiReasoning: `Assembly part ${i + 1}/${objectIds.length}: ${obj.type} → ${zone.name}`,
      retryCount: 0,
      maxRetries: 3,
      failureReason: null,
    };

    state.tasks.set(task.id, task);
    state.metrics.totalTasksCreated++;
    tasks.push(task);
  }
  return tasks;
}

function assignTaskToRobot(task: Task, robot: Robot, state: SimulationState): void {
  task.assignedRobotId = robot.id;
  task.status = 'IN_PROGRESS';
  task.startedAt = Date.now();
  
  robot.currentTaskId = task.id;
  
  // Start executing first step
  executeTaskStep(robot, task, state);
}

function findBestRobotForTask(task: Task, state: SimulationState): Robot | null {
  const needsGripper = task.type === 'PICK_AND_PLACE' || task.type === 'SORT_MATERIALS' || task.type === 'ASSEMBLE';

  const availableRobots = Array.from(state.robots.values())
    .filter(r =>
      r.status === 'IDLE' &&
      r.battery > 30 &&
      r.currentTaskId === null &&
      (!needsGripper || r.gripper !== null) // Only robots with gripper for pick tasks
    );

  if (availableRobots.length === 0) return null;

  // Find robot closest to the task's first target
  const firstTarget = task.steps[0]?.target;
  if (!firstTarget) return availableRobots[0];

  const targetPos = typeof firstTarget === 'string'
    ? getObjectPosition(firstTarget, state)
    : firstTarget;

  if (!targetPos) return availableRobots[0];

  return availableRobots.reduce((best, robot) => {
    const distBest = distance(best.pose, targetPos);
    const distCurrent = distance(robot.pose, targetPos);
    return distCurrent < distBest ? robot : best;
  });
}

// ============================================
// SIMULATION STATE INITIALIZATION
// ============================================

function createInitialState(): SimulationState {
  const state: SimulationState = {
    id: generateId(),
    name: 'Construction Site Alpha',
    status: 'STOPPED',
    environmentType: 'CONSTRUCTION_SITE',
    dimensions: { width: 1000, height: 800 },
    robots: new Map(),
    objects: new Map(),
    zones: new Map(),
    obstacles: new Map(),
    tasks: new Map(),
    tick: 0,
    startTime: 0,
    timeMultiplier: 1,
    metrics: {
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      averageTaskTime: 0,
      fleetEfficiency: 0,
      pickSuccessRate: 0
    }
  };
  
  // Create zones
  const zones: Zone[] = [
    {
      id: 'zone-material-storage',
      name: 'Material Storage',
      type: 'MATERIAL_STORAGE',
      bounds: { x: 50, y: 50, width: 200, height: 150 },
      color: '#6366f1',
      capacity: 20,
      currentOccupancy: 0,
      objects: []
    },
    {
      id: 'zone-assembly',
      name: 'Assembly Area',
      type: 'ASSEMBLY_AREA',
      bounds: { x: 400, y: 300, width: 250, height: 200 },
      color: '#22c55e',
      capacity: 10,
      currentOccupancy: 0,
      objects: []
    },
    {
      id: 'zone-staging',
      name: 'Staging Zone',
      type: 'STAGING_ZONE',
      bounds: { x: 700, y: 100, width: 180, height: 150 },
      color: '#f59e0b',
      capacity: 15,
      currentOccupancy: 0,
      objects: []
    },
    {
      id: 'zone-charging',
      name: 'Charging Station',
      type: 'CHARGING_STATION',
      bounds: { x: 800, y: 600, width: 150, height: 150 },
      color: '#06b6d4',
      capacity: 4,
      currentOccupancy: 0,
      objects: []
    },
    {
      id: 'zone-work-1',
      name: 'Work Zone A',
      type: 'WORK_ZONE',
      bounds: { x: 200, y: 500, width: 200, height: 150 },
      color: '#8b5cf6',
      capacity: 8,
      currentOccupancy: 0,
      objects: []
    },
    {
      id: 'zone-inspection',
      name: 'Inspection Point',
      type: 'INSPECTION_POINT',
      bounds: { x: 500, y: 600, width: 100, height: 100 },
      color: '#ef4444',
      capacity: 5,
      currentOccupancy: 0,
      objects: []
    }
  ];
  
  for (const zone of zones) {
    state.zones.set(zone.id, zone);
  }
  
  // Create obstacles
  const obstacles: Obstacle[] = [
    {
      id: 'wall-1',
      type: 'WALL',
      pose: { x: 350, y: 200, rotation: 0 },
      dimensions: { width: 10, height: 200 },
      isTemporary: false
    },
    {
      id: 'pillar-1',
      type: 'PILLAR',
      pose: { x: 500, y: 150, rotation: 0 },
      dimensions: { width: 40, height: 40 },
      isTemporary: false
    },
    {
      id: 'pillar-2',
      type: 'PILLAR',
      pose: { x: 500, y: 500, rotation: 0 },
      dimensions: { width: 40, height: 40 },
      isTemporary: false
    },
    {
      id: 'scaffolding-1',
      type: 'SCAFFOLDING',
      pose: { x: 650, y: 400, rotation: 0 },
      dimensions: { width: 100, height: 60 },
      isTemporary: true
    },
    {
      id: 'equipment-1',
      type: 'EQUIPMENT',
      pose: { x: 150, y: 350, rotation: 0 },
      dimensions: { width: 80, height: 60 },
      isTemporary: true
    }
  ];
  
  for (const obstacle of obstacles) {
    state.obstacles.set(obstacle.id, obstacle);
  }
  
  // Create construction objects - now with more realistic materials
  const objectTypes: Array<{ type: ObjectType; color: string; weight: number; shape: string; dimensions: { width: number; height: number; depth: number } }> = [
    // Original heavy materials
    { type: 'STEEL_BEAM', color: '#64748b', weight: 50, shape: 'beam', dimensions: { width: 60, height: 15, depth: 15 } },
    { type: 'CONCRETE_BLOCK', color: '#78716c', weight: 30, shape: 'block', dimensions: { width: 30, height: 20, depth: 20 } },
    { type: 'PIPE_SECTION', color: '#0ea5e9', weight: 15, shape: 'cylinder', dimensions: { width: 50, height: 12, depth: 12 } },
    { type: 'ELECTRICAL_PANEL', color: '#eab308', weight: 20, shape: 'box', dimensions: { width: 25, height: 35, depth: 15 } },
    { type: 'HVAC_UNIT', color: '#22c55e', weight: 40, shape: 'box', dimensions: { width: 40, height: 30, depth: 30 } },
    { type: 'TOOL_BOX', color: '#ef4444', weight: 10, shape: 'box', dimensions: { width: 25, height: 15, depth: 15 } },
    { type: 'SAFETY_EQUIPMENT', color: '#f97316', weight: 5, shape: 'box', dimensions: { width: 20, height: 20, depth: 15 } },
    { type: 'SCAFFOLDING_PART', color: '#a855f7', weight: 25, shape: 'beam', dimensions: { width: 50, height: 10, depth: 10 } },
    // NEW: Construction site lightweight materials
    { type: 'CEMENT_BAG', color: '#94a3b8', weight: 50, shape: 'bag', dimensions: { width: 35, height: 20, depth: 15 } },
    { type: 'SAND_BAG', color: '#d4a574', weight: 30, shape: 'bag', dimensions: { width: 35, height: 18, depth: 12 } },
    { type: 'CARDBOARD_BOX', color: '#c9a66b', weight: 8, shape: 'box', dimensions: { width: 30, height: 25, depth: 25 } },
    { type: 'BRICK_PALLET', color: '#b45309', weight: 45, shape: 'pallet', dimensions: { width: 50, height: 30, depth: 30 } },
    { type: 'GRAVEL_BAG', color: '#6b7280', weight: 25, shape: 'bag', dimensions: { width: 30, height: 18, depth: 12 } },
    { type: 'TILE_STACK', color: '#f5f5f4', weight: 35, shape: 'stack', dimensions: { width: 40, height: 25, depth: 20 } },
    { type: 'WOOD_PLANK', color: '#a16207', weight: 12, shape: 'plank', dimensions: { width: 70, height: 8, depth: 15 } },
    { type: 'REBAR_BUNDLE', color: '#44403c', weight: 60, shape: 'bundle', dimensions: { width: 80, height: 15, depth: 15 } },
    { type: 'MIXED_MATERIAL', color: '#71717a', weight: 20, shape: 'mixed', dimensions: { width: 35, height: 25, depth: 20 } }
  ];
  
  // Helper function to generate descriptive object names
  const objectNamePrefixes: Record<ObjectType, string[]> = {
    STEEL_BEAM: ['Main', 'Support', 'Cross', 'Frame'],
    CONCRETE_BLOCK: ['Foundation', 'Wall', 'Pillar', 'Corner'],
    PIPE_SECTION: ['Plumbing', 'Drain', 'Supply', 'Vent'],
    ELECTRICAL_PANEL: ['Main', 'Sub', 'Circuit', 'Control'],
    HVAC_UNIT: ['AC', 'Ventilation', 'Exhaust', 'Supply'],
    TOOL_BOX: ['Red', 'Blue', 'Yellow', 'Green'],
    SAFETY_EQUIPMENT: ['Fire', 'First Aid', 'PPE', 'Emergency'],
    SCAFFOLDING_PART: ['Tower', 'Bridge', 'Platform', 'Frame'],
    CEMENT_BAG: ['Portland', 'Quick', 'White', 'Gray'],
    SAND_BAG: ['Fine', 'Coarse', 'River', 'Beach'],
    CARDBOARD_BOX: ['Large', 'Medium', 'Small', 'Heavy'],
    BRICK_PALLET: ['Red', 'Clay', 'Concrete', 'Fire'],
    GRAVEL_BAG: ['Pea', 'Crushed', 'River', 'Decorative'],
    TILE_STACK: ['Ceramic', 'Porcelain', 'Marble', 'Granite'],
    WOOD_PLANK: ['Oak', 'Pine', 'Cedar', 'Plywood'],
    REBAR_BUNDLE: ['#4', '#5', '#6', '#8'],
    MIXED_MATERIAL: ['Batch', 'Set', 'Kit', 'Package']
  };
  
  const generateObjectName = (type: ObjectType, index: number, zonePrefix: string): string => {
    const prefixes = objectNamePrefixes[type] || ['Item'];
    const prefix = prefixes[index % prefixes.length];
    const typeLabel = type.replace(/_/g, ' ').split(' ').map(w => w[0]).join('');
    return `${prefix} ${type.replace(/_/g, ' ')} ${zonePrefix}${String(index + 1).padStart(2, '0')}`;
  };
  
  // Place MANY objects in material storage zone (30+ items with varied materials)
  const materialZone = state.zones.get('zone-material-storage')!;
  for (let i = 0; i < 30; i++) {
    const objType = objectTypes[i % objectTypes.length];
    const obj: ConstructionObject = {
      id: `obj-mat-${generateId()}`,
      type: objType.type,
      name: generateObjectName(objType.type, i, 'M'),
      pose: {
        x: materialZone.bounds.x + 20 + (i % 6) * 40,
        y: materialZone.bounds.y + 20 + Math.floor(i / 6) * 45,
        rotation: Math.random() * 30 - 15 // slight rotation variation
      },
      dimensions: objType.dimensions, // Use realistic dimensions
      weight: objType.weight,
      status: 'AVAILABLE',
      pickedBy: null,
      targetZone: null,
      color: objType.color
    };
    state.objects.set(obj.id, obj);
    materialZone.currentOccupancy++;
    materialZone.objects.push(obj.id);
  }

  // Add more objects in staging zone (to be sorted)
  const stagingZone = state.zones.get('zone-staging')!;
  for (let i = 0; i < 10; i++) {
    const objType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
    const obj: ConstructionObject = {
      id: `obj-stg-${generateId()}`,
      type: objType.type,
      name: generateObjectName(objType.type, i, 'S'),
      pose: {
        x: stagingZone.bounds.x + 20 + (i % 4) * 30,
        y: stagingZone.bounds.y + 20 + Math.floor(i / 4) * 35,
        rotation: Math.random() * 360
      },
      dimensions: { width: 25, height: 25, depth: 20 },
      weight: objType.weight,
      status: 'AVAILABLE',
      pickedBy: null,
      targetZone: null,
      color: objType.color
    };
    state.objects.set(obj.id, obj);
    stagingZone.currentOccupancy++;
    stagingZone.objects.push(obj.id);
  }

  // Add some objects in work zone
  const workZone = state.zones.get('zone-work-1')!;
  if (workZone) {
    for (let i = 0; i < 5; i++) {
      const objType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
      const obj: ConstructionObject = {
        id: `obj-wrk-${generateId()}`,
        type: objType.type,
        name: generateObjectName(objType.type, i, 'W'),
        pose: {
          x: workZone.bounds.x + 30 + (i % 3) * 40,
          y: workZone.bounds.y + 30 + Math.floor(i / 3) * 45,
          rotation: Math.random() * 360
        },
        dimensions: { width: 25, height: 25, depth: 20 },
        weight: objType.weight,
        status: 'AVAILABLE',
        pickedBy: null,
        targetZone: null,
        color: objType.color
      };

      state.objects.set(obj.id, obj);
      workZone.currentOccupancy++;
      workZone.objects.push(obj.id);
    }
  }
  
  // Create robots
  const robots: Robot[] = [
    {
      id: 'robot-mm-01',
      name: 'Mobile Manipulator 01',
      type: 'MOBILE_MANIPULATOR',
      pose: { x: 100, y: 250, rotation: 0 },
      targetPose: null,
      speed: 2,
      maxSpeed: 3,
      angularSpeed: 90,
      battery: 100,
      maxBattery: 100,
      batteryDrainRate: 0.01,
      arm: {
        joints: [0, -45, 90, 0, 45, 0],
        endEffectorPose: { x: 30, y: 0 },
        isMoving: false,
        targetPose: null
      },
      gripper: {
        isOpen: true,
        heldObject: null,
        gripForce: 50
      },
      status: 'IDLE',
      currentTaskId: null,
      path: [],
      pathIndex: 0,
      tasksCompleted: 0,
      distanceTraveled: 0,
      pickSuccessRate: 0,
      lidarPoints: [],
      cameraView: null
    },
    {
      id: 'robot-mm-02',
      name: 'Mobile Manipulator 02',
      type: 'MOBILE_MANIPULATOR',
      pose: { x: 300, y: 450, rotation: 90 },
      targetPose: null,
      speed: 2,
      maxSpeed: 3,
      angularSpeed: 90,
      battery: 85,
      maxBattery: 100,
      batteryDrainRate: 0.01,
      arm: {
        joints: [0, -45, 90, 0, 45, 0],
        endEffectorPose: { x: 30, y: 0 },
        isMoving: false,
        targetPose: null
      },
      gripper: {
        isOpen: true,
        heldObject: null,
        gripForce: 50
      },
      status: 'IDLE',
      currentTaskId: null,
      path: [],
      pathIndex: 0,
      tasksCompleted: 0,
      distanceTraveled: 0,
      pickSuccessRate: 0,
      lidarPoints: [],
      cameraView: null
    },
    {
      id: 'robot-forklift-01',
      name: 'Forklift 01',
      type: 'FORKLIFT',
      pose: { x: 600, y: 250, rotation: 180 },
      targetPose: null,
      speed: 1.5,
      maxSpeed: 2,
      angularSpeed: 60,
      battery: 90,
      maxBattery: 100,
      batteryDrainRate: 0.015,
      arm: null,
      gripper: {
        isOpen: true,
        heldObject: null,
        gripForce: 100
      },
      status: 'IDLE',
      currentTaskId: null,
      path: [],
      pathIndex: 0,
      tasksCompleted: 0,
      distanceTraveled: 0,
      pickSuccessRate: 0,
      lidarPoints: [],
      cameraView: null
    },
    {
      id: 'robot-transport-01',
      name: 'Transport Robot 01',
      type: 'AMR_TRANSPORT',
      pose: { x: 750, y: 400, rotation: 270 },
      targetPose: null,
      speed: 3,
      maxSpeed: 4,
      angularSpeed: 120,
      battery: 75,
      maxBattery: 100,
      batteryDrainRate: 0.008,
      arm: null,
      gripper: null,
      status: 'IDLE',
      currentTaskId: null,
      path: [],
      pathIndex: 0,
      tasksCompleted: 0,
      distanceTraveled: 0,
      pickSuccessRate: 0,
      lidarPoints: [],
      cameraView: null
    }
  ];
  
  for (const robot of robots) {
    state.robots.set(robot.id, robot);
  }
  
  return state;
}

// ============================================
// WEBSOCKET SERVER
// ============================================

const httpServer = createServer((req, res) => {
  const origin = req.headers.origin || '*';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ArcSpatial Simulation Server',
      connections: io?.engine?.clientsCount || 0
    }));
    return;
  }

  // Full simulation status API — real-time state for monitoring & integration
  if (req.url === '/api/status') {
    const robots = Array.from(simulationState.robots.values());
    const tasks = Array.from(simulationState.tasks.values());
    const objects = Array.from(simulationState.objects.values());
    const zones = Array.from(simulationState.zones.values());

    const uptime = simulationState.startTime > 0
      ? Math.floor((Date.now() - simulationState.startTime) / 1000)
      : 0;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ArcSpatial Simulation Server',
      timestamp: new Date().toISOString(),
      connections: io?.engine?.clientsCount || 0,
      simulation: {
        id: simulationState.id,
        name: simulationState.name,
        state: simulationState.status,
        environment: simulationState.environmentType,
        tick: simulationState.tick,
        speed: simulationState.timeMultiplier,
        uptime,
        dimensions: simulationState.dimensions,
      },
      fleet: {
        total: robots.length,
        active: robots.filter(r => r.status !== 'IDLE' && r.status !== 'CHARGING').length,
        idle: robots.filter(r => r.status === 'IDLE').length,
        charging: robots.filter(r => r.status === 'CHARGING').length,
        robots: robots.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          status: r.status,
          battery: Math.round(r.battery ?? 0),
          position: { x: Math.round(r.pose.x), y: Math.round(r.pose.y) },
          currentTask: r.currentTaskId || null,
          distanceTraveled: Math.round(r.distanceTraveled ?? 0),
        })),
      },
      tasks: {
        pending: tasks.filter(t => t.status === 'PENDING').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        failed: tasks.filter(t => t.status === 'FAILED').length,
        total: tasks.length,
      },
      objects: {
        total: objects.length,
        available: objects.filter(o => o.status === 'AVAILABLE').length,
        picked: objects.filter(o => o.status === 'PICKED').length,
        placed: objects.filter(o => o.status === 'PLACED').length,
        types: [...new Set(objects.map(o => o.type))],
      },
      zones: {
        total: zones.length,
        list: zones.map(z => ({ id: z.id, name: z.name, type: z.type })),
      },
      metrics: simulationState.metrics,
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const io = new Server(httpServer, {
  cors: {
    origin: true, // Reflect request origin — allows credentials with any origin
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowUpgrades: true
});

let simulationState: SimulationState = createInitialState();
let simulationInterval: NodeJS.Timeout | null = null;
let lastTickTime = Date.now();

function serializeState(state: SimulationState) {
  return {
    id: state.id,
    name: state.name,
    status: state.status,
    environmentType: state.environmentType,
    dimensions: state.dimensions,
    tick: state.tick,
    timeMultiplier: state.timeMultiplier,
    robots: Array.from(state.robots.values()),
    objects: Array.from(state.objects.values()),
    zones: Array.from(state.zones.values()),
    obstacles: Array.from(state.obstacles.values()),
    tasks: Array.from(state.tasks.values()),
    metrics: state.metrics
  };
}

function simulationTick() {
  const now = Date.now();
  const deltaTime = ((now - lastTickTime) / 1000) * simulationState.timeMultiplier;
  lastTickTime = now;
  
  if (simulationState.status !== 'RUNNING') return;
  
  simulationState.tick++;
  
  // Update all robots
  for (const robot of simulationState.robots.values()) {
    updateRobot(robot, simulationState, deltaTime);
  }
  
  // Auto-assign pending tasks
  for (const task of simulationState.tasks.values()) {
    if (task.status === 'PENDING' && !task.assignedRobotId) {
      const robot = findBestRobotForTask(task, simulationState);
      if (robot) {
        assignTaskToRobot(task, robot, simulationState);
      }
    }

    // Emit failure events for recently failed tasks
    if (task.status === 'FAILED' && task.completedAt && (now - task.completedAt) < TICK_INTERVAL * 2) {
      io.emit('task:failed', {
        taskId: task.id,
        reason: task.failureReason,
        retryCount: task.retryCount,
        objectId: task.objectId
      });
    }
  }
  
  // Broadcast state to all clients
  io.emit('simulation:state', serializeState(simulationState));
}

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send initial state
  socket.emit('simulation:state', serializeState(simulationState));
  
  // Handle simulation control
  socket.on('simulation:start', () => {
    if (simulationState.status !== 'RUNNING') {
      simulationState.status = 'RUNNING';
      simulationState.startTime = Date.now();
      lastTickTime = Date.now();
      
      if (!simulationInterval) {
        simulationInterval = setInterval(simulationTick, TICK_INTERVAL);
      }
      
      io.emit('simulation:started', { timestamp: Date.now() });
      console.log('Simulation started');
    }
  });
  
  socket.on('simulation:pause', () => {
    if (simulationState.status === 'RUNNING') {
      simulationState.status = 'PAUSED';
      io.emit('simulation:paused', { timestamp: Date.now() });
      console.log('Simulation paused');
    }
  });
  
  socket.on('simulation:stop', () => {
    simulationState.status = 'STOPPED';
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    io.emit('simulation:stopped', { timestamp: Date.now() });
    console.log('Simulation stopped');
  });
  
  socket.on('simulation:reset', () => {
    simulationState = createInitialState();
    io.emit('simulation:state', serializeState(simulationState));
    console.log('Simulation reset');
  });
  
  socket.on('simulation:speed', (data: { multiplier: number }) => {
    simulationState.timeMultiplier = clamp(data.multiplier, 0.1, 10);
    io.emit('simulation:speed-changed', { multiplier: simulationState.timeMultiplier });
  });
  
  // Handle task creation with optional specific robot assignment
  socket.on('task:create', (data: { objectId: string; targetZoneId: string; robotId?: string }) => {
    try {
      const task = createPickAndPlaceTask(data.objectId, data.targetZoneId, simulationState);
      
      // If specific robot is requested, assign immediately
      if (data.robotId && data.robotId !== 'auto') {
        const robot = simulationState.robots.get(data.robotId);
        if (robot && robot.status === 'IDLE' && robot.battery > 30 && !robot.currentTaskId) {
          assignTaskToRobot(task, robot, simulationState);
          console.log(`Task ${task.id} assigned to ${robot.name}`);
        } else {
          console.log(`Task ${task.id} created, robot ${data.robotId} not available - will auto-assign`);
        }
      }
      
      io.emit('task:created', task);
      console.log(`Task created: ${task.id}`);
    } catch (error) {
      socket.emit('error', { message: (error as Error).message });
    }
  });
  
  // Handle bulk task creation - creates tasks for multiple objects at once
  socket.on('task:create-bulk', (data: { objectIds: string[]; targetZoneId: string; autoAssign?: boolean }) => {
    try {
      const createdTasks: Task[] = [];
      const availableRobots = Array.from(simulationState.robots.values())
        .filter(r => r.status === 'IDLE' && r.battery > 30 && !r.currentTaskId);
      
      let robotIndex = 0;
      
      for (const objectId of data.objectIds) {
        const task = createPickAndPlaceTask(objectId, data.targetZoneId, simulationState);
        createdTasks.push(task);
        
        // Auto-assign to available robots in round-robin fashion
        if (data.autoAssign !== false && robotIndex < availableRobots.length) {
          const robot = availableRobots[robotIndex];
          if (robot && !robot.currentTaskId) {
            assignTaskToRobot(task, robot, simulationState);
            robotIndex++;
          }
        }
      }
      
      io.emit('task:bulk-created', { tasks: createdTasks, assignedCount: robotIndex });
      console.log(`Bulk created ${createdTasks.length} tasks, assigned ${robotIndex} immediately`);
    } catch (error) {
      socket.emit('error', { message: (error as Error).message });
    }
  });
  
  socket.on('task:cancel', (data: { taskId: string }) => {
    const task = simulationState.tasks.get(data.taskId);
    if (task) {
      task.status = 'CANCELLED';
      if (task.assignedRobotId) {
        const robot = simulationState.robots.get(task.assignedRobotId);
        if (robot) {
          robot.currentTaskId = null;
          robot.status = 'IDLE';
          robot.path = [];
          if (robot.gripper?.heldObject) {
            const obj = simulationState.objects.get(robot.gripper.heldObject);
            if (obj) {
              obj.status = 'AVAILABLE';
              obj.pickedBy = null;
            }
            robot.gripper.heldObject = null;
            robot.gripper.isOpen = true;
          }
        }
      }
      io.emit('task:cancelled', { taskId: task.id });
    }
  });

  // Handle sort task - sorts objects by type to target zone
  socket.on('task:sort', (data: { objectIds: string[]; targetZoneId: string }) => {
    try {
      const tasks = createSortTask(data.objectIds, data.targetZoneId, simulationState);
      // Auto-assign to available robots
      const availableRobots = Array.from(simulationState.robots.values())
        .filter(r => r.status === 'IDLE' && r.battery > 30 && !r.currentTaskId);
      let robotIdx = 0;
      for (const task of tasks) {
        if (robotIdx < availableRobots.length) {
          assignTaskToRobot(task, availableRobots[robotIdx], simulationState);
          robotIdx++;
        }
      }
      io.emit('task:sort-created', { tasks, assignedCount: robotIdx });
      console.log(`Sort tasks created: ${tasks.length} items, ${robotIdx} assigned`);
    } catch (error) {
      socket.emit('error', { message: (error as Error).message });
    }
  });

  // Handle assemble task - brings multiple objects to assembly zone
  socket.on('task:assemble', (data: { objectIds: string[]; assemblyZoneId: string }) => {
    try {
      const tasks = createAssembleTask(data.objectIds, data.assemblyZoneId, simulationState);
      const availableRobots = Array.from(simulationState.robots.values())
        .filter(r => r.status === 'IDLE' && r.battery > 30 && !r.currentTaskId);
      let robotIdx = 0;
      for (const task of tasks) {
        if (robotIdx < availableRobots.length) {
          assignTaskToRobot(task, availableRobots[robotIdx], simulationState);
          robotIdx++;
        }
      }
      io.emit('task:assemble-created', { tasks, assignedCount: robotIdx });
      console.log(`Assembly tasks created: ${tasks.length} parts, ${robotIdx} assigned`);
    } catch (error) {
      socket.emit('error', { message: (error as Error).message });
    }
  });

  // Handle manual robot control
  socket.on('robot:move', (data: { robotId: string; target: Vector2D }) => {
    const robot = simulationState.robots.get(data.robotId);
    if (robot && !robot.currentTaskId) {
      robot.path = findPath(robot.pose, data.target, simulationState.obstacles);
      robot.pathIndex = 0;
      robot.status = 'MOVING';
    }
  });
  
  socket.on('robot:stop', (data: { robotId: string }) => {
    const robot = simulationState.robots.get(data.robotId);
    if (robot) {
      robot.path = [];
      robot.pathIndex = 0;
      robot.status = 'IDLE';
    }
  });
  
  // Handle AI auto-scheduling
  socket.on('ai:schedule', async () => {
    // Find all pending tasks and available robots
    let pendingTasks = Array.from(simulationState.tasks.values())
      .filter(t => t.status === 'PENDING');

    const availableRobots = Array.from(simulationState.robots.values())
      .filter(r => r.status === 'IDLE' && r.battery > 30 && r.currentTaskId === null);

    // If no pending tasks exist, auto-create pick-and-place tasks for available objects
    if (pendingTasks.length === 0 && availableRobots.length > 0) {
      const availableObjects = Array.from(simulationState.objects.values())
        .filter(o => o.status === 'AVAILABLE');
      const targetZones = Array.from(simulationState.zones.values())
        .filter(z => z.type === 'ASSEMBLY_AREA' || z.type === 'STAGING_ZONE' || z.type === 'WORK_ZONE');

      if (availableObjects.length > 0 && targetZones.length > 0) {
        const tasksToCreate = Math.min(availableObjects.length, availableRobots.length);
        const createdTasks: Task[] = [];

        for (let i = 0; i < tasksToCreate; i++) {
          const obj = availableObjects[i];
          // Pick a target zone different from where the object currently is
          let targetZone = targetZones[i % targetZones.length];
          // Avoid placing in same zone — find a different one
          for (const z of targetZones) {
            if (!isInsideBounds(obj.pose, z.bounds)) {
              targetZone = z;
              break;
            }
          }
          try {
            const task = createPickAndPlaceTask(obj.id, targetZone.id, simulationState);
            task.aiScore = 0.9;
            task.aiReasoning = `AI auto-created: Move ${obj.name} → ${targetZone.name}`;
            createdTasks.push(task);
          } catch {
            continue;
          }
        }

        pendingTasks = createdTasks;
        console.log(`🤖 AI auto-created ${createdTasks.length} tasks`);
      }
    }

    // Assign pending tasks to best available robots
    let tasksAssigned = 0;
    for (const task of pendingTasks) {
      const robot = findBestRobotForTask(task, simulationState);
      if (robot) {
        task.aiScore = task.aiScore || 0.85;
        task.aiReasoning = task.aiReasoning || `Assigned to ${robot.name}: Battery ${Math.round(robot.battery)}%, Distance optimal`;
        assignTaskToRobot(task, robot, simulationState);
        tasksAssigned++;
      }
    }

    io.emit('ai:scheduled', { tasksAssigned });
    console.log(`🤖 AI scheduled: ${tasksAssigned} tasks assigned`);
  });
  
  // Handle creating new objects
  socket.on('object:create', (data: { type: ObjectType; zoneId: string }) => {
    const zone = simulationState.zones.get(data.zoneId);
    if (!zone || zone.currentOccupancy >= zone.capacity) {
      socket.emit('error', { message: 'Zone is full or invalid' });
      return;
    }

    const objConfig = OBJECT_TYPE_CONFIGS[data.type];
    if (!objConfig) {
      socket.emit('error', { message: 'Invalid object type' });
      return;
    }
    
    const obj: ConstructionObject = {
      id: `obj-${generateId()}`,
      type: data.type,
      name: `${data.type.replace(/_/g, ' ')}`,
      pose: {
        x: zone.bounds.x + 10 + Math.random() * (zone.bounds.width - 20),
        y: zone.bounds.y + 10 + Math.random() * (zone.bounds.height - 20),
        rotation: Math.random() * 20 - 10
      },
      dimensions: objConfig.dimensions,
      weight: objConfig.weight,
      status: 'AVAILABLE',
      pickedBy: null,
      targetZone: null,
      color: objConfig.color
    };
    
    simulationState.objects.set(obj.id, obj);
    zone.currentOccupancy++;
    zone.objects.push(obj.id);
    
    io.emit('object:created', obj);
  });

  // Handle zone updates from client (user uploaded floor plan zones)
  socket.on('zones:update', (data: { zones: Array<{ id: string; name: string; type: string; bounds: { x: number; y: number; width: number; height: number }; color: string; capacity?: number }> }) => {
    if (!data.zones || data.zones.length === 0) {
      socket.emit('error', { message: 'No zones provided' });
      return;
    }

    console.log(`📍 Received zones:update with ${data.zones.length} zones`);

    // Stop any active tasks
    for (const [, task] of simulationState.tasks) {
      if (task.status === 'IN_PROGRESS' || task.status === 'ASSIGNED') {
        task.status = 'FAILED';
      }
    }
    simulationState.tasks.clear();

    // Clear existing zones and objects
    simulationState.zones.clear();
    simulationState.objects.clear();

    // Set new zones from client
    for (const zoneData of data.zones) {
      const zone: Zone = {
        id: zoneData.id,
        name: zoneData.name,
        type: zoneData.type as ZoneType,
        bounds: zoneData.bounds,
        color: zoneData.color,
        capacity: zoneData.capacity || 15,
        currentOccupancy: 0,
        objects: []
      };
      simulationState.zones.set(zone.id, zone);
    }

    // Generate objects for material zones
    generateObjectsForZones(simulationState);

    // Reposition robots to ROBOT_HOME or CHARGING_STATION zone
    const homeZone = Array.from(simulationState.zones.values()).find(z => z.type === 'ROBOT_HOME');
    const chargingZone = Array.from(simulationState.zones.values()).find(z => z.type === 'CHARGING_STATION');
    const spawnZone = homeZone || chargingZone;

    for (const [, robot] of simulationState.robots) {
      // Reset robot state
      robot.status = 'IDLE';
      robot.currentTaskId = null;
      robot.path = [];
      robot.pathIndex = 0;

      if (spawnZone) {
        robot.pose.x = spawnZone.bounds.x + 20 + Math.random() * Math.max(10, spawnZone.bounds.width - 40);
        robot.pose.y = spawnZone.bounds.y + 20 + Math.random() * Math.max(10, spawnZone.bounds.height - 40);
      } else {
        // Fallback to center of canvas
        robot.pose.x = 500 + Math.random() * 100 - 50;
        robot.pose.y = 400 + Math.random() * 100 - 50;
      }
    }

    // Update dimensions based on zones
    const maxX = Math.max(...data.zones.map(z => z.bounds.x + z.bounds.width), 1000);
    const maxY = Math.max(...data.zones.map(z => z.bounds.y + z.bounds.height), 800);
    simulationState.dimensions.width = maxX;
    simulationState.dimensions.height = maxY;

    // Reset metrics
    simulationState.metrics = {
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      averageTaskTime: 0,
      fleetEfficiency: 0,
      pickSuccessRate: 0
    };

    console.log(`✅ Zones updated: ${simulationState.zones.size} zones, ${simulationState.objects.size} objects generated`);

    // Broadcast updated state to all clients
    io.emit('zones:updated', {
      zonesCount: simulationState.zones.size,
      objectsCount: simulationState.objects.size
    });

    // Broadcast full state so clients (Fleet Simulation) see new zones immediately
    io.emit('simulation:state', serializeState(simulationState));
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🤖 ArcSpatial Simulation Server running on port ${PORT}`);
  console.log(`📍 Environment: Construction Site`);
  console.log(`🎮 Ready for WebSocket connections`);
});
