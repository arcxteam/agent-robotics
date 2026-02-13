/**
 * Simulation Manager - Core Orchestrator
 * 
 * This is the main entry point for the robot simulation.
 * It coordinates:
 * - Multiple robot controllers
 * - AI decision engine
 * - Navigation service
 * - WebSocket communication
 * 
 * ARCHITECTURE NOTES:
 * This manager uses the IRobotController interface, so the underlying
 * implementation can be swapped between:
 * - SimulatedRobotController (current - browser-based)
 * - ROS2Controller (future - connects to ROS2 via rosbridge)
 * - GazeboController (future - connects to Gazebo simulation)
 * - HardwareController (production - real robots)
 * 
 * @module simulation-manager
 */

import { 
  IRobotController, 
  RobotStatus, 
  RobotGoal,
  DecisionContext,
  Pose2D,
  ControllerType,
  RobotControllerFactory,
} from './robot-interface';
import { GeminiDecisionEngine } from './ai-decision-engine';
import { NavigationService, MapProcessor } from './navigation-service';

// ============================================
// TYPES
// ============================================

interface SimulationConfig {
  controllerType: ControllerType;
  updateRate: number; // Hz
  aiEnabled: boolean;
  mapUrl?: string;
}

interface ConstructionObject {
  id: string;
  type: string;
  pose: { x: number; y: number; z: number };
  status: 'AVAILABLE' | 'ASSIGNED' | 'IN_TRANSIT' | 'PLACED';
  assignedRobotId?: string;
}

interface Zone {
  id: string;
  type: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
}

interface Task {
  id: string;
  type: 'PICK_AND_PLACE' | 'INSPECT' | 'PATROL';
  objectId?: string;
  objectType?: string;
  sourceZone?: string;
  targetZone: string;
  priority: number;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  assignedRobotId?: string;
}

interface SimulationState {
  isRunning: boolean;
  tick: number;
  timestamp: number;
  robots: RobotStatus[];
  objects: ConstructionObject[];
  zones: Zone[];
  tasks: Task[];
}

type EventCallback = (event: string, data: any) => void;

// ============================================
// SIMULATION MANAGER
// ============================================

export class SimulationManager {
  // Core components
  private controllers: Map<string, IRobotController> = new Map();
  private aiEngine: GeminiDecisionEngine;
  private navigation: NavigationService;

  // State
  private state: SimulationState;
  private config: SimulationConfig;
  private updateInterval: NodeJS.Timer | null = null;

  // Event system
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = {
      controllerType: config.controllerType || 'SIMULATED',
      updateRate: config.updateRate || 30,
      aiEnabled: config.aiEnabled !== false,
      mapUrl: config.mapUrl,
    };

    this.aiEngine = new GeminiDecisionEngine();
    this.navigation = new NavigationService();

    this.state = {
      isRunning: false,
      tick: 0,
      timestamp: Date.now(),
      robots: [],
      objects: [],
      zones: [],
      tasks: [],
    };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    console.log('Initializing Simulation Manager...');
    
    // Load map if provided
    if (this.config.mapUrl) {
      await this.loadMap(this.config.mapUrl);
    }

    this.emit('initialized', { config: this.config });
    console.log('Simulation Manager initialized');
  }

  async loadMap(mapUrl: string): Promise<void> {
    await this.navigation.loadMap(mapUrl);
    this.emit('map-loaded', { url: mapUrl });
  }

  setZones(zones: Zone[]): void {
    this.state.zones = zones;
    this.navigation.setZones(zones);
    this.emit('zones-updated', { zones });
  }

  // ============================================
  // ROBOT MANAGEMENT
  // ============================================

  addRobot(id: string, initialPose: Pose2D): IRobotController {
    const controller = RobotControllerFactory.create(
      this.config.controllerType,
      id,
      initialPose
    );

    this.controllers.set(id, controller);
    this.updateRobotStatus(id);

    this.emit('robot-added', { id, pose: initialPose });
    return controller;
  }

  removeRobot(id: string): void {
    const controller = this.controllers.get(id);
    if (controller) {
      controller.shutdown();
      this.controllers.delete(id);
      this.state.robots = this.state.robots.filter(r => r.id !== id);
      this.emit('robot-removed', { id });
    }
  }

  getRobot(id: string): IRobotController | undefined {
    return this.controllers.get(id);
  }

  getAllRobots(): IRobotController[] {
    return Array.from(this.controllers.values());
  }

  private updateRobotStatus(id: string): void {
    const controller = this.controllers.get(id);
    if (!controller) return;

    const status = controller.getStatus();
    const existingIndex = this.state.robots.findIndex(r => r.id === id);

    if (existingIndex >= 0) {
      this.state.robots[existingIndex] = status;
    } else {
      this.state.robots.push(status);
    }
  }

  // ============================================
  // OBJECT MANAGEMENT
  // ============================================

  addObject(object: ConstructionObject): void {
    this.state.objects.push(object);
    this.emit('object-added', { object });
  }

  removeObject(id: string): void {
    this.state.objects = this.state.objects.filter(o => o.id !== id);
    this.emit('object-removed', { id });
  }

  updateObject(id: string, updates: Partial<ConstructionObject>): void {
    const obj = this.state.objects.find(o => o.id === id);
    if (obj) {
      Object.assign(obj, updates);
      this.emit('object-updated', { object: obj });
    }
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================

  addTask(task: Task): void {
    this.state.tasks.push(task);
    this.emit('task-added', { task });
  }

  async addNaturalLanguageTask(command: string): Promise<Task[]> {
    const context = this.buildDecisionContext('');
    const decisions = await this.aiEngine.parseCommand(command, context);

    const tasks: Task[] = decisions.map((decision, index) => ({
      id: `task-${Date.now()}-${index}`,
      type: 'PICK_AND_PLACE' as const,
      objectId: decision.goal?.type === 'PICK' ? (decision.goal as any).objectId : undefined,
      targetZone: decision.goal?.type === 'PLACE' ? 'assembly-area' : 'work-zone',
      priority: decision.priority,
      status: 'PENDING' as const,
    }));

    for (const task of tasks) {
      this.addTask(task);
    }

    return tasks;
  }

  getNextPendingTask(): Task | undefined {
    return this.state.tasks
      .filter(t => t.status === 'PENDING')
      .sort((a, b) => b.priority - a.priority)[0];
  }

  // ============================================
  // SIMULATION LOOP
  // ============================================

  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    const intervalMs = 1000 / this.config.updateRate;

    this.updateInterval = setInterval(() => {
      this.update();
    }, intervalMs);

    this.emit('simulation-started', {});
    console.log(`Simulation started at ${this.config.updateRate}Hz`);
  }

  stop(): void {
    if (!this.state.isRunning) return;

    this.state.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval as unknown as number);
      this.updateInterval = null;
    }

    this.emit('simulation-stopped', {});
    console.log('Simulation stopped');
  }

  private async update(): Promise<void> {
    const deltaTime = 1 / this.config.updateRate;
    this.state.tick++;
    this.state.timestamp = Date.now();

    // Update each robot
    for (const [id, controller] of this.controllers) {
      try {
        // 1. Update physics
        controller.update(deltaTime);

        // 2. Check for AI decisions (if enabled and robot is idle)
        if (this.config.aiEnabled) {
          await this.processAIForRobot(id, controller);
        }

        // 3. Update status in state
        this.updateRobotStatus(id);

      } catch (error) {
        console.error(`Error updating robot ${id}:`, error);
      }
    }

    // Emit state update
    this.emit('state-update', this.getState());
  }

  private async processAIForRobot(id: string, controller: IRobotController): Promise<void> {
    const status = controller.getStatus();

    // Only decide when robot is idle
    if (status.state !== 'IDLE') return;

    // Check if there are pending tasks
    const pendingTask = this.state.tasks.find(
      t => t.status === 'PENDING' || (t.status === 'ASSIGNED' && t.assignedRobotId === id)
    );

    if (!pendingTask) return;

    // Build context and get AI decision
    const context = this.buildDecisionContext(id);
    const decision = await this.aiEngine.decideNextAction(context);

    // Execute decision
    if (decision.goal) {
      console.log(`Robot ${id} decision: ${decision.action} - ${decision.reasoning}`);
      controller.executeGoal(decision.goal);

      // Update task status
      if (pendingTask.status === 'PENDING') {
        pendingTask.status = 'ASSIGNED';
        pendingTask.assignedRobotId = id;
      }
    }
  }

  private buildDecisionContext(robotId: string): DecisionContext {
    const robot = this.state.robots.find(r => r.id === robotId);
    const defaultStatus: RobotStatus = {
      id: robotId,
      name: `Robot ${robotId}`,
      type: 'MOBILE_MANIPULATOR',
      state: 'IDLE',
      pose: { x: 0, y: 0, theta: 0 },
      velocity: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },
      battery: 100,
      isConnected: true,
      lastUpdate: Date.now(),
      currentTaskId: null,
      heldObjectId: null,
      errors: [],
    };

    // Convert ConstructionObject to DetectedObject format
    const availableObjects = this.state.objects
      .filter(o => o.status === 'AVAILABLE')
      .map(o => ({
        id: o.id,
        type: o.type,
        pose: { x: o.pose.x, y: o.pose.y, theta: 0 },
        confidence: 1.0,
        boundingBox: { x: o.pose.x - 10, y: o.pose.y - 10, width: 20, height: 20 },
      }));

    return {
      robotStatus: robot || defaultStatus,
      availableObjects,
      availableZones: this.state.zones,
      otherRobots: this.state.robots.filter(r => r.id !== robotId),
      pendingTasks: this.state.tasks.filter(
        t => t.status === 'PENDING' || (t.status === 'ASSIGNED' && t.assignedRobotId === robotId)
      ),
    };
  }

  // ============================================
  // STATE ACCESS
  // ============================================

  getState(): SimulationState {
    return { ...this.state };
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  isRunning(): boolean {
    return this.state.isRunning;
  }

  // ============================================
  // EVENT SYSTEM
  // ============================================

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event, data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  shutdown(): void {
    this.stop();
    
    for (const [id, controller] of this.controllers) {
      controller.shutdown();
    }
    
    this.controllers.clear();
    this.eventListeners.clear();
    
    console.log('Simulation Manager shut down');
  }
}

// ============================================
// WEBSOCKET INTEGRATION HELPER
// ============================================

/**
 * Connect SimulationManager to a WebSocket server
 * This bridges the simulation to the frontend
 */
export function connectToWebSocket(
  manager: SimulationManager,
  io: any // Socket.io server instance
): void {
  // Forward state updates to all clients
  manager.on('state-update', (event, data) => {
    io.emit('simulation:state', data);
  });

  // Handle events
  manager.on('robot-added', (event, data) => {
    io.emit('simulation:robot-added', data);
  });

  manager.on('robot-removed', (event, data) => {
    io.emit('simulation:robot-removed', data);
  });

  manager.on('task-added', (event, data) => {
    io.emit('simulation:task-added', data);
  });

  // Handle client commands
  io.on('connection', (socket: any) => {
    console.log('Client connected to simulation');

    // Send current state
    socket.emit('simulation:state', manager.getState());

    // Handle commands
    socket.on('simulation:add-robot', (data: { id: string; pose: Pose2D }) => {
      manager.addRobot(data.id, data.pose);
    });

    socket.on('simulation:remove-robot', (data: { id: string }) => {
      manager.removeRobot(data.id);
    });

    socket.on('simulation:add-task', async (data: { command: string }) => {
      const tasks = await manager.addNaturalLanguageTask(data.command);
      socket.emit('simulation:tasks-created', { tasks });
    });

    socket.on('simulation:manual-goal', (data: { robotId: string; goal: RobotGoal }) => {
      const robot = manager.getRobot(data.robotId);
      if (robot) {
        robot.executeGoal(data.goal);
      }
    });

    socket.on('simulation:start', () => {
      manager.start();
    });

    socket.on('simulation:stop', () => {
      manager.stop();
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from simulation');
    });
  });
}

// ============================================
// FACTORY FOR QUICK SETUP
// ============================================

export async function createSimulation(
  config: Partial<SimulationConfig> & {
    robots?: Array<{ id: string; pose: Pose2D }>;
    objects?: ConstructionObject[];
    zones?: Zone[];
  } = {}
): Promise<SimulationManager> {
  const manager = new SimulationManager(config);
  await manager.initialize();

  // Add default zones if none provided
  const zones = config.zones || [
    {
      id: 'zone-material',
      type: 'MATERIAL_STORAGE',
      name: 'Material Storage',
      bounds: { x: 50, y: 350, width: 150, height: 100 },
    },
    {
      id: 'zone-assembly',
      type: 'ASSEMBLY_AREA',
      name: 'Assembly Area',
      bounds: { x: 550, y: 200, width: 150, height: 150 },
    },
    {
      id: 'zone-charging',
      type: 'CHARGING_STATION',
      name: 'Charging Station',
      bounds: { x: 50, y: 50, width: 80, height: 80 },
    },
  ];
  manager.setZones(zones);

  // Add robots
  const robots = config.robots || [
    { id: 'robot-1', pose: { x: 100, y: 100, theta: 0 } },
    { id: 'robot-2', pose: { x: 200, y: 100, theta: Math.PI / 2 } },
  ];
  for (const robot of robots) {
    manager.addRobot(robot.id, robot.pose);
  }

  // Add objects
  const objects = config.objects || [
    { id: 'obj-1', type: 'STEEL_BEAM', pose: { x: 80, y: 380, z: 0 }, status: 'AVAILABLE' as const },
    { id: 'obj-2', type: 'STEEL_BEAM', pose: { x: 120, y: 380, z: 0 }, status: 'AVAILABLE' as const },
    { id: 'obj-3', type: 'CONCRETE_BLOCK', pose: { x: 160, y: 420, z: 0 }, status: 'AVAILABLE' as const },
  ];
  for (const obj of objects) {
    manager.addObject(obj);
  }

  return manager;
}

// Export default instance factory
export default SimulationManager;
