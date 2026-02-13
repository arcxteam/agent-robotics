/**
 * Simulated Robot Controller
 * 
 * This is the WEB-BASED simulation implementation.
 * It provides physics-like behavior without actual physics engine.
 * 
 * TO REPLACE WITH ROS2:
 * 1. Create ros2-controller.ts implementing IRobotController
 * 2. Use rclnodejs or rosbridge for ROS2 communication
 * 3. Subscribe to /odom, /scan topics
 * 4. Publish to /cmd_vel topic
 * 
 * TO REPLACE WITH GAZEBO:
 * 1. Create gazebo-controller.ts implementing IRobotController
 * 2. Use Gazebo transport or ROS2 bridge
 * 3. Control robot model in Gazebo world
 * 
 * @module simulated-controller
 */

import {
  IRobotController,
  RobotStatus,
  RobotState,
  RobotGoal,
  GoalResult,
  Pose2D,
  Twist,
  LaserScan,
  JointState,
  GripperCommand,
  ControllerConfig,
  PickGoal,
  PlaceGoal,
  ChargeGoal,
  NavigationGoal,
} from './robot-interface';

// ============================================
// PHYSICS CONSTANTS (Tunable)
// ============================================

const PHYSICS = {
  MAX_LINEAR_VELOCITY: 1.5,      // m/s
  MAX_ANGULAR_VELOCITY: 2.0,     // rad/s
  LINEAR_ACCELERATION: 0.8,      // m/s²
  ANGULAR_ACCELERATION: 1.5,     // rad/s²
  FRICTION_COEFFICIENT: 0.1,
  POSITION_TOLERANCE: 0.1,       // meters
  ANGLE_TOLERANCE: 0.1,          // radians
  PICK_DISTANCE: 0.5,            // meters - how close to pick
  LIDAR_RANGE: 10.0,             // meters
  LIDAR_RAYS: 360,               // number of rays
  BATTERY_DRAIN_MOVING: 0.01,    // % per second
  BATTERY_DRAIN_IDLE: 0.001,     // % per second
  CHARGE_RATE: 0.5,              // % per second
};

// ============================================
// SIMULATED ROBOT CONTROLLER
// ============================================

// Export physics config for external use
export const PHYSICS_CONFIG = { ...PHYSICS };

export class SimulatedRobotController implements IRobotController {
  private status: RobotStatus;
  private currentVelocity: Twist;
  private targetVelocity: Twist;
  private currentGoal: RobotGoal | null = null;
  private goalResolver: ((result: GoalResult) => void) | null = null;
  private path: Pose2D[] = [];
  private pathIndex: number = 0;
  private gripperState = { position: 1, isHolding: false };
  private armJoints: number[] = [0, 0, 0, 0, 0, 0];
  private laserScan: LaserScan | null = null;
  private obstacles: Pose2D[] = [];
  private goalStartTime: number = 0;

  // Support both simple and config-based construction
  constructor(robotId: string, robotName?: string, initialPose?: Pose2D);
  constructor(config: ControllerConfig);
  constructor(configOrId: ControllerConfig | string, robotName?: string, initialPose?: Pose2D) {
    let id: string;
    let name: string;
    let type: 'MOBILE_MANIPULATOR' | 'AMR' | 'FORKLIFT' | 'ARM';
    let pose: Pose2D;

    if (typeof configOrId === 'string') {
      id = configOrId;
      name = robotName || `Robot ${configOrId}`;
      type = 'MOBILE_MANIPULATOR';
      pose = initialPose || { x: 0, y: 0, theta: 0 };
    } else {
      id = configOrId.robotId;
      name = configOrId.robotName;
      type = configOrId.robotType;
      pose = configOrId.initialPose || { x: 0, y: 0, theta: 0 };
    }
    
    this.status = {
      id,
      name,
      type,
      state: 'IDLE',
      pose,
      velocity: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },
      battery: 100,
      isConnected: true,
      lastUpdate: Date.now(),
      currentTaskId: null,
      heldObjectId: null,
      errors: [],
    };

    this.currentVelocity = { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } };
    this.targetVelocity = { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } };

    this.initializeLaserScan();
  }

  // ============================================
  // CONNECTION (simulated - always connected)
  // ============================================

  async connect(): Promise<boolean> {
    this.status.isConnected = true;
    console.log(`[${this.status.id}] Connected (simulated)`);
    return true;
  }

  async disconnect(): Promise<void> {
    this.status.isConnected = false;
    console.log(`[${this.status.id}] Disconnected`);
  }

  isConnected(): boolean {
    return this.status.isConnected;
  }

  // ============================================
  // STATUS
  // ============================================

  getStatus(): RobotStatus {
    return { ...this.status };
  }

  getRobotId(): string {
    return this.status.id;
  }

  // ============================================
  // SENSING
  // ============================================

  private initializeLaserScan(): void {
    this.laserScan = {
      angleMin: -Math.PI,
      angleMax: Math.PI,
      angleIncrement: (2 * Math.PI) / PHYSICS.LIDAR_RAYS,
      rangeMin: 0.1,
      rangeMax: PHYSICS.LIDAR_RANGE,
      ranges: new Array(PHYSICS.LIDAR_RAYS).fill(PHYSICS.LIDAR_RANGE),
      intensities: new Array(PHYSICS.LIDAR_RAYS).fill(1),
    };
  }

  getLaserScan(): LaserScan | null {
    return this.laserScan;
  }

  getJointStates(): JointState | null {
    if (this.status.type !== 'MOBILE_MANIPULATOR' && this.status.type !== 'ARM') {
      return null;
    }
    return {
      name: ['joint1', 'joint2', 'joint3', 'joint4', 'joint5', 'joint6'],
      position: [...this.armJoints],
      velocity: [0, 0, 0, 0, 0, 0],
      effort: [0, 0, 0, 0, 0, 0],
    };
  }

  getCurrentPose(): Pose2D {
    return { ...this.status.pose };
  }

  setObstacles(obstacles: Pose2D[]): void {
    this.obstacles = obstacles;
  }

  // ============================================
  // MOTION COMMANDS
  // ============================================

  setVelocity(twist: Twist): void {
    // Clamp velocities
    this.targetVelocity = {
      linear: {
        x: Math.max(-PHYSICS.MAX_LINEAR_VELOCITY, Math.min(PHYSICS.MAX_LINEAR_VELOCITY, twist.linear.x)),
        y: Math.max(-PHYSICS.MAX_LINEAR_VELOCITY, Math.min(PHYSICS.MAX_LINEAR_VELOCITY, twist.linear.y)),
        z: 0,
      },
      angular: {
        x: 0,
        y: 0,
        z: Math.max(-PHYSICS.MAX_ANGULAR_VELOCITY, Math.min(PHYSICS.MAX_ANGULAR_VELOCITY, twist.angular.z)),
      },
    };
  }

  stop(): void {
    this.targetVelocity = { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } };
    this.currentVelocity = { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } };
    this.status.state = 'IDLE';
  }

  // ============================================
  // HIGH-LEVEL GOALS
  // ============================================

  async executeGoal(goal: RobotGoal): Promise<GoalResult> {
    this.currentGoal = goal;
    this.goalStartTime = Date.now();

    return new Promise((resolve) => {
      this.goalResolver = resolve;
      
      switch (goal.type) {
        case 'NAVIGATE':
          this.startNavigation(goal.targetPose);
          break;
        case 'PICK':
          this.startPicking(goal);
          break;
        case 'PLACE':
          this.startPlacing(goal);
          break;
        case 'CHARGE':
          this.startCharging(goal);
          break;
      }
    });
  }

  cancelGoal(): void {
    if (this.goalResolver) {
      this.goalResolver({
        success: false,
        message: 'Goal cancelled',
        executionTime: Date.now() - this.goalStartTime,
      });
      this.goalResolver = null;
    }
    this.currentGoal = null;
    this.stop();
  }

  private startNavigation(target: Pose2D): void {
    this.status.state = 'MOVING';
    this.path = this.planSimplePath(this.status.pose, target);
    this.pathIndex = 0;
  }

  private startPicking(goal: PickGoal): void {
    // First navigate to object
    this.status.state = 'MOVING';
    const approachPose = this.calculateApproachPose(goal.objectPose, goal.approachDistance);
    this.path = this.planSimplePath(this.status.pose, approachPose);
    this.pathIndex = 0;
  }

  private startPlacing(goal: PlaceGoal): void {
    this.status.state = 'MOVING';
    this.path = this.planSimplePath(this.status.pose, goal.targetPose);
    this.pathIndex = 0;
  }

  private startCharging(goal: ChargeGoal): void {
    this.status.state = 'MOVING';
    this.path = this.planSimplePath(this.status.pose, goal.stationPose);
    this.pathIndex = 0;
  }

  // ============================================
  // GRIPPER
  // ============================================

  async setGripper(command: GripperCommand): Promise<boolean> {
    this.gripperState.position = command.position;
    
    // Simulate grip/release
    if (command.position < 0.3) {
      // Closing - check if object is in range
      this.gripperState.isHolding = true; // Simplified
    } else {
      this.gripperState.isHolding = false;
    }
    
    return true;
  }

  getGripperState(): { position: number; isHolding: boolean } {
    return { ...this.gripperState };
  }

  setHeldObject(objectId: string | null): void {
    this.status.heldObjectId = objectId;
    this.gripperState.isHolding = objectId !== null;
  }

  // ============================================
  // ARM
  // ============================================

  async setArmJoints(positions: number[]): Promise<boolean> {
    if (positions.length !== 6) return false;
    this.armJoints = [...positions];
    return true;
  }

  // ============================================
  // UPDATE LOOP - Called every tick
  // ============================================

  update(deltaTime: number): void {
    if (!this.status.isConnected) return;

    this.status.lastUpdate = Date.now();

    // Update velocity with acceleration
    this.updateVelocity(deltaTime);

    // Update position based on velocity
    this.updatePosition(deltaTime);

    // Update LIDAR
    this.updateLaserScan();

    // Update battery
    this.updateBattery(deltaTime);

    // Process current goal
    this.processGoal(deltaTime);

    // Update status velocity
    this.status.velocity = { ...this.currentVelocity };
  }

  private updateVelocity(dt: number): void {
    // Smooth acceleration towards target velocity
    const accelLinear = PHYSICS.LINEAR_ACCELERATION * dt;
    const accelAngular = PHYSICS.ANGULAR_ACCELERATION * dt;

    this.currentVelocity.linear.x = this.approach(
      this.currentVelocity.linear.x,
      this.targetVelocity.linear.x,
      accelLinear
    );
    this.currentVelocity.linear.y = this.approach(
      this.currentVelocity.linear.y,
      this.targetVelocity.linear.y,
      accelLinear
    );
    this.currentVelocity.angular.z = this.approach(
      this.currentVelocity.angular.z,
      this.targetVelocity.angular.z,
      accelAngular
    );

    // Apply friction when no target velocity
    if (this.targetVelocity.linear.x === 0) {
      this.currentVelocity.linear.x *= (1 - PHYSICS.FRICTION_COEFFICIENT);
    }
    if (this.targetVelocity.linear.y === 0) {
      this.currentVelocity.linear.y *= (1 - PHYSICS.FRICTION_COEFFICIENT);
    }
  }

  private updatePosition(dt: number): void {
    const pose = this.status.pose;
    const vel = this.currentVelocity;

    // Update rotation
    pose.theta += vel.angular.z * dt;
    pose.theta = this.normalizeAngle(pose.theta);

    // Update position (robot-frame velocities to world-frame)
    const cos = Math.cos(pose.theta);
    const sin = Math.sin(pose.theta);
    pose.x += (vel.linear.x * cos - vel.linear.y * sin) * dt;
    pose.y += (vel.linear.x * sin + vel.linear.y * cos) * dt;
  }

  private updateLaserScan(): void {
    if (!this.laserScan) return;

    const pose = this.status.pose;
    
    for (let i = 0; i < PHYSICS.LIDAR_RAYS; i++) {
      const angle = this.laserScan.angleMin + i * this.laserScan.angleIncrement + pose.theta;
      let minRange = PHYSICS.LIDAR_RANGE;

      // Check against obstacles
      for (const obstacle of this.obstacles) {
        const dx = obstacle.x - pose.x;
        const dy = obstacle.y - pose.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const obstacleAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(this.normalizeAngle(angle - obstacleAngle));

        // Simple obstacle detection (treat as points)
        if (angleDiff < 0.1 && dist < minRange) {
          minRange = dist;
        }
      }

      this.laserScan.ranges[i] = minRange;
    }
  }

  private updateBattery(dt: number): void {
    if (this.status.state === 'CHARGING') {
      this.status.battery = Math.min(100, this.status.battery + PHYSICS.CHARGE_RATE * dt);
    } else if (this.status.state === 'IDLE') {
      this.status.battery = Math.max(0, this.status.battery - PHYSICS.BATTERY_DRAIN_IDLE * dt);
    } else {
      this.status.battery = Math.max(0, this.status.battery - PHYSICS.BATTERY_DRAIN_MOVING * dt);
    }
  }

  private processGoal(dt: number): void {
    if (!this.currentGoal || !this.goalResolver) return;

    switch (this.currentGoal.type) {
      case 'NAVIGATE':
        this.processNavigation();
        break;
      case 'PICK':
        this.processPicking(this.currentGoal);
        break;
      case 'PLACE':
        this.processPlacing(this.currentGoal);
        break;
      case 'CHARGE':
        this.processCharging();
        break;
    }
  }

  private processNavigation(): void {
    if (this.path.length === 0 || !this.currentGoal) return;

    const target = this.path[this.pathIndex];
    const pose = this.status.pose;
    const dx = target.x - pose.x;
    const dy = target.y - pose.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);
    const angleDiff = this.normalizeAngle(targetAngle - pose.theta);

    if (distance < PHYSICS.POSITION_TOLERANCE) {
      // Reached waypoint
      this.pathIndex++;
      
      if (this.pathIndex >= this.path.length) {
        // Reached final destination
        this.stop();
        this.status.state = 'IDLE';
        
        if (this.goalResolver) {
          this.goalResolver({
            success: true,
            message: 'Navigation complete',
            finalPose: { ...pose },
            executionTime: Date.now() - this.goalStartTime,
          });
          this.goalResolver = null;
          this.currentGoal = null;
        }
      }
    } else {
      // Move towards target
      if (Math.abs(angleDiff) > PHYSICS.ANGLE_TOLERANCE) {
        // Rotate first
        this.setVelocity({
          linear: { x: 0, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: Math.sign(angleDiff) * PHYSICS.MAX_ANGULAR_VELOCITY * 0.5 },
        });
      } else {
        // Move forward
        const speed = Math.min(PHYSICS.MAX_LINEAR_VELOCITY, distance);
        this.setVelocity({
          linear: { x: speed, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: angleDiff * 0.5 },
        });
      }
    }
  }

  private processPicking(goal: PickGoal): void {
    const pose = this.status.pose;
    const objPose = goal.objectPose;
    const distance = this.distance(pose, objPose);

    if (this.status.state === 'MOVING') {
      // Navigate to object
      this.processNavigation();
      
      if (distance < PHYSICS.PICK_DISTANCE) {
        this.status.state = 'PICKING';
        this.stop();
      }
    } else if (this.status.state === 'PICKING') {
      // Execute pick
      this.gripperState.position = 0;
      this.gripperState.isHolding = true;
      this.status.heldObjectId = goal.objectId;
      this.status.state = 'CARRYING';
      
      if (this.goalResolver) {
        this.goalResolver({
          success: true,
          message: `Picked object ${goal.objectId}`,
          finalPose: { ...pose },
          executionTime: Date.now() - this.goalStartTime,
        });
        this.goalResolver = null;
        this.currentGoal = null;
      }
    }
  }

  private processPlacing(goal: PlaceGoal): void {
    const pose = this.status.pose;
    const targetPose = goal.targetPose;
    const distance = this.distance(pose, targetPose);

    if (this.status.state === 'MOVING') {
      this.processNavigation();
      
      if (distance < PHYSICS.POSITION_TOLERANCE) {
        this.status.state = 'PLACING';
        this.stop();
      }
    } else if (this.status.state === 'PLACING') {
      // Execute place
      this.gripperState.position = 1;
      this.gripperState.isHolding = false;
      this.status.heldObjectId = null;
      this.status.state = 'IDLE';
      
      if (this.goalResolver) {
        this.goalResolver({
          success: true,
          message: `Placed object ${goal.objectId}`,
          finalPose: { ...pose },
          executionTime: Date.now() - this.goalStartTime,
        });
        this.goalResolver = null;
        this.currentGoal = null;
      }
    }
  }

  private processCharging(): void {
    if (this.status.state === 'MOVING') {
      this.processNavigation();
    } else if (this.status.battery >= 100) {
      this.status.state = 'IDLE';
      
      if (this.goalResolver) {
        this.goalResolver({
          success: true,
          message: 'Charging complete',
          executionTime: Date.now() - this.goalStartTime,
        });
        this.goalResolver = null;
        this.currentGoal = null;
      }
    } else {
      this.status.state = 'CHARGING';
    }
  }

  // ============================================
  // PATHFINDING (Simple A*)
  // ============================================

  private planSimplePath(start: Pose2D, goal: Pose2D): Pose2D[] {
    // Simplified path - direct line with waypoints
    // In production, replace with proper A* or Nav2
    const path: Pose2D[] = [];
    const steps = Math.max(1, Math.floor(this.distance(start, goal) / 0.5));
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      path.push({
        x: start.x + (goal.x - start.x) * t,
        y: start.y + (goal.y - start.y) * t,
        theta: goal.theta,
      });
    }
    
    return path;
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private approach(current: number, target: number, maxDelta: number): number {
    const diff = target - current;
    if (Math.abs(diff) <= maxDelta) return target;
    return current + Math.sign(diff) * maxDelta;
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  private distance(a: Pose2D, b: Pose2D): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }

  private calculateApproachPose(objectPose: Pose2D, distance: number): Pose2D {
    const angle = objectPose.theta + Math.PI; // Approach from front
    return {
      x: objectPose.x + Math.cos(angle) * distance,
      y: objectPose.y + Math.sin(angle) * distance,
      theta: objectPose.theta,
    };
  }

  // ============================================
  // PATH GETTER (for visualization)
  // ============================================

  getPath(): Pose2D[] {
    return [...this.path];
  }

  getPathIndex(): number {
    return this.pathIndex;
  }

  // ============================================
  // CLEANUP
  // ============================================

  shutdown(): void {
    this.cancelGoal();
    this.status.isConnected = false;
    this.status.state = 'IDLE';
    console.log(`[${this.status.id}] Shutdown`);
  }
}
