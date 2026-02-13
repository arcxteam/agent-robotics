'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bot,
  MapPin,
  Battery,
  Activity,
  Radar,
  Navigation,
  Package,
  Target,
  Zap,
  AlertTriangle,
  Layers,
  Tag,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '@/lib/websocket-url';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================
// TYPES (matching server types)
// ============================================

interface Vector2D {
  x: number;
  y: number;
}

interface Pose {
  x: number;
  y: number;
  rotation: number;
}

interface GripperState {
  isOpen: boolean;
  heldObject: string | null;
  gripForce: number;
}

interface ArmState {
  joints: number[];
  endEffectorPose: Vector2D;
  isMoving: boolean;
  targetPose: Vector2D | null;
}

type RobotStatus = 'IDLE' | 'MOVING' | 'PICKING' | 'PLACING' | 'CARRYING' | 'CHARGING' | 'ERROR';

interface Robot {
  id: string;
  name: string;
  type: 'MOBILE_MANIPULATOR' | 'AMR_TRANSPORT' | 'FORKLIFT';
  pose: Pose;
  targetPose: Pose | null;
  speed: number;
  maxSpeed: number;
  angularSpeed: number;
  battery: number;
  maxBattery: number;
  batteryDrainRate: number;
  arm: ArmState | null;
  gripper: GripperState | null;
  status: RobotStatus;
  currentTaskId: string | null;
  path: Vector2D[];
  pathIndex: number;
  tasksCompleted: number;
  distanceTraveled: number;
  pickSuccessRate: number;
  lidarPoints: Vector2D[];
  cameraView: string | null;
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
  | 'CEMENT_BAG'        // Karung semen
  | 'SAND_BAG'          // Karung pasir
  | 'CARDBOARD_BOX'     // Kardus material
  | 'BRICK_PALLET'      // Palet bata
  | 'GRAVEL_BAG'        // Karung kerikil
  | 'TILE_STACK'        // Tumpukan keramik
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
  weight: number;
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
  objects: string[];
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
  target: Vector2D | string;
  completed: boolean;
  startTime: number | null;
  endTime: number | null;
}

interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedRobotId: string | null;
  objectId: string | null;
  sourceZone: string | null;
  targetZone: string | null;
  steps: TaskStep[];
  currentStep: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  estimatedDuration: number;
  aiScore: number;
  aiReasoning: string;
}

interface SimulationState {
  id: string;
  name: string;
  status: 'STOPPED' | 'RUNNING' | 'PAUSED';
  environmentType: string;
  dimensions: { width: number; height: number };
  robots: Robot[];
  objects: ConstructionObject[];
  zones: Zone[];
  obstacles: Obstacle[];
  tasks: Task[];
  tick: number;
  timeMultiplier: number;
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
// COLORS & CONSTANTS
// ============================================

const STATUS_COLORS: Record<RobotStatus, string> = {
  IDLE: '#6b7280',
  MOVING: '#3b82f6',
  PICKING: '#f59e0b',
  PLACING: '#8b5cf6',
  CARRYING: '#22c55e',
  CHARGING: '#06b6d4',
  ERROR: '#ef4444'
};

const ZONE_COLORS: Record<ZoneType, string> = {
  MATERIAL_STORAGE: 'rgba(99, 102, 241, 0.3)',
  ASSEMBLY_AREA: 'rgba(34, 197, 94, 0.3)',
  STAGING_ZONE: 'rgba(245, 158, 11, 0.3)',
  CHARGING_STATION: 'rgba(6, 182, 212, 0.3)',
  WORK_ZONE: 'rgba(139, 92, 246, 0.3)',
  RESTRICTED_AREA: 'rgba(239, 68, 68, 0.3)',
  INSPECTION_POINT: 'rgba(236, 72, 153, 0.3)',
  ROBOT_HOME: 'rgba(16, 185, 129, 0.3)',
};

// Material types available for Add Material feature
const MATERIAL_TYPES: Array<{ type: ObjectType; label: string; color: string }> = [
  { type: 'STEEL_BEAM', label: 'Steel Beam', color: '#64748b' },
  { type: 'CONCRETE_BLOCK', label: 'Concrete Block', color: '#78716c' },
  { type: 'PIPE_SECTION', label: 'Pipe Section', color: '#0ea5e9' },
  { type: 'ELECTRICAL_PANEL', label: 'Electrical Panel', color: '#eab308' },
  { type: 'HVAC_UNIT', label: 'HVAC Unit', color: '#22c55e' },
  { type: 'TOOL_BOX', label: 'Tool Box', color: '#ef4444' },
  { type: 'SAFETY_EQUIPMENT', label: 'Safety Equipment', color: '#f97316' },
  { type: 'SCAFFOLDING_PART', label: 'Scaffolding Part', color: '#a855f7' },
  { type: 'CEMENT_BAG', label: 'Cement Bag', color: '#94a3b8' },
  { type: 'SAND_BAG', label: 'Sand Bag', color: '#d4a574' },
  { type: 'CARDBOARD_BOX', label: 'Cardboard Box', color: '#c9a66b' },
  { type: 'BRICK_PALLET', label: 'Brick Pallet', color: '#b45309' },
  { type: 'GRAVEL_BAG', label: 'Gravel Bag', color: '#6b7280' },
  { type: 'TILE_STACK', label: 'Tile Stack', color: '#f5f5f4' },
  { type: 'WOOD_PLANK', label: 'Wood Plank', color: '#a16207' },
  { type: 'REBAR_BUNDLE', label: 'Rebar Bundle', color: '#44403c' },
  { type: 'MIXED_MATERIAL', label: 'Mixed Material', color: '#71717a' },
];

// ============================================
// OBJECT SHAPE DRAWING FUNCTIONS
// ============================================

// Draw realistic material shapes based on type
function drawObjectShape(
  ctx: CanvasRenderingContext2D, 
  type: ObjectType, 
  width: number, 
  height: number, 
  color: string
) {
  const halfW = width / 2;
  const halfH = height / 2;
  
  switch (type) {
    case 'CEMENT_BAG':
    case 'SAND_BAG':
    case 'GRAVEL_BAG':
      // Bag shape - rounded rectangle with bulge
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-halfW + 5, -halfH);
      ctx.lineTo(halfW - 5, -halfH);
      ctx.quadraticCurveTo(halfW, -halfH, halfW, -halfH + 5);
      ctx.lineTo(halfW + 3, halfH - 5); // slight bulge
      ctx.quadraticCurveTo(halfW + 3, halfH, halfW - 5, halfH);
      ctx.lineTo(-halfW + 5, halfH);
      ctx.quadraticCurveTo(-halfW - 3, halfH, -halfW - 3, halfH - 5);
      ctx.lineTo(-halfW, -halfH + 5);
      ctx.quadraticCurveTo(-halfW, -halfH, -halfW + 5, -halfH);
      ctx.closePath();
      ctx.fill();
      // Stitching lines
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-halfW + 8, -halfH + 3);
      ctx.lineTo(halfW - 8, -halfH + 3);
      ctx.stroke();
      break;
      
    case 'STEEL_BEAM':
    case 'SCAFFOLDING_PART':
      // I-beam shape
      ctx.fillStyle = color;
      ctx.fillRect(-halfW, -halfH, width, height * 0.25);
      ctx.fillRect(-halfW, halfH - height * 0.25, width, height * 0.25);
      ctx.fillRect(-width * 0.15, -halfH, width * 0.3, height);
      // Metallic highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-halfW, -halfH, width, height * 0.08);
      break;
      
    case 'PIPE_SECTION':
      // Cylinder/pipe shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW, halfH * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner pipe hole
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW * 0.5, halfH * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'WOOD_PLANK':
      // Plank with wood grain
      ctx.fillStyle = color;
      ctx.fillRect(-halfW, -halfH, width, height);
      // Wood grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-halfW, -halfH + (height / 4) * i + height / 8);
        ctx.lineTo(halfW, -halfH + (height / 4) * i + height / 8 + 2);
        ctx.stroke();
      }
      break;
      
    case 'BRICK_PALLET':
      // Stacked bricks on pallet
      ctx.fillStyle = '#8B4513'; // pallet wood
      ctx.fillRect(-halfW, halfH - 5, width, 5);
      ctx.fillStyle = color;
      const brickH = (height - 8) / 3;
      for (let row = 0; row < 3; row++) {
        const offset = row % 2 === 0 ? 0 : width / 6;
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(
            -halfW + offset + col * (width / 3) + 1,
            -halfH + row * brickH + 1,
            width / 3 - 2,
            brickH - 2
          );
        }
      }
      break;
      
    case 'TILE_STACK':
      // Stacked tiles
      ctx.fillStyle = color;
      const tileH = height / 5;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 === 0 ? color : '#e5e5e5';
        ctx.fillRect(-halfW, -halfH + i * tileH, width, tileH - 1);
      }
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(-halfW + width * 0.8, -halfH, width * 0.2, height);
      break;
      
    case 'REBAR_BUNDLE':
      // Bundle of rebar rods
      ctx.fillStyle = color;
      const rodRadius = Math.min(width, height) / 8;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          ctx.beginPath();
          ctx.arc(
            -halfW + rodRadius + col * (width / 4),
            -halfH + rodRadius + row * (height / 2),
            rodRadius * 0.8,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      // Binding wire
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-halfW + 5, -halfH);
      ctx.lineTo(-halfW + 5, halfH);
      ctx.moveTo(halfW - 5, -halfH);
      ctx.lineTo(halfW - 5, halfH);
      ctx.stroke();
      break;
      
    case 'CARDBOARD_BOX':
      // Box with tape
      ctx.fillStyle = color;
      ctx.fillRect(-halfW, -halfH, width, height);
      // Box flaps (top)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-halfW, -halfH + height * 0.2);
      ctx.lineTo(halfW, -halfH + height * 0.2);
      ctx.stroke();
      // Tape
      ctx.fillStyle = '#d4a574';
      ctx.fillRect(-width * 0.1, -halfH, width * 0.2, height * 0.2);
      break;
      
    case 'MIXED_MATERIAL':
      // Mixed materials container
      ctx.fillStyle = color;
      ctx.fillRect(-halfW, -halfH, width, height);
      // Random colored items inside
      const colors = ['#94a3b8', '#d4a574', '#b45309', '#6b7280'];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(
          -halfW + 3 + (i % 3) * (width / 3),
          -halfH + 3 + Math.floor(i / 3) * (height / 2),
          width / 3 - 4,
          height / 2 - 4
        );
      }
      break;
      
    default:
      // Default box shape
      ctx.fillStyle = color;
      ctx.fillRect(-halfW, -halfH, width, height);
      break;
  }
}

const ROBOT_ICONS: Record<string, string> = {
  MOBILE_MANIPULATOR: '🤖',
  AMR_TRANSPORT: '🚚',
  FORKLIFT: '🏗️'
};

// ============================================
// MAIN COMPONENT
// ============================================

interface ExternalZone {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  capacity?: number;
  aiGenerated?: boolean;
  confidence?: number;
}

interface SimulationCanvasProps {
  width?: number;
  height?: number;
  backgroundMap?: string; // URL to uploaded map image
  externalZones?: ExternalZone[];
}

export default function ConstructionSimulation({ width = 1000, height = 800, backgroundMap, externalZones }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<SimulationState | null>(null);
  const zonesSyncedRef = useRef(false);
  
  // UI State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showLidar, setShowLidar] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showBackground, setShowBackground] = useState(true);
  const [showRobotLabels, setShowRobotLabels] = useState(true);
  const [showObjectLabels, setShowObjectLabels] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);;
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Task creation state
  const [taskObjectId, setTaskObjectId] = useState<string>('');
  const [taskTargetZone, setTaskTargetZone] = useState<string>('');
  const [taskRobotId, setTaskRobotId] = useState<string>('auto');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulkObjects, setSelectedBulkObjects] = useState<string[]>([]);

  // Add Material state
  const [addMaterialType, setAddMaterialType] = useState<string>('');
  const [addMaterialZone, setAddMaterialZone] = useState<string>('');

  // ============================================
  // ZONE SYNC: Send external zones to WebSocket server
  // ============================================

  useEffect(() => {
    if (socket && isConnected && externalZones && externalZones.length > 0) {
      // Reset sync flag — we're about to send new zones
      zonesSyncedRef.current = false;

      // Convert external zone bounds from percentage (0-100) to pixel coordinates
      const serverZones = externalZones.map(z => {
        const maxBound = Math.max(z.bounds.x, z.bounds.y, z.bounds.width, z.bounds.height);
        let pixelBounds: { x: number; y: number; width: number; height: number };

        if (maxBound <= 1) {
          // Normalized (0-1) → pixel
          pixelBounds = {
            x: z.bounds.x * width,
            y: z.bounds.y * height,
            width: Math.max(z.bounds.width * width, 50),
            height: Math.max(z.bounds.height * height, 50),
          };
        } else if (maxBound <= 100) {
          // Percentage (0-100) → pixel
          pixelBounds = {
            x: (z.bounds.x / 100) * width,
            y: (z.bounds.y / 100) * height,
            width: Math.max((z.bounds.width / 100) * width, 50),
            height: Math.max((z.bounds.height / 100) * height, 50),
          };
        } else {
          // Already pixel
          pixelBounds = z.bounds;
        }

        return {
          id: z.id,
          name: z.name,
          type: z.type,
          bounds: pixelBounds,
          color: z.color,
          capacity: z.capacity || 15,
        };
      });

      console.log(`📍 Syncing ${serverZones.length} zones to simulation server`);
      socket.emit('zones:update', { zones: serverZones });
    }
  }, [socket, isConnected, externalZones, width, height]);

  // ============================================
  // WEBSOCKET CONNECTION
  // ============================================

  useEffect(() => {
    // Auto-detect WebSocket URL (handles Codespaces, localhost, production)
    const wsUrl = getWebSocketUrl();

    console.log('🔌 Connecting to WebSocket:', wsUrl);
    console.log('🌐 Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server');

    const socketInstance = io(wsUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to simulation server');
    });

    socketInstance.on('connect_error', (error) => {
      // Only log warning, not error (to avoid console spam)
      console.warn('⚠️ Simulation server not running. Start with: npm run sim:server');
      setIsConnected(false);
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('🔌 Disconnected:', reason);
    });

    socketInstance.on('simulation:state', (data: SimulationState) => {
      setState(data);
    });

    socketInstance.on('simulation:started', () => {
      console.log('Simulation started');
    });

    socketInstance.on('simulation:paused', () => {
      console.log('Simulation paused');
    });

    socketInstance.on('simulation:stopped', () => {
      console.log('Simulation stopped');
    });

    socketInstance.on('task:created', (task: Task) => {
      console.log('Task created:', task.id);
    });

    socketInstance.on('ai:scheduled', (data: { tasksAssigned: number }) => {
      console.log(`AI scheduled ${data.tasksAssigned} tasks`);
    });

    socketInstance.on('error', (data: { message: string }) => {
      console.error('Server error:', data.message);
    });

    socketInstance.on('zones:updated', (data: { zonesCount: number; objectsCount: number }) => {
      zonesSyncedRef.current = true;
      console.log(`✅ Zones synced: ${data.zonesCount} zones, ${data.objectsCount} objects`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // ============================================
  // BACKGROUND MAP LOADING
  // ============================================
  
  useEffect(() => {
    if (backgroundMap) {
      const img = new Image();
      img.onload = () => {
        backgroundImageRef.current = img;
        console.log('✅ Background map loaded:', backgroundMap);
      };
      img.onerror = () => {
        console.error('❌ Failed to load background map');
        backgroundImageRef.current = null;
      };
      img.src = backgroundMap;
    } else {
      backgroundImageRef.current = null;
    }
  }, [backgroundMap]);

  // ============================================
  // CANVAS RENDERING
  // ============================================

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background map if available
    if (showBackground && backgroundImageRef.current) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(
        backgroundImageRef.current, 
        0, 0, 
        state.dimensions.width, 
        state.dimensions.height
      );
      ctx.globalAlpha = 1.0;
    }

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= state.dimensions.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.dimensions.height);
      ctx.stroke();
    }
    for (let y = 0; y <= state.dimensions.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.dimensions.width, y);
      ctx.stroke();
    }

    // Draw zones — prefer externalZones over server defaults until sync completes
    if (showZones) {
      // If we have externalZones and server hasn't confirmed sync yet, render externalZones
      // to prevent the flash of default hardcoded zones from createInitialState()
      const hasExternalZones = externalZones && externalZones.length > 0;
      const useExternalForRender = hasExternalZones && !zonesSyncedRef.current;

      const zonesToRender = useExternalForRender
        ? externalZones!.map(z => {
            // Convert bounds to pixel coordinates (same logic as zone sync)
            const maxBound = Math.max(z.bounds.x, z.bounds.y, z.bounds.width, z.bounds.height);
            let pixelBounds: typeof z.bounds;
            if (maxBound <= 1) {
              pixelBounds = { x: z.bounds.x * width, y: z.bounds.y * height, width: Math.max(z.bounds.width * width, 50), height: Math.max(z.bounds.height * height, 50) };
            } else if (maxBound <= 100) {
              pixelBounds = { x: (z.bounds.x / 100) * width, y: (z.bounds.y / 100) * height, width: Math.max((z.bounds.width / 100) * width, 50), height: Math.max((z.bounds.height / 100) * height, 50) };
            } else {
              pixelBounds = z.bounds;
            }
            return { ...z, bounds: pixelBounds, currentOccupancy: 0, capacity: z.capacity || 15 };
          })
        : state.zones;

      for (const zone of zonesToRender) {
        ctx.fillStyle = ZONE_COLORS[zone.type] || 'rgba(100, 100, 100, 0.2)';
        ctx.fillRect(zone.bounds.x, zone.bounds.y, zone.bounds.width, zone.bounds.height);
        
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(zone.bounds.x, zone.bounds.y, zone.bounds.width, zone.bounds.height);
        
        // Zone label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          zone.name, 
          zone.bounds.x + zone.bounds.width / 2, 
          zone.bounds.y + 15
        );
        ctx.fillText(
          `${zone.currentOccupancy}/${zone.capacity}`,
          zone.bounds.x + zone.bounds.width / 2,
          zone.bounds.y + zone.bounds.height - 8
        );
      }
    }

    // Draw obstacles
    for (const obstacle of state.obstacles) {
      ctx.fillStyle = obstacle.isTemporary ? '#4b5563' : '#374151';
      ctx.fillRect(
        obstacle.pose.x - obstacle.dimensions.width / 2,
        obstacle.pose.y - obstacle.dimensions.height / 2,
        obstacle.dimensions.width,
        obstacle.dimensions.height
      );
      
      // Obstacle border
      ctx.strokeStyle = obstacle.isTemporary ? '#f59e0b' : '#6b7280';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        obstacle.pose.x - obstacle.dimensions.width / 2,
        obstacle.pose.y - obstacle.dimensions.height / 2,
        obstacle.dimensions.width,
        obstacle.dimensions.height
      );
    }

    // Draw construction objects with realistic shapes
    for (const obj of state.objects) {
      if (obj.status === 'PICKED') continue; // Don't draw picked objects
      
      ctx.save();
      ctx.translate(obj.pose.x, obj.pose.y);
      ctx.rotate((obj.pose.rotation * Math.PI) / 180);
      
      // Draw realistic object shape based on type
      drawObjectShape(ctx, obj.type, obj.dimensions.width, obj.dimensions.height, obj.color);
      
      // Selection highlight
      if (selectedObject === obj.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          -obj.dimensions.width / 2 - 3,
          -obj.dimensions.height / 2 - 3,
          obj.dimensions.width + 6,
          obj.dimensions.height + 6
        );
        
        // Show object type label when selected
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          -obj.dimensions.width / 2,
          -obj.dimensions.height / 2 - 20,
          obj.dimensions.width,
          16
        );
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          obj.type.replace(/_/g, ' '),
          0,
          -obj.dimensions.height / 2 - 7
        );
      }
      
      ctx.restore();
    }

    // Draw robot paths
    if (showPaths) {
      for (const robot of state.robots) {
        if (robot.path.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = STATUS_COLORS[robot.status] || '#6b7280';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.moveTo(robot.pose.x, robot.pose.y);
          for (const point of robot.path.slice(robot.pathIndex)) {
            ctx.lineTo(point.x, point.y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw LiDAR points
    if (showLidar) {
      for (const robot of state.robots) {
        if (robot.lidarPoints.length > 0) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
          for (const point of robot.lidarPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // LiDAR rays
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
          ctx.lineWidth = 1;
          for (const point of robot.lidarPoints) {
            ctx.beginPath();
            ctx.moveTo(robot.pose.x, robot.pose.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw robots
    for (const robot of state.robots) {
      ctx.save();
      ctx.translate(robot.pose.x, robot.pose.y);
      ctx.rotate((robot.pose.rotation * Math.PI) / 180);
      
      // Robot body
      const size = robot.type === 'FORKLIFT' ? 40 : 30;
      ctx.fillStyle = STATUS_COLORS[robot.status];
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size / 2, -size / 2);
      ctx.lineTo(-size / 2, size / 2);
      ctx.closePath();
      ctx.fill();
      
      // Robot outline
      ctx.strokeStyle = selectedRobot === robot.id ? '#ffffff' : '#1f2937';
      ctx.lineWidth = selectedRobot === robot.id ? 3 : 2;
      ctx.stroke();
      
      // Draw held object indicator
      if (robot.gripper?.heldObject) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(size / 2, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      
      // Battery indicator and label (only if enabled)
      if (showRobotLabels) {
        const batteryWidth = 30;
        const batteryHeight = 6;
        const batteryX = robot.pose.x - batteryWidth / 2;
        const batteryY = robot.pose.y - 35;
        
        // Battery background
        ctx.fillStyle = '#374151';
        ctx.fillRect(batteryX, batteryY, batteryWidth, batteryHeight);
        
        // Battery fill
        const batteryLevel = robot.battery / robot.maxBattery;
        ctx.fillStyle = batteryLevel > 0.5 ? '#22c55e' : batteryLevel > 0.2 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(batteryX, batteryY, batteryWidth * batteryLevel, batteryHeight);
        
        // Battery border
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        ctx.strokeRect(batteryX, batteryY, batteryWidth, batteryHeight);
        
        // Robot name (compact - just type abbreviation)
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Inter';
        ctx.textAlign = 'center';
        const shortName = robot.name.split(' ').map(w => w[0]).join('') + robot.id.slice(-2);
        ctx.fillText(shortName, robot.pose.x, robot.pose.y + 40);
        
        // Status badge
        ctx.font = '8px Inter';
        ctx.fillStyle = STATUS_COLORS[robot.status];
        ctx.fillText(robot.status, robot.pose.x, robot.pose.y + 50);
      }
    }

    ctx.restore();

    // Draw UI overlay (not affected by zoom/pan)
    // Connection status
    ctx.fillStyle = isConnected ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(20, 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(isConnected ? 'Connected' : 'Disconnected', 35, 24);

    // Simulation status
    if (state) {
      ctx.fillStyle = state.status === 'RUNNING' ? '#22c55e' : state.status === 'PAUSED' ? '#f59e0b' : '#6b7280';
      ctx.beginPath();
      ctx.arc(20, 45, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Status: ${state.status}`, 35, 49);
      
      // Tick counter
      ctx.fillText(`Tick: ${state.tick}`, 35, 70);
      ctx.fillText(`Speed: ${state.timeMultiplier}x`, 35, 91);
    }

  }, [state, zoom, pan, showLidar, showPaths, showZones, showRobotLabels, selectedRobot, selectedObject, isConnected]);

  // Animation loop
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      drawCanvas();
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [drawCanvas]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicked on a robot
    for (const robot of state.robots) {
      const dist = Math.sqrt((x - robot.pose.x) ** 2 + (y - robot.pose.y) ** 2);
      if (dist < 30) {
        setSelectedRobot(robot.id);
        setSelectedObject(null);
        return;
      }
    }

    // Check if clicked on an object
    for (const obj of state.objects) {
      if (obj.status === 'PICKED') continue;
      const dx = Math.abs(x - obj.pose.x);
      const dy = Math.abs(y - obj.pose.y);
      if (dx < obj.dimensions.width / 2 && dy < obj.dimensions.height / 2) {
        setSelectedObject(obj.id);
        setSelectedRobot(null);
        setTaskObjectId(obj.id);
        return;
      }
    }

    // If nothing clicked, and a robot is selected, move it there
    if (selectedRobot && socket) {
      socket.emit('robot:move', { robotId: selectedRobot, target: { x, y } });
    }

    setSelectedRobot(null);
    setSelectedObject(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // ============================================
  // SIMULATION CONTROLS
  // ============================================

  const handleStart = () => socket?.emit('simulation:start');
  const handlePause = () => socket?.emit('simulation:pause');
  const handleStop = () => socket?.emit('simulation:stop');
  const handleReset = () => socket?.emit('simulation:reset');
  const handleAISchedule = () => socket?.emit('ai:schedule');

  const handleCreateTask = () => {
    if (socket) {
      if (bulkMode && selectedBulkObjects.length > 0 && taskTargetZone) {
        // Bulk task creation - auto-assigns to all available robots
        socket.emit('task:create-bulk', { 
          objectIds: selectedBulkObjects, 
          targetZoneId: taskTargetZone,
          autoAssign: true 
        });
        setSelectedBulkObjects([]);
        setTaskTargetZone('');
      } else if (taskObjectId && taskTargetZone) {
        // Single task creation with optional robot assignment
        socket.emit('task:create', { 
          objectId: taskObjectId, 
          targetZoneId: taskTargetZone,
          robotId: taskRobotId 
        });
        setTaskObjectId('');
        setTaskTargetZone('');
        setTaskRobotId('auto');
      }
    }
  };
  
  const toggleBulkObject = (objectId: string) => {
    setSelectedBulkObjects(prev => 
      prev.includes(objectId) 
        ? prev.filter(id => id !== objectId)
        : [...prev, objectId]
    );
  };
  
  const selectAllAvailableObjects = () => {
    const allAvailable = state?.objects.filter(o => o.status === 'AVAILABLE').map(o => o.id) || [];
    setSelectedBulkObjects(allAvailable);
  };

  const handleSpeedChange = (value: number[]) => {
    socket?.emit('simulation:speed', { multiplier: value[0] });
  };

  const handleAddMaterial = () => {
    if (socket && addMaterialType && addMaterialZone) {
      socket.emit('object:create', {
        type: addMaterialType as ObjectType,
        zoneId: addMaterialZone,
      });
      setAddMaterialType('');
    }
  };

  // Get selected robot/object data
  const selectedRobotData = state?.robots.find(r => r.id === selectedRobot);
  const selectedObjectData = state?.objects.find(o => o.id === selectedObject);
  const availableObjects = state?.objects.filter(o => o.status === 'AVAILABLE') || [];
  // Use externalZones if available and sync not yet confirmed, otherwise server state
  const activeZones = (externalZones && externalZones.length > 0 && !zonesSyncedRef.current)
    ? externalZones.map(z => ({ ...z, currentOccupancy: 0, capacity: z.capacity || 15, objects: [] as string[] }))
    : (state?.zones || []);
  const targetZones = activeZones.filter(z => z.type !== 'CHARGING_STATION' && z.type !== 'ROBOT_HOME');

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Main Canvas Area — full width vertical layout */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Top Controls */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              {/* Simulation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={!isConnected || state?.status === 'RUNNING'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-1" /> Start
                </Button>
                <Button
                  size="sm"
                  onClick={handlePause}
                  disabled={!isConnected || state?.status !== 'RUNNING'}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Pause className="w-4 h-4 mr-1" /> Pause
                </Button>
                <Button
                  size="sm"
                  onClick={handleStop}
                  disabled={!isConnected || state?.status === 'STOPPED'}
                  variant="destructive"
                >
                  <Square className="w-4 h-4 mr-1" /> Stop
                </Button>
                <Button
                  size="sm"
                  onClick={handleReset}
                  disabled={!isConnected}
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-1" /> Reset
                </Button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center gap-4 px-4 border-l border-slate-700">
                <span className="text-sm text-slate-400">Speed:</span>
                <Slider
                  defaultValue={[1]}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="w-32"
                  onValueChange={handleSpeedChange}
                />
                <span className="text-sm text-white w-12">{state?.timeMultiplier || 1}x</span>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={showZones ? 'default' : 'outline'}
                  onClick={() => setShowZones(!showZones)}
                >
                  <Layers className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showPaths ? 'default' : 'outline'}
                  onClick={() => setShowPaths(!showPaths)}
                >
                  <Navigation className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showLidar ? 'default' : 'outline'}
                  onClick={() => setShowLidar(!showLidar)}
                  title="Toggle LiDAR"
                >
                  <Radar className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showRobotLabels ? 'default' : 'outline'}
                  onClick={() => setShowRobotLabels(!showRobotLabels)}
                  title="Toggle Robot Labels"
                >
                  <Tag className="w-4 h-4" />
                </Button>
                <div className="border-l border-slate-700 pl-2 flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-white w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const el = document.querySelector('[data-simulation-canvas]');
                      if (el) {
                        if (document.fullscreenElement) {
                          document.exitFullscreen();
                        } else {
                          el.requestFullscreen();
                        }
                      }
                    }}
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task & Material Controls — compact inline cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Create Task */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-2 px-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Create Task</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setBulkMode(!bulkMode); setSelectedBulkObjects([]); }}
                  className={`text-xs ml-auto h-6 ${bulkMode ? 'text-purple-400' : 'text-slate-400'}`}
                >
                  {bulkMode ? 'Single' : 'Bulk'}
                </Button>
              </div>
              {bulkMode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{selectedBulkObjects.length} selected</span>
                    <Button variant="ghost" size="sm" onClick={selectAllAvailableObjects} className="text-xs h-5">Select All</Button>
                  </div>
                  <ScrollArea className="h-24 border border-slate-700 rounded-md p-1">
                    {availableObjects.map(obj => (
                      <div
                        key={obj.id}
                        onClick={() => toggleBulkObject(obj.id)}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-slate-800 text-xs ${
                          selectedBulkObjects.includes(obj.id) ? 'bg-purple-900/30 border border-purple-500' : ''
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: obj.color }} />
                        <span>{obj.name}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={taskObjectId} onValueChange={setTaskObjectId}>
                    <SelectTrigger className="flex-1 h-8 text-xs bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select object..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      {availableObjects.map(obj => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={taskRobotId} onValueChange={setTaskRobotId}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Auto-assign" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="auto">Auto (Best)</SelectItem>
                      {state?.robots.filter(r => r.status === 'IDLE' && r.battery > 30).map(robot => (
                        <SelectItem key={robot.id} value={robot.id}>{robot.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Select value={taskTargetZone} onValueChange={setTaskTargetZone}>
                  <SelectTrigger className="flex-1 h-8 text-xs bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Target zone..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {targetZones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  onClick={handleCreateTask}
                  disabled={bulkMode ? (selectedBulkObjects.length === 0 || !taskTargetZone) : (!taskObjectId || !taskTargetZone)}
                >
                  <Package className="w-4 h-4 mr-1" />
                  {bulkMode ? `${selectedBulkObjects.length} Tasks` : 'Task'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAISchedule}
                  disabled={!isConnected}
                  title="AI Auto-Schedule"
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Material */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-2 px-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Add Material</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={addMaterialType} onValueChange={setAddMaterialType}>
                  <SelectTrigger className="flex-1 h-8 text-xs bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Material type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                    {MATERIAL_TYPES.map(mat => (
                      <SelectItem key={mat.type} value={mat.type}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: mat.color }} />
                          {mat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={addMaterialZone} onValueChange={setAddMaterialZone}>
                  <SelectTrigger className="flex-1 h-8 text-xs bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Target zone..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {targetZones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleAddMaterial}
                  disabled={!isConnected || !addMaterialType || !addMaterialZone}
                >
                  <Package className="w-4 h-4 mr-1" /> Material
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <Card data-simulation-canvas className="flex-1 bg-slate-900/50 border-slate-800 overflow-hidden relative min-h-[500px]">
          {/* Server Not Running Alert */}
          {!isConnected && (
            <div className="absolute inset-0 z-10 bg-slate-900/90 flex items-center justify-center">
              <div className="text-center p-6 max-w-md">
                <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Simulation Server Not Running</h3>
                <p className="text-slate-400 mb-4">
                  The WebSocket simulation server needs to be started separately.
                </p>
                <div className="bg-slate-800/80 rounded-lg p-4 text-left mb-4">
                  <p className="text-xs text-slate-500 mb-2">Run this command in a new terminal:</p>
                  <code className="text-green-400 text-sm font-mono">npm run ws:server</code>
                  <p className="text-xs text-slate-500 mt-2">or:</p>
                  <code className="text-green-400 text-sm font-mono">npx tsx websocket-services/websocket-server.ts</code>
                </div>
                <p className="text-xs text-slate-500">
                  The simulation will connect automatically when the server starts.
                </p>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit: 'contain'
            }}
            className="cursor-crosshair"
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </Card>

        {/* Metrics Bar */}
        {state && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-3">
              <div className="grid grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{state.robots.length}</div>
                  <div className="text-xs text-slate-400">Robots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{state.metrics.totalTasksCompleted}</div>
                  <div className="text-xs text-slate-400">Tasks Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {state.tasks.filter(t => t.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="text-xs text-slate-400">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {state.tasks.filter(t => t.status === 'PENDING').length}
                  </div>
                  <div className="text-xs text-slate-400">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {Math.round(state.metrics.fleetEfficiency * 100)}%
                  </div>
                  <div className="text-xs text-slate-400">Fleet Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {state.metrics.averageTaskTime.toFixed(1)}s
                  </div>
                  <div className="text-xs text-slate-400">Avg Task Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Fleet Activity — below map, like 3D arm robot style */}
        {state && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-2 px-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="text-sm font-medium text-white">Live Fleet Activity</span>
                <Badge variant="outline" className="text-green-400 border-green-500/50 text-xs ml-auto">
                  {state.robots.filter(r => r.status !== 'IDLE').length}/{state.robots.length} active
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {state.robots.map(robot => {
                  const task = state.tasks.find(t => t.assignedRobotId === robot.id && t.status === 'IN_PROGRESS');
                  const targetObj = task?.objectId ? state.objects.find(o => o.id === task.objectId) : null;
                  const targetZoneData = task?.targetZone ? activeZones.find(z => z.id === task.targetZone) : null;
                  return (
                    <div
                      key={robot.id}
                      className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded cursor-pointer transition-colors ${
                        selectedRobot === robot.id ? 'bg-blue-900/30 border border-blue-500' : 'bg-slate-800/50 hover:bg-slate-800'
                      }`}
                      onClick={() => setSelectedRobot(robot.id)}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[robot.status] || '#4b5563' }}
                      />
                      <span className="font-mono font-medium text-white w-20 flex-shrink-0 truncate">{robot.name}</span>
                      {robot.status === 'IDLE' ? (
                        <span className="text-slate-500">standby</span>
                      ) : robot.status === 'PICKING' ? (
                        <span className="text-yellow-400 truncate">picking {targetObj?.name || 'object'}</span>
                      ) : robot.status === 'CARRYING' ? (
                        <span className="text-green-400 truncate">carrying → {targetZoneData?.name || '...'}</span>
                      ) : robot.status === 'PLACING' ? (
                        <span className="text-purple-400 truncate">placing at {targetZoneData?.name || '...'}</span>
                      ) : robot.status === 'MOVING' ? (
                        <span className="text-blue-400 truncate">moving to target</span>
                      ) : robot.status === 'CHARGING' ? (
                        <span className="text-cyan-400">charging</span>
                      ) : (
                        <span className="text-slate-400">{robot.status.toLowerCase()}</span>
                      )}
                      <span className="text-slate-600 ml-auto flex-shrink-0">{robot.battery}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Tasks — below fleet activity */}
        {state && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-2 px-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                <span className="text-sm font-medium text-white">Active Tasks</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-500/50 text-xs ml-auto">
                  {state.tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING').length} queued
                </Badge>
              </div>
              {state.tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {state.tasks
                    .filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING')
                    .slice(0, 6)
                    .map(task => {
                      const robot = task.assignedRobotId ? state.robots.find(r => r.id === task.assignedRobotId) : null;
                      return (
                        <div key={task.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-slate-800/50">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: task.status === 'IN_PROGRESS' ? '#3b82f6' : '#6b7280' }}
                          />
                          <span className="text-white font-medium truncate">
                            {task.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-500 flex-shrink-0">
                            {task.currentStep + 1}/{task.steps.length}
                          </span>
                          {robot && (
                            <span className="text-blue-400 ml-auto flex-shrink-0 truncate max-w-[80px]">
                              {robot.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-2 text-xs">
                  No active tasks
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
