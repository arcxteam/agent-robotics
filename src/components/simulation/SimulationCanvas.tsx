'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bot,
  MapPin,
  Battery,
  Activity,
  Eye,
  Radar,
  Navigation,
} from 'lucide-react';
import { SensorSimulator, LidarData, CameraData } from '@/lib/sensors';

interface Robot {
  id: string;
  x: number;
  y: number;
  rotation: number;
  status: 'idle' | 'moving' | 'picking' | 'charging';
  battery: number;
  task?: string;
  path?: Array<{x: number; y: number}>;
}

interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'RACK' | 'WALL' | 'PILLAR';
}

interface SimulationCanvasProps {
  width?: number;
  height?: number;
}

export default function SimulationCanvas({ width = 800, height = 600 }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sensorOverlayRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showSensors, setShowSensors] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  
  const [robots, setRobots] = useState<Robot[]>([
    { 
      id: 'Robot-01', 
      x: 100, 
      y: 100, 
      rotation: 0, 
      status: 'moving', 
      battery: 85, 
      task: 'Task #123',
      path: [{x: 100, y: 100}, {x: 200, y: 100}, {x: 250, y: 200}, {x: 450, y: 350}],
    },
    { 
      id: 'Robot-02', 
      x: 200, 
      y: 150, 
      rotation: 45, 
      status: 'idle', 
      battery: 92, 
      task: undefined,
      path: [{x: 200, y: 150}, {x: 300, y: 250}, {x: 400, y: 200}],
    },
    { 
      id: 'Robot-03', 
      x: 300, 
      y: 100, 
      rotation: 90, 
      status: 'charging', 
      battery: 45, 
      task: undefined,
      path: [],
    },
    { 
      id: 'Robot-04', 
      x: 400, 
      y: 200, 
      rotation: 180, 
      status: 'picking', 
      battery: 78, 
      task: 'Task #125',
      path: [{x: 400, y: 200}, {x: 450, y: 200}],
    },
    { 
      id: 'Robot-05', 
      x: 500, 
      y: 150, 
      rotation: 270, 
      status: 'moving', 
      battery: 67, 
      task: 'Task #124',
      path: [{x: 500, y: 150}, {x: 550, y: 350}, {x: 600, y: 300}],
    },
  ]);

  const [obstacles] = useState<Obstacle[]>([
    { id: 'obs1', x: 150, y: 300, width: 60, height: 80, type: 'RACK' },
    { id: 'obs2', x: 250, y: 300, width: 60, height: 80, type: 'RACK' },
    { id: 'obs3', x: 350, y: 300, width: 60, height: 80, type: 'RACK' },
    { id: 'obs4', x: 450, y: 300, width: 60, height: 80, type: 'RACK' },
    { id: 'obs5', x: 550, y: 300, width: 60, height: 80, type: 'RACK' },
  ]);

  const [sensorData, setSensorData] = useState<Map<string, any>>(new Map());

  // Initialize sensor simulator
  const sensorSimulatorRef = useRef<SensorSimulator | null>(null);
  
  useEffect(() => {
    sensorSimulatorRef.current = new SensorSimulator(obstacles);
    
    // Generate initial sensor data for all robots
    const initialSensorData = new Map();
    robots.forEach(robot => {
      const lidarData = sensorSimulatorRef.current?.generateLidarScan(robot.x, robot.y);
      initialSensorData.set(robot.id, lidarData);
    });
    setSensorData(initialSensorData);
  }, [robots]);

  // Main render
  useEffect(() => {
    const canvas = canvasRef.current;
    const sensorCanvas = sensorOverlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(zoom, zoom);

    // Draw grid
    const gridSize = 20;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw obstacles
    obstacles.forEach((obstacle) => {
      ctx.save();

      // Create gradient for obstacles
      const gradient = ctx.createLinearGradient(
        obstacle.x,
        obstacle.y,
        obstacle.x + obstacle.width,
        obstacle.y + obstacle.height
      );

      if (obstacle.type === 'RACK') {
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');
      } else {
        gradient.addColorStop(0, 'rgba(100, 116, 139, 0.5)');
        gradient.addColorStop(1, 'rgba(71, 85, 105, 0.5)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      ctx.strokeStyle = obstacle.type === 'RACK' ? '#6366f1' : '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Add label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        obstacle.type,
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2
      );

      ctx.restore();
    });

    // Draw robot paths
    if (showPaths) {
      robots.forEach(robot => {
        if (robot.path && robot.path.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);

          ctx.moveTo(robot.path[0].x, robot.path[0].y);
          for (let i = 1; i < robot.path.length; i++) {
            ctx.lineTo(robot.path[i].x, robot.path[i].y);
          }

          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // Draw robots
    robots.forEach((robot) => {
      ctx.save();
      ctx.translate(robot.x, robot.y);
      ctx.rotate((robot.rotation * Math.PI) / 180);

      // Robot body (circle)
      const robotRadius = 20;

      // Outer glow
      const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, robotRadius + 10);

      let glowColor1, glowColor2;
      switch (robot.status) {
        case 'moving':
          glowColor1 = 'rgba(6, 182, 212, 0.4)';
          glowColor2 = 'rgba(6, 182, 212, 0)';
          break;
        case 'picking':
          glowColor1 = 'rgba(99, 102, 241, 0.4)';
          glowColor2 = 'rgba(99, 102, 241, 0)';
          break;
        case 'charging':
          glowColor1 = 'rgba(34, 197, 94, 0.4)';
          glowColor2 = 'rgba(34, 197, 94, 0)';
          break;
        default:
          glowColor1 = 'rgba(100, 116, 139, 0.3)';
          glowColor2 = 'rgba(100, 116, 139, 0)';
      }

      glowGradient.addColorStop(0, glowColor1);
      glowGradient.addColorStop(1, glowColor2);
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, 0, robotRadius + 10, 0, Math.PI * 2);
      ctx.fill();

      // Robot body
      const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, robotRadius);
      bodyGradient.addColorStop(0, '#6366f1');
      bodyGradient.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.arc(0, 0, robotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Robot direction indicator
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(robotRadius - 5, 0);
      ctx.lineTo(robotRadius + 5, 0);
      ctx.lineTo(robotRadius - 2, -3);
      ctx.moveTo(robotRadius - 2, 3);
      ctx.lineTo(robotRadius + 5, 0);
      ctx.lineTo(robotRadius - 2, -3);
      ctx.fill();

      // Selection indicator
      if (selectedRobot === robot.id) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, robotRadius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Draw robot label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(robot.id, robot.x, robot.y - robotRadius - 8);

      // Draw battery indicator
      const batteryWidth = 30;
      const batteryHeight = 4;
      const batteryX = robot.x - batteryWidth / 2;
      const batteryY = robot.y + robotRadius + 8;

      ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.fillRect(batteryX, batteryY, batteryWidth, batteryHeight);

      const batteryGradient = ctx.createLinearGradient(batteryX, batteryY, batteryX + batteryWidth, batteryY);
      if (robot.battery > 50) {
        batteryGradient.addColorStop(0, '#22c55e');
        batteryGradient.addColorStop(1, '#16a34a');
      } else if (robot.battery > 20) {
        batteryGradient.addColorStop(0, '#f59e0b');
        batteryGradient.addColorStop(1, '#d97706');
      } else {
        batteryGradient.addColorStop(0, '#ef4444');
        batteryGradient.addColorStop(1, '#dc2626');
      }

      ctx.fillStyle = batteryGradient;
      ctx.fillRect(batteryX, batteryY, (batteryWidth * robot.battery) / 100, batteryHeight);
    });

    ctx.restore();

    // Draw sensor overlay
    if (sensorCanvas && showSensors) {
      const sensorCtx = sensorCanvas.getContext('2d');
      if (sensorCtx) {
        sensorCtx.clearRect(0, 0, sensorCanvas.width, sensorCanvas.height);
        sensorCtx.save();
        sensorCtx.scale(zoom, zoom);

        // Draw LiDAR scans for selected robot
        if (selectedRobot) {
          const lidarData = sensorData.get(selectedRobot) as LidarData;
          if (lidarData) {
            const robot = robots.find(r => r.id === selectedRobot);
            if (robot) {
              lidarData.points.forEach(point => {
                const px = robot.x + Math.cos(point.angle) * point.distance;
                const py = robot.y + Math.sin(point.angle) * point.distance;
                const intensity = point.intensity ?? 1;

                sensorCtx.beginPath();
                sensorCtx.strokeStyle = `rgba(6, 182, 212, ${0.3 + intensity * 0.7})`;
                sensorCtx.lineWidth = 1;
                sensorCtx.moveTo(robot.x, robot.y);
                sensorCtx.lineTo(px, py);
                sensorCtx.stroke();

                // Draw point
                sensorCtx.fillStyle = `rgba(6, 182, 212, ${intensity})`;
                sensorCtx.beginPath();
                sensorCtx.arc(px, py, 2, 0, Math.PI * 2);
                sensorCtx.fill();
              });
            }
          }
        }

        sensorCtx.restore();
      }
    }
  }, [robots, obstacles, zoom, selectedRobot, showSensors, showPaths, sensorData, width, height]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    // Check if clicked on a robot
    const clickedRobot = robots.find(
      (robot) => Math.hypot(robot.x - x, robot.y - y) < 30
    );

    setSelectedRobot(clickedRobot?.id || null);
    
    // Update sensor data for selected robot
    if (clickedRobot && sensorSimulatorRef.current) {
      const lidarData = sensorSimulatorRef.current.generateLidarScan(clickedRobot.x, clickedRobot.y);
      setSensorData(prev => new Map(prev).set(clickedRobot.id, lidarData));
    }
  };

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const resetSimulation = () => {
    setIsRunning(false);
    // Reset robots to initial positions
    setRobots([
      { id: 'Robot-01', x: 100, y: 100, rotation: 0, status: 'moving', battery: 85, task: 'Task #123', path: [{x: 100, y: 100}, {x: 200, y: 100}, {x: 250, y: 200}, {x: 450, y: 350}] },
      { id: 'Robot-02', x: 200, y: 150, rotation: 45, status: 'idle', battery: 92, task: undefined, path: [{x: 200, y: 150}, {x: 300, y: 250}, {x: 400, y: 200}] },
      { id: 'Robot-03', x: 300, y: 100, rotation: 90, status: 'charging', battery: 45, task: undefined, path: [] },
      { id: 'Robot-04', x: 400, y: 200, rotation: 180, status: 'picking', battery: 78, task: 'Task #125', path: [{x: 400, y: 200}, {x: 450, y: 200}] },
      { id: 'Robot-05', x: 500, y: 150, rotation: 270, status: 'moving', battery: 67, task: 'Task #124', path: [{x: 500, y: 150}, {x: 550, y: 350}, {x: 600, y: 300}] },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={isRunning ? 'destructive' : 'default'}
            size="sm"
            onClick={toggleSimulation}
            className={isRunning ? '' : 'btn-gradient-primary'}
          >
            {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button variant="outline" size="sm" onClick={resetSimulation}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={showSensors ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowSensors(!showSensors)}
              className={showSensors ? 'btn-gradient-primary' : ''}
            >
              <Radar className="w-4 h-4 mr-2" />
              Sensors
            </Button>
            <Button
              variant={showPaths ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPaths(!showPaths)}
              className={showPaths ? 'btn-gradient-primary' : ''}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Paths
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="icon" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="simulation-canvas">
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onClick={handleCanvasClick}
                className="cursor-pointer"
              />
              
              {/* Sensor Overlay Canvas */}
              {showSensors && (
                <canvas
                  ref={sensorOverlayRef}
                  width={width}
                  height={height}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ opacity: 0.8 }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm p-3 rounded-lg border border-border/30">
          <div className="text-sm font-semibold text-foreground mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
              <span className="text-foreground">Moving</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
              <span className="text-foreground">Picking</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
              <span className="text-foreground">Charging</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-foreground">Idle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Robot Info */}
      {selectedRobot && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{selectedRobot}</h3>
                    <p className="text-sm text-foreground/70">
                      {robots.find((r) => r.id === selectedRobot)?.task || 'No active task'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Battery className="w-4 h-4 text-foreground/70" />
                    <span className="font-medium text-foreground">
                      {robots.find((r) => r.id === selectedRobot)?.battery}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-foreground/70" />
                    <span className="font-medium text-foreground">
                      {robots.find((r) => r.id === selectedRobot)?.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-foreground/70" />
                    <span className="font-medium text-foreground">
                      X: {Math.round(robots.find((r) => r.id === selectedRobot)?.x || 0)}, Y: {' '}
                      {Math.round(robots.find((r) => r.id === selectedRobot)?.y || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sensor Status */}
              {showSensors && sensorData.has(selectedRobot) && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center space-x-2 text-sm">
                    <Radar className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">LiDAR Active</span>
                    <span className="text-foreground/60">
                      {(sensorData.get(selectedRobot) as LidarData)?.points.length || 0} rays
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm mt-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">Camera Active</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
