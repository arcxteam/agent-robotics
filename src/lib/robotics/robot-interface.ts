/**
 * Robot Controller Interface - Abstraction Layer
 * 
 * This file defines the interface that ALL robot controllers must implement.
 * It can be replaced with:
 * - ROS2 controller (ros2-controller.ts)
 * - Gazebo controller (gazebo-controller.ts)
 * - Webots controller (webots-controller.ts)
 * - Real hardware controller (hardware-controller.ts)
 * 
 * Current implementation: SimulatedRobotController (for web demo)
 * 
 * @module robot-interface
 */

// ============================================
// CORE TYPES - Compatible with ROS2 messages
// ============================================

export interface Pose2D {
  x: number;      // meters
  y: number;      // meters
  theta: number;  // radians
}

export interface Twist {
  linear: { x: number; y: number; z: number };   // m/s
  angular: { x: number; y: number; z: number };  // rad/s
}

export interface LaserScan {
  angleMin: number;
  angleMax: number;
  angleIncrement: number;
  rangeMin: number;
  rangeMax: number;
  ranges: number[];
  intensities: number[];
}

export interface OccupancyGrid {
  width: number;
  height: number;
  resolution: number;  // meters per cell
  origin: Pose2D;
  data: number[];      // 0-100 occupancy probability, -1 unknown
}

export interface JointState {
  name: string[];
  position: number[];
  velocity: number[];
  effort: number[];
}

export interface GripperCommand {
  position: number;   // 0 = closed, 1 = open
  maxEffort: number;
}

// ============================================
// ROBOT STATUS - Standard across all controllers
// ============================================

export type RobotState = 
  | 'IDLE' 
  | 'MOVING' 
  | 'PICKING' 
  | 'PLACING' 
  | 'CARRYING' 
  | 'CHARGING' 
  | 'ERROR'
  | 'PLANNING';

export interface RobotStatus {
  id: string;
  name: string;
  type: 'MOBILE_MANIPULATOR' | 'AMR' | 'FORKLIFT' | 'ARM';
  state: RobotState;
  pose: Pose2D;
  velocity: Twist;
  battery: number;           // 0-100
  isConnected: boolean;
  lastUpdate: number;        // timestamp
  currentTaskId: string | null;
  heldObjectId: string | null;
  errors: string[];
}

// ============================================
// TASK TYPES - Compatible with MoveIt/Nav2
// ============================================

export interface NavigationGoal {
  type: 'NAVIGATE';
  targetPose: Pose2D;
  tolerance: number;
}

export interface PickGoal {
  type: 'PICK';
  objectId: string;
  objectPose: Pose2D;
  approachDistance: number;
  graspForce: number;
}

export interface PlaceGoal {
  type: 'PLACE';
  targetPose: Pose2D;
  objectId: string;
  placeHeight: number;
}

export interface ChargeGoal {
  type: 'CHARGE';
  stationId: string;
  stationPose: Pose2D;
}

export type RobotGoal = NavigationGoal | PickGoal | PlaceGoal | ChargeGoal;

export interface GoalResult {
  success: boolean;
  message: string;
  finalPose?: Pose2D;
  executionTime: number;
}

// ============================================
// ROBOT CONTROLLER INTERFACE
// This is what gets swapped for ROS2/Gazebo
// ============================================

export interface IRobotController {
  // Connection
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Status
  getStatus(): RobotStatus;
  getRobotId(): string;

  // Sensing
  getLaserScan(): LaserScan | null;
  getJointStates(): JointState | null;
  getCurrentPose(): Pose2D;
  
  // Motion commands
  setVelocity(twist: Twist): void;
  stop(): void;
  
  // High-level goals (async)
  executeGoal(goal: RobotGoal): Promise<GoalResult>;
  cancelGoal(): void;
  
  // Gripper
  setGripper(command: GripperCommand): Promise<boolean>;
  getGripperState(): { position: number; isHolding: boolean };
  
  // Arm (if applicable)
  setArmJoints(positions: number[]): Promise<boolean>;
  
  // Update loop
  update(deltaTime: number): void;
  
  // Cleanup
  shutdown(): void;
}

// ============================================
// NAVIGATION INTERFACE
// Can be replaced with Nav2 client
// ============================================

export interface INavigationService {
  // Map
  setMap(map: OccupancyGrid): void;
  getMap(): OccupancyGrid | null;
  
  // Pathfinding
  planPath(start: Pose2D, goal: Pose2D): Promise<Pose2D[]>;
  isPathClear(path: Pose2D[]): boolean;
  
  // Localization
  setInitialPose(pose: Pose2D): void;
  getCurrentPose(): Pose2D;
  
  // Costmap
  getCostmap(): OccupancyGrid;
  addObstacle(pose: Pose2D, radius: number): void;
  removeObstacle(pose: Pose2D): void;
}

// ============================================
// PERCEPTION INTERFACE
// Can be replaced with vision pipeline
// ============================================

export interface DetectedObject {
  id: string;
  type: string;
  pose: Pose2D;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface IPerceptionService {
  // Object detection
  detectObjects(): DetectedObject[];
  getObjectById(id: string): DetectedObject | null;
  
  // Zone detection
  detectZones(): { id: string; type: string; bounds: any }[];
  
  // Obstacle detection
  detectObstacles(): Pose2D[];
}

// ============================================
// AI DECISION ENGINE INTERFACE
// Uses Gemini for intelligent decisions
// ============================================

export interface DecisionContext {
  robotStatus: RobotStatus;
  availableObjects: DetectedObject[];
  availableZones: any[];
  pendingTasks: any[];
  environmentState?: any;
  otherRobots?: RobotStatus[];
}

export interface Decision {
  action: 'NAVIGATE' | 'PICK' | 'PLACE' | 'WAIT' | 'CHARGE' | 'REPLAN';
  goal?: RobotGoal;
  reasoning: string;
  confidence: number;
  priority: number;
}

export interface IAIDecisionEngine {
  // Make decision based on current context
  decideNextAction(context: DecisionContext): Promise<Decision>;
  
  // Natural language command parsing
  parseCommand(command: string, context: DecisionContext): Promise<Decision[]>;
  
  // Failure handling
  handleFailure(failedAction: string, error: string, context: DecisionContext): Promise<Decision>;
  
  // Task decomposition
  decomposeTask(task: any, context: DecisionContext): Promise<Decision[]>;
}

// ============================================
// FACTORY FOR CREATING CONTROLLERS
// Switch implementation here
// ============================================

export type ControllerType = 'SIMULATED' | 'ROS2' | 'GAZEBO' | 'WEBOTS' | 'HARDWARE';

export interface ControllerConfig {
  type: ControllerType;
  robotId: string;
  robotName: string;
  robotType: 'MOBILE_MANIPULATOR' | 'AMR' | 'FORKLIFT' | 'ARM';
  initialPose?: Pose2D;
  ros2Options?: {
    nodeNamespace: string;
    cmdVelTopic: string;
    odomTopic: string;
  };
  gazeboOptions?: {
    worldFile: string;
    modelName: string;
  };
}

// Export default config
export const DEFAULT_CONTROLLER_TYPE: ControllerType = 'SIMULATED';

// ============================================
// FACTORY FOR CREATING CONTROLLERS
// ============================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

import { SimulatedRobotController } from './simulated-controller';

export class RobotControllerFactory {
  static create(
    type: ControllerType,
    robotId: string,
    initialPose: Pose2D = { x: 0, y: 0, theta: 0 }
  ): IRobotController {
    switch (type) {
      case 'SIMULATED':
        return new SimulatedRobotController(robotId, `Robot ${robotId}`, initialPose);
      case 'ROS2':
        // TODO: Implement ROS2 controller
        console.warn('ROS2 controller not implemented, using simulated');
        return new SimulatedRobotController(robotId, `Robot ${robotId}`, initialPose);
      case 'GAZEBO':
        // TODO: Implement Gazebo controller
        console.warn('Gazebo controller not implemented, using simulated');
        return new SimulatedRobotController(robotId, `Robot ${robotId}`, initialPose);
      case 'WEBOTS':
        // TODO: Implement Webots controller
        console.warn('Webots controller not implemented, using simulated');
        return new SimulatedRobotController(robotId, `Robot ${robotId}`, initialPose);
      case 'HARDWARE':
        // TODO: Implement hardware controller
        console.warn('Hardware controller not implemented, using simulated');
        return new SimulatedRobotController(robotId, `Robot ${robotId}`, initialPose);
      default:
        return new SimulatedRobotController(robotId, `Robot ${robotId}`, initialPose);
    }
  }
}

// Re-export types for convenience
export type { NavigationGoal as NavigateGoal };
