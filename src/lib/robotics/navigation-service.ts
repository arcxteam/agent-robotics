/**
 * Navigation Service - Map Processing & Path Planning
 * 
 * This module handles:
 * - Processing uploaded floor plan images into occupancy grids
 * - A* pathfinding with obstacle avoidance
 * - Dynamic path replanning when obstacles detected
 * - Multi-robot coordination to avoid collisions
 * 
 * The architecture is designed to be swappable:
 * - In simulation: Uses canvas-based image processing
 * - In production: Can be replaced with ROS2 nav2 stack
 * 
 * @module navigation-service
 */

import { INavigationService, OccupancyGrid, Pose2D, LaserScan, Twist } from './robot-interface';

// ============================================
// TYPES
// ============================================

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost
  parent: PathNode | null;
}

interface ProcessedMap {
  grid: number[][];
  resolution: number;
  width: number;
  height: number;
  origin: { x: number; y: number };
}

interface Zone {
  id: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
}

// ============================================
// MAP PROCESSOR - Convert images to occupancy grid
// ============================================

export class MapProcessor {
  /**
   * Process an uploaded floor plan image into an occupancy grid.
   * 
   * In browser: Uses canvas to analyze image pixels
   * In Node.js/production: Would use OpenCV or ROS2 map_server
   */
  static async processImageToGrid(
    imageDataUrl: string,
    resolution: number = 0.05 // 5cm per pixel
  ): Promise<ProcessedMap> {
    // This is the browser-compatible version
    // For production, replace with:
    // - ROS2: nav2_map_server
    // - Gazebo: built-in map loading
    
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        // Node.js environment - return placeholder grid
        resolve(this.createDefaultGrid(800, 600, resolution));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const grid = this.imageDataToGrid(imageData);

        resolve({
          grid,
          resolution,
          width: img.width,
          height: img.height,
          origin: { x: 0, y: 0 },
        });
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  }

  /**
   * Convert image pixels to occupancy values
   * Dark pixels = obstacles (1.0)
   * Light pixels = free space (0.0)
   * Gray pixels = unknown (0.5)
   */
  private static imageDataToGrid(imageData: ImageData): number[][] {
    const { width, height, data } = imageData;
    const grid: number[][] = [];

    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Calculate brightness (0-255)
        const brightness = (r + g + b) / 3;
        
        // Convert to occupancy (0 = free, 1 = occupied)
        // Dark (< 50) = wall/obstacle
        // Light (> 200) = free space
        // Middle = unknown/semi-blocked
        if (brightness < 50) {
          row.push(1.0); // Obstacle
        } else if (brightness > 200) {
          row.push(0.0); // Free
        } else {
          row.push(0.5); // Unknown/partial
        }
      }
      grid.push(row);
    }

    return grid;
  }

  private static createDefaultGrid(
    width: number,
    height: number,
    resolution: number
  ): ProcessedMap {
    const gridWidth = Math.ceil(width * resolution);
    const gridHeight = Math.ceil(height * resolution);
    const grid: number[][] = [];

    for (let y = 0; y < gridHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < gridWidth; x++) {
        // Create walls around edges
        if (x === 0 || y === 0 || x === gridWidth - 1 || y === gridHeight - 1) {
          row.push(1.0);
        } else {
          row.push(0.0);
        }
      }
      grid.push(row);
    }

    return { grid, resolution, width, height, origin: { x: 0, y: 0 } };
  }

  /**
   * Add zones to the occupancy grid as different values
   * This allows the pathfinder to know about special areas
   */
  static addZonesToGrid(grid: number[][], zones: Zone[], resolution: number): void {
    for (const zone of zones) {
      const startX = Math.floor(zone.bounds.x * resolution);
      const startY = Math.floor(zone.bounds.y * resolution);
      const endX = Math.ceil((zone.bounds.x + zone.bounds.width) * resolution);
      const endY = Math.ceil((zone.bounds.y + zone.bounds.height) * resolution);

      for (let y = startY; y < endY && y < grid.length; y++) {
        for (let x = startX; x < endX && x < grid[0].length; x++) {
          if (y >= 0 && x >= 0 && grid[y][x] === 0) {
            // Mark zones with special values (negative = traversable zones)
            switch (zone.type) {
              case 'RESTRICTED_AREA':
                grid[y][x] = 0.9; // Almost blocked
                break;
              case 'CHARGING_STATION':
                grid[y][x] = -0.1; // Prefer paths through charging
                break;
              default:
                grid[y][x] = 0.0; // Normal traversable
            }
          }
        }
      }
    }
  }
}

// ============================================
// A* PATHFINDER
// ============================================

export class AStarPathfinder {
  private grid: number[][];
  private resolution: number;

  constructor(grid: number[][], resolution: number = 1) {
    this.grid = grid;
    this.resolution = resolution;
  }

  /**
   * Find path from start to goal using A* algorithm
   * Returns array of waypoints in world coordinates
   */
  findPath(start: Pose2D, goal: Pose2D): Pose2D[] {
    // Convert world coords to grid coords
    const startGrid = this.worldToGrid(start);
    const goalGrid = this.worldToGrid(goal);

    // Validate start and goal
    if (!this.isValidCell(startGrid.x, startGrid.y)) {
      console.warn('Invalid start position');
      return [start, goal]; // Direct path as fallback
    }
    if (!this.isValidCell(goalGrid.x, goalGrid.y)) {
      console.warn('Invalid goal position');
      return [start, goal];
    }

    // A* algorithm
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: startGrid.x,
      y: startGrid.y,
      g: 0,
      h: this.heuristic(startGrid, goalGrid),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    let iterations = 0;
    const maxIterations = 10000;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if we reached goal
      if (current.x === goalGrid.x && current.y === goalGrid.y) {
        return this.reconstructPath(current, start, goal);
      }

      closedSet.add(`${current.x},${current.y}`);

      // Check neighbors (8-directional)
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        
        if (closedSet.has(key)) continue;
        if (!this.isWalkable(neighbor.x, neighbor.y)) continue;

        const tentativeG = current.g + this.moveCost(current, neighbor);

        const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (!existingNode) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, goalGrid);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openSet.push(neighbor);
        } else if (tentativeG < existingNode.g) {
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // No path found - return direct path
    console.warn('No path found, returning direct route');
    return [start, goal];
  }

  private worldToGrid(pose: Pose2D): { x: number; y: number } {
    return {
      x: Math.floor(pose.x / this.resolution),
      y: Math.floor(pose.y / this.resolution),
    };
  }

  private gridToWorld(gridX: number, gridY: number): Pose2D {
    return {
      x: (gridX + 0.5) * this.resolution,
      y: (gridY + 0.5) * this.resolution,
      theta: 0,
    };
  }

  private isValidCell(x: number, y: number): boolean {
    return y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length;
  }

  private isWalkable(x: number, y: number): boolean {
    if (!this.isValidCell(x, y)) return false;
    return this.grid[y][x] < 0.5; // Less than 50% occupied
  }

  private heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
    // Euclidean distance
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  private moveCost(from: PathNode, to: { x: number; y: number }): number {
    // Diagonal moves cost more
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const baseCost = dx + dy > 1 ? 1.414 : 1.0;
    
    // Add cost for cells that are partially occupied
    const cellCost = this.grid[to.y][to.x];
    return baseCost * (1 + cellCost);
  }

  private getNeighbors(node: PathNode): PathNode[] {
    const dirs = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1],
    ];

    return dirs.map(([dx, dy]) => ({
      x: node.x + dx,
      y: node.y + dy,
      g: 0,
      h: 0,
      f: 0,
      parent: null,
    }));
  }

  private reconstructPath(endNode: PathNode, start: Pose2D, goal: Pose2D): Pose2D[] {
    const gridPath: PathNode[] = [];
    let current: PathNode | null = endNode;

    while (current) {
      gridPath.unshift(current);
      current = current.parent;
    }

    // Convert to world coordinates and simplify
    const worldPath: Pose2D[] = [start];
    
    for (let i = 1; i < gridPath.length - 1; i++) {
      const prev = gridPath[i - 1];
      const curr = gridPath[i];
      const next = gridPath[i + 1];

      // Only add waypoint if direction changes
      const dir1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const dir2 = { x: next.x - curr.x, y: next.y - curr.y };

      if (dir1.x !== dir2.x || dir1.y !== dir2.y) {
        worldPath.push(this.gridToWorld(curr.x, curr.y));
      }
    }

    // Calculate final orientation towards goal
    const lastWaypoint = worldPath[worldPath.length - 1];
    goal.theta = Math.atan2(goal.y - lastWaypoint.y, goal.x - lastWaypoint.x);
    worldPath.push(goal);

    return worldPath;
  }
}

// ============================================
// NAVIGATION SERVICE IMPLEMENTATION
// ============================================

export class NavigationService implements INavigationService {
  private map: ProcessedMap | null = null;
  private pathfinder: AStarPathfinder | null = null;
  private currentPath: Pose2D[] = [];
  private currentWaypointIndex: number = 0;
  private zones: Zone[] = [];
  private currentPose: Pose2D = { x: 0, y: 0, theta: 0 };
  private obstacles: Array<{ pose: Pose2D; radius: number }> = [];

  // ============================================
  // INavigationService INTERFACE IMPLEMENTATION
  // ============================================

  setMap(map: OccupancyGrid): void {
    this.setOccupancyGrid(map);
  }

  getMap(): OccupancyGrid | null {
    return this.getOccupancyGrid();
  }

  isPathClear(path: Pose2D[]): boolean {
    if (!this.map) return true;
    for (const point of path) {
      if (this.checkCollision(point, 0.3)) {
        return false;
      }
    }
    return true;
  }

  setInitialPose(pose: Pose2D): void {
    this.currentPose = { ...pose };
  }

  getCurrentPose(): Pose2D {
    return { ...this.currentPose };
  }

  getCostmap(): OccupancyGrid {
    return this.getOccupancyGrid() || {
      width: 100,
      height: 100,
      resolution: 0.05,
      origin: { x: 0, y: 0, theta: 0 },
      data: new Array(10000).fill(0),
    };
  }

  addObstacle(pose: Pose2D, radius: number): void {
    this.obstacles.push({ pose, radius });
    // Update map grid with obstacle
    if (this.map) {
      const gridX = Math.floor(pose.x / this.map.resolution);
      const gridY = Math.floor(pose.y / this.map.resolution);
      const gridRadius = Math.ceil(radius / this.map.resolution);
      
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
          const x = gridX + dx;
          const y = gridY + dy;
          if (y >= 0 && y < this.map.grid.length && x >= 0 && x < this.map.grid[0].length) {
            this.map.grid[y][x] = 1.0;
          }
        }
      }
      this.pathfinder = new AStarPathfinder(this.map.grid, this.map.resolution);
    }
  }

  removeObstacle(pose: Pose2D): void {
    const index = this.obstacles.findIndex(
      o => Math.abs(o.pose.x - pose.x) < 0.1 && Math.abs(o.pose.y - pose.y) < 0.1
    );
    if (index >= 0) {
      this.obstacles.splice(index, 1);
    }
  }

  // ============================================
  // MAP MANAGEMENT
  // ============================================

  async loadMap(imageUrl: string, resolution: number = 0.05): Promise<void> {
    this.map = await MapProcessor.processImageToGrid(imageUrl, resolution);
    this.pathfinder = new AStarPathfinder(this.map.grid, this.map.resolution);
    console.log(`Map loaded: ${this.map.width}x${this.map.height}, resolution=${resolution}m/px`);
  }

  setOccupancyGrid(grid: OccupancyGrid): void {
    this.map = {
      grid: this.occupancyToNumber(grid),
      resolution: grid.resolution,
      width: grid.width,
      height: grid.height,
      origin: { x: grid.origin.x, y: grid.origin.y },
    };
    this.pathfinder = new AStarPathfinder(this.map.grid, this.map.resolution);
  }

  setZones(zones: Zone[]): void {
    this.zones = zones;
    if (this.map) {
      MapProcessor.addZonesToGrid(this.map.grid, zones, this.map.resolution);
      this.pathfinder = new AStarPathfinder(this.map.grid, this.map.resolution);
    }
  }

  getOccupancyGrid(): OccupancyGrid | null {
    if (!this.map) return null;

    const data = this.map.grid.flat().map(v => Math.round(v * 100));
    
    return {
      resolution: this.map.resolution,
      width: this.map.grid[0].length,
      height: this.map.grid.length,
      origin: { x: this.map.origin.x, y: this.map.origin.y, theta: 0 },
      data,
    };
  }

  // ============================================
  // PATH PLANNING
  // ============================================

  async planPath(start: Pose2D, goal: Pose2D): Promise<Pose2D[]> {
    if (!this.pathfinder) {
      // No map loaded, return direct path
      console.warn('No map loaded, using direct path');
      return [start, goal];
    }

    this.currentPath = this.pathfinder.findPath(start, goal);
    this.currentWaypointIndex = 0;
    return this.currentPath;
  }

  getCurrentPath(): Pose2D[] {
    return this.currentPath;
  }

  getNextWaypoint(): Pose2D | null {
    if (this.currentWaypointIndex >= this.currentPath.length) {
      return null;
    }
    return this.currentPath[this.currentWaypointIndex];
  }

  advanceWaypoint(): void {
    this.currentWaypointIndex++;
  }

  isPathComplete(): boolean {
    return this.currentWaypointIndex >= this.currentPath.length;
  }

  // ============================================
  // COLLISION & OBSTACLE DETECTION
  // ============================================

  checkCollision(pose: Pose2D, radius: number = 0.3): boolean {
    if (!this.map) return false;

    const gridX = Math.floor(pose.x / this.map.resolution);
    const gridY = Math.floor(pose.y / this.map.resolution);
    const gridRadius = Math.ceil(radius / this.map.resolution);

    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const x = gridX + dx;
        const y = gridY + dy;

        if (y >= 0 && y < this.map.grid.length && x >= 0 && x < this.map.grid[0].length) {
          if (this.map.grid[y][x] >= 0.5) {
            return true; // Collision
          }
        }
      }
    }

    return false;
  }

  updateFromLidar(pose: Pose2D, scan: LaserScan): void {
    if (!this.map) return;

    // Update occupancy grid from LIDAR data
    // This simulates SLAM-like behavior
    
    for (let i = 0; i < scan.ranges.length; i++) {
      const range = scan.ranges[i];
      if (range < scan.rangeMin || range > scan.rangeMax) continue;

      const angle = scan.angleMin + i * scan.angleIncrement + pose.theta;
      const hitX = pose.x + range * Math.cos(angle);
      const hitY = pose.y + range * Math.sin(angle);

      const gridX = Math.floor(hitX / this.map.resolution);
      const gridY = Math.floor(hitY / this.map.resolution);

      if (gridY >= 0 && gridY < this.map.grid.length && 
          gridX >= 0 && gridX < this.map.grid[0].length) {
        // Mark as obstacle (with some decay towards certainty)
        this.map.grid[gridY][gridX] = Math.min(1.0, this.map.grid[gridY][gridX] + 0.1);
      }
    }
  }

  // ============================================
  // VELOCITY COMPUTATION
  // ============================================

  computeVelocity(
    currentPose: Pose2D,
    targetWaypoint: Pose2D,
    maxLinear: number = 0.5,
    maxAngular: number = 1.0
  ): Twist {
    const dx = targetWaypoint.x - currentPose.x;
    const dy = targetWaypoint.y - currentPose.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);

    // Angle difference (normalized to -π to π)
    let angleDiff = targetAngle - currentPose.theta;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // If we need to turn a lot, prioritize rotation
    if (Math.abs(angleDiff) > 0.5) {
      return {
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxAngular) },
      };
    }

    // Move towards waypoint with slight correction
    const linearSpeed = Math.min(distance, maxLinear);
    const angularSpeed = angleDiff * 0.5; // Proportional control

    return {
      linear: { x: linearSpeed, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: Math.max(-maxAngular, Math.min(maxAngular, angularSpeed)) },
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private occupancyToNumber(grid: OccupancyGrid): number[][] {
    const result: number[][] = [];
    const width = grid.width;
    const height = grid.height;

    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const value = grid.data[idx];
        // Convert from 0-100 or -1 to 0-1
        row.push(value < 0 ? 0.5 : value / 100);
      }
      result.push(row);
    }

    return result;
  }
}

// Export singleton
export const navigationService = new NavigationService();
