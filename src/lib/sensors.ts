// Sensor Simulation for Robots

export interface CameraData {
  width: number;
  height: number;
  imageData: ImageData | null;
  detectedObjects: DetectedObject[];
}

export interface LidarData {
  robotId: string;
  timestamp: number;
  points: LidarPoint[];
  maxRange: number;
  numRays: number;
}

export interface LidarPoint {
  angle: number;      // in radians
  distance: number;   // in meters
  x: number;          // world coordinates
  y: number;
  intensity?: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SensorReading {
  robotId: string;
  timestamp: number;
  camera?: CameraData;
  lidar?: LidarData;
  ultrasonic?: {
    front: number;
    back: number;
    left: number;
    right: number;
  };
}

/**
 * Sensor Simulator - Generates simulated sensor data for robots
 */
export class SensorSimulator {
  private obstacleMap: Set<string>;
  private gridSize: number = 0.5; // meters per grid cell

  constructor(obstacles: Array<{x, y, width, height}> = []) {
    this.obstacleMap = new Set();
    obstacles.forEach(obs => {
      // Mark obstacle grid cells
      const startX = Math.floor(obs.x / this.gridSize);
      const startY = Math.floor(obs.y / this.gridSize);
      const endX = Math.floor((obs.x + obs.width) / this.gridSize);
      const endY = Math.floor((obs.y + obs.height) / this.gridSize);
      
      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          this.obstacleMap.add(`${x},${y}`);
        }
      }
    });
  }

  /**
   * Generate simulated camera feed for robot
   */
  generateCameraData(robotX: number, robotY: number, obstacles: any[]): CameraData {
    const width = 320;
    const height = 240;
    
    // Simulate detected objects based on obstacles nearby
    const detectedObjects: DetectedObject[] = obstacles
      .filter(obs => {
        const dx = (obs.x + obs.width / 2) - robotX;
        const dy = (obs.y + obs.height / 2) - robotY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 10; // Only detect obstacles within 10m
      })
      .map((obs, idx) => ({
        id: `obj-${idx}`,
        label: obs.type || 'obstacle',
        confidence: 0.85 + Math.random() * 0.1,
        bbox: {
          x: 50 + Math.random() * 100,
          y: 50 + Math.random() * 80,
          width: 30 + Math.random() * 50,
          height: 30 + Math.random() * 50,
        },
      }));

    return {
      width,
      height,
      imageData: null, // Would need canvas to generate actual image
      detectedObjects,
    };
  }

  /**
   * Generate LiDAR scan data
   */
  generateLidarScan(
    robotX: number,
    robotY: number,
    maxRange: number = 10,
    numRays: number = 360
  ): LidarData {
    const points: LidarPoint[] = [];
    
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      const distance = this.castRay(robotX, robotY, angle, maxRange);
      
      points.push({
        angle,
        distance,
        x: robotX + Math.cos(angle) * distance,
        y: robotY + Math.sin(angle) * distance,
        intensity: Math.max(0, 1 - distance / maxRange),
      });
    }

    return {
      robotId: 'unknown',
      timestamp: Date.now(),
      points,
      maxRange,
      numRays,
    };
  }

  /**
   * Cast a ray and detect obstacles
   */
  private castRay(robotX: number, robotY: number, angle: number, maxRange: number): number {
    const stepSize = 0.1; // meters
    const dx = Math.cos(angle) * stepSize;
    const dy = Math.sin(angle) * stepSize;
    
    for (let distance = 0; distance <= maxRange; distance += stepSize) {
      const x = robotX + dx * (distance / stepSize);
      const y = robotY + dy * (distance / stepSize);
      
      const gridX = Math.floor(x / this.gridSize);
      const gridY = Math.floor(y / this.gridSize);
      
      // Check if hit obstacle
      if (this.obstacleMap.has(`${gridX},${gridY}`)) {
        return distance;
      }
    }
    
    return maxRange; // No obstacle detected
  }

  /**
   * Generate ultrasonic sensor readings
   */
  generateUltrasonicReadings(
    robotX: number,
    robotY: number,
    obstacles: any[]
  ): {
    front: number;
    back: number;
    left: number;
    right: number;
  } {
    const directions = [
      { name: 'front', angle: 0 },
      { name: 'back', angle: Math.PI },
      { name: 'left', angle: -Math.PI / 2 },
      { name: 'right', angle: Math.PI / 2 },
    ];

    const readings: any = {};

    directions.forEach(dir => {
      let minDistance = 5; // max range 5m
      
      obstacles.forEach(obs => {
        const obsX = obs.x + obs.width / 2;
        const obsY = obs.y + obs.height / 2;
        
        // Check if obstacle is in this direction
        const dx = obsX - robotX;
        const dy = obsY - robotY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const angleToObs = Math.atan2(dy, dx);
        const angleDiff = Math.abs(angleToObs - dir.angle);
        
        // If obstacle is within 45 degrees of direction
        if (angleDiff < Math.PI / 4) {
          if (distance < minDistance) {
            minDistance = distance;
          }
        }
      });

      readings[dir.name] = minDistance;
    });

    return readings;
  }

  /**
   * Generate all sensor readings for a robot
   */
  generateAllSensors(
    robotId: string,
    robotX: number,
    robotY: number,
    obstacles: any[]
  ): SensorReading {
    return {
      robotId,
      timestamp: Date.now(),
      camera: this.generateCameraData(robotX, robotY, obstacles),
      lidar: this.generateLidarScan(robotX, robotY),
      ultrasonic: this.generateUltrasonicReadings(robotX, robotY, obstacles),
    };
  }
}
