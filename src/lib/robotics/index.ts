/**
 * Armada Robot - Modular Robotics Library
 * 
 * This library provides a complete robotics simulation framework
 * with a modular architecture that can be swapped between:
 * 
 * - SIMULATED: Browser-based canvas simulation (current)
 * - ROS2: Connection to ROS2 via rosbridge
 * - GAZEBO: Connection to Gazebo simulation
 * - WEBOTS: Connection to Webots simulation
 * - HARDWARE: Direct hardware control
 * 
 * USAGE:
 * ```typescript
 * import { 
 *   SimulationManager, 
 *   createSimulation,
 *   RobotControllerFactory 
 * } from '@/lib/robotics';
 * 
 * // Quick setup
 * const sim = await createSimulation({
 *   controllerType: 'SIMULATED',
 *   aiEnabled: true,
 * });
 * sim.start();
 * 
 * // Or manual setup
 * const manager = new SimulationManager({ updateRate: 60 });
 * await manager.initialize();
 * manager.addRobot('robot-1', { x: 100, y: 100, theta: 0 });
 * manager.start();
 * ```
 * 
 * TO SWAP TO ROS2/GAZEBO:
 * 1. Implement IRobotController for your target platform
 * 2. Register it in RobotControllerFactory
 * 3. Change controllerType in config
 * 
 * @module robotics
 */

// Core interfaces and types - use 'export type' for type-only exports
export type {
  // Types
  Pose2D,
  Twist,
  Vector3,
  LaserScan,
  OccupancyGrid,
  JointState,
  
  // Robot types
  RobotState,
  RobotStatus,
  RobotGoal,
  PickGoal,
  PlaceGoal,
  ChargeGoal,
  NavigationGoal,
  
  // Decision types
  DecisionContext,
  Decision,
  
  // Interfaces
  IRobotController,
  INavigationService,
  IPerceptionService,
  IAIDecisionEngine,
  
  // Controller types
  ControllerType,
} from './robot-interface';

// Export factory as value
export { RobotControllerFactory } from './robot-interface';

// Simulated controller implementation
export { 
  SimulatedRobotController,
  PHYSICS_CONFIG,
} from './simulated-controller';

// AI Decision Engine
export { 
  GeminiDecisionEngine,
  aiDecisionEngine,
} from './ai-decision-engine';

// Navigation Service
export {
  NavigationService,
  MapProcessor,
  AStarPathfinder,
  navigationService,
} from './navigation-service';

// Simulation Manager
export {
  SimulationManager,
  connectToWebSocket,
  createSimulation,
} from './simulation-manager';

// ============================================
// QUICK START HELPERS
// ============================================

/**
 * Create a basic construction site simulation with default settings
 */
export async function createConstructionSimulation(): Promise<import('./simulation-manager').SimulationManager> {
  const { createSimulation } = await import('./simulation-manager');
  
  return createSimulation({
    controllerType: 'SIMULATED',
    updateRate: 30,
    aiEnabled: true,
    zones: [
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
        id: 'zone-staging',
        type: 'STAGING_ZONE',
        name: 'Staging Zone',
        bounds: { x: 300, y: 300, width: 100, height: 100 },
      },
      {
        id: 'zone-charging',
        type: 'CHARGING_STATION',
        name: 'Charging Station',
        bounds: { x: 50, y: 50, width: 80, height: 80 },
      },
      {
        id: 'zone-work',
        type: 'WORK_ZONE',
        name: 'Work Zone',
        bounds: { x: 400, y: 50, width: 200, height: 120 },
      },
    ],
    robots: [
      { id: 'forklift-1', pose: { x: 100, y: 200, theta: 0 } },
      { id: 'forklift-2', pose: { x: 200, y: 200, theta: Math.PI / 4 } },
      { id: 'crane-1', pose: { x: 400, y: 300, theta: -Math.PI / 2 } },
    ],
    objects: [
      { id: 'beam-1', type: 'STEEL_BEAM', pose: { x: 70, y: 370, z: 0 }, status: 'AVAILABLE' },
      { id: 'beam-2', type: 'STEEL_BEAM', pose: { x: 110, y: 370, z: 0 }, status: 'AVAILABLE' },
      { id: 'beam-3', type: 'STEEL_BEAM', pose: { x: 150, y: 370, z: 0 }, status: 'AVAILABLE' },
      { id: 'block-1', type: 'CONCRETE_BLOCK', pose: { x: 70, y: 410, z: 0 }, status: 'AVAILABLE' },
      { id: 'block-2', type: 'CONCRETE_BLOCK', pose: { x: 110, y: 410, z: 0 }, status: 'AVAILABLE' },
      { id: 'pipe-1', type: 'PIPE_SECTION', pose: { x: 150, y: 410, z: 0 }, status: 'AVAILABLE' },
      { id: 'panel-1', type: 'ELECTRICAL_PANEL', pose: { x: 70, y: 440, z: 0 }, status: 'AVAILABLE' },
    ],
  });
}

// ============================================
// VERSION & INFO
// ============================================

export const VERSION = '1.0.0';
export const ARCHITECTURE = {
  name: 'Armada Robot Simulation',
  description: 'Modular robotics framework for construction site automation',
  track: 'Track 3: Robotic Interaction & Task Execution',
  domain: 'Construction & Facilities',
  
  components: [
    'IRobotController - Abstract robot control interface',
    'SimulatedRobotController - Browser-based physics simulation',
    'GeminiDecisionEngine - AI-powered decision making',
    'NavigationService - Pathfinding and map processing',
    'SimulationManager - Orchestration and state management',
  ],
  
  features: [
    'Dynamic AI behavior (no hardcoding)',
    'A* pathfinding with obstacle avoidance',
    'Map upload and processing',
    'Multi-robot coordination',
    'Natural language task input',
    'WebSocket real-time updates',
  ],
  
  swappable: [
    'SIMULATED → ROS2 (via rosbridge)',
    'SIMULATED → Gazebo (via gzserver)',
    'SIMULATED → Webots (via controller)',
    'SIMULATED → Hardware (via serial/CAN)',
  ],
};
