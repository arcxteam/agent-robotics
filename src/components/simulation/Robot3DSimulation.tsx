'use client';

import { useRef, useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Grid,
  Html,
  Line,
  RoundedBox,
  useTexture
} from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Play,
  Pause,
  RotateCcw,
  Bot,
  Eye,
  Move3D,
  ArrowRight,
  Plus,
  Sparkles,
  Truck,
  Package,
  Zap,
} from 'lucide-react';

// ============================================
// INTERFACES
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

interface Zone3D {
  id: string;
  name: string;
  position: THREE.Vector3;
  size: [number, number, number];
  color: string;
  type: 'storage' | 'work' | 'assembly' | 'staging' | 'office' | 'lobby' | 'kitchen' | 'restaurant' | 'charging' | 'other';
  originalType?: string;
}

interface RobotState {
  id: string;
  name: string;
  type: 'box_truck' | 'forklift' | 'amr';
  position: THREE.Vector3;
  rotation: number;
  homePosition: THREE.Vector3;
  armRotation: number;
  liftHeight: number;
  gripperOpen: number;
  isHolding: boolean;
  heldObjectId: string | null;
  status: 'idle' | 'moving_to_pickup' | 'picking' | 'moving_to_drop' | 'placing' | 'returning_home';
  targetPosition: THREE.Vector3 | null;
  path: THREE.Vector3[];
  battery: number;
  tasksCompleted: number;
  color: string;
}

interface PickableObject {
  id: string;
  name?: string;
  position: THREE.Vector3;
  color: string;
  type: 'cube' | 'cylinder' | 'box' | 'bag' | 'beam' | 'pallet' | 'barrel';
  size: [number, number, number];
  picked: boolean;
  inZone: string;
}

interface Task {
  id: string;
  objectId: string;
  sourceZone: string;
  targetZone: string;
  assignedRobotId: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  priority: number;
}

interface Robot3DSimulationProps {
  externalZones?: ExternalZone[];
  canvasWidth?: number;
  canvasHeight?: number;
  floorPlanUrl?: string;
}

// ============================================
// CONSTANTS & HELPERS
// ============================================

const WORLD_SIZE = 20;
const ROBOT_SPEED = 0.04;
const ROBOT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

// Generate waypoints between two points to avoid straight-line movement
function generateWaypoints(from: THREE.Vector3, to: THREE.Vector3, zones: Zone3D[]): THREE.Vector3[] {
  const waypoints: THREE.Vector3[] = [from.clone()];
  const dist = from.distanceTo(to);

  if (dist < 2) {
    // Short distance: go direct
    waypoints.push(to.clone());
    return waypoints;
  }

  // Add 1-2 intermediate waypoints offset from the direct line
  const numWaypoints = dist > 5 ? 2 : 1;
  for (let i = 1; i <= numWaypoints; i++) {
    const t = i / (numWaypoints + 1);
    const mid = from.clone().lerp(to.clone(), t);

    // Offset perpendicular to the path to create a curve around obstacles
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const offsetAmount = (Math.random() - 0.5) * 3; // Random curve
    mid.add(perp.multiplyScalar(offsetAmount));

    // Clamp to world bounds
    mid.x = Math.max(-WORLD_SIZE / 2 + 1, Math.min(WORLD_SIZE / 2 - 1, mid.x));
    mid.z = Math.max(-WORLD_SIZE / 2 + 1, Math.min(WORLD_SIZE / 2 - 1, mid.z));
    mid.y = 0;

    waypoints.push(mid);
  }

  waypoints.push(to.clone());
  return waypoints;
}

const TYPE_MAP: Record<string, Zone3D['type']> = {
  'MATERIAL_STORAGE': 'storage',
  'ASSEMBLY_AREA': 'assembly',
  'STAGING_ZONE': 'staging',
  'WORK_ZONE': 'work',
  'CHARGING_STATION': 'charging',
  'ROBOT_HOME': 'charging',
  'RESTRICTED_AREA': 'staging',
  'OFFICE': 'office',
  'LOBBY': 'lobby',
  'RESTAURANT': 'restaurant',
  'KITCHEN': 'kitchen',
  'Meeting Room': 'office',
  'Office Area': 'office',
  'Restaurant Area': 'restaurant',
  'Lobby Area': 'lobby',
  'Kitchen': 'kitchen',
};

function getColorForType(type: string): string {
  const colors: Record<string, string> = {
    'MATERIAL_STORAGE': '#6366f1',
    'ASSEMBLY_AREA': '#22c55e',
    'STAGING_ZONE': '#f59e0b',
    'WORK_ZONE': '#8b5cf6',
    'RESTRICTED_AREA': '#ef4444',
    'CHARGING_STATION': '#06b6d4',
    'ROBOT_HOME': '#10b981',
    'OFFICE': '#22c55e',
    'LOBBY': '#3b82f6',
    'RESTAURANT': '#f59e0b',
    'KITCHEN': '#ef4444',
    'storage': '#6366f1',
    'work': '#8b5cf6',
    'assembly': '#22c55e',
    'staging': '#f59e0b',
    'charging': '#06b6d4',
  };
  return colors[type] || '#6366f1';
}

function convertTo3DZone(zone: ExternalZone, canvasWidth: number, canvasHeight: number, index: number): Zone3D {
  // AI detected zones use percentage (0-100), manual zones use pixels or percentage (0-1)
  let normalizedX: number;
  let normalizedY: number;
  let normalizedW: number;
  let normalizedH: number;
  
  // Detect if values are percentages (0-100) or normalized (0-1) or pixels
  const maxBound = Math.max(zone.bounds.x, zone.bounds.y, zone.bounds.width, zone.bounds.height);
  
  if (maxBound <= 1) {
    // Already normalized (0-1)
    normalizedX = zone.bounds.x;
    normalizedY = zone.bounds.y;
    normalizedW = zone.bounds.width;
    normalizedH = zone.bounds.height;
  } else if (maxBound <= 100) {
    // Percentage (0-100) - AI detected zones use this format
    normalizedX = zone.bounds.x / 100;
    normalizedY = zone.bounds.y / 100;
    normalizedW = zone.bounds.width / 100;
    normalizedH = zone.bounds.height / 100;
  } else {
    // Pixel values - convert to normalized
    normalizedX = zone.bounds.x / canvasWidth;
    normalizedY = zone.bounds.y / canvasHeight;
    normalizedW = zone.bounds.width / canvasWidth;
    normalizedH = zone.bounds.height / canvasHeight;
  }
  
  // Clamp values to valid range
  normalizedX = Math.max(0, Math.min(1, normalizedX));
  normalizedY = Math.max(0, Math.min(1, normalizedY));
  normalizedW = Math.max(0.05, Math.min(1, normalizedW));
  normalizedH = Math.max(0.05, Math.min(1, normalizedH));
  
  // Convert to 3D world coordinates (centered at 0,0)
  const centerX = (normalizedX + normalizedW / 2) * WORLD_SIZE - WORLD_SIZE / 2;
  const centerZ = (normalizedY + normalizedH / 2) * WORLD_SIZE - WORLD_SIZE / 2;
  
  const sizeX = Math.max(normalizedW * WORLD_SIZE, 1.5);
  const sizeZ = Math.max(normalizedH * WORLD_SIZE, 1.5);
  
  console.log(`🗺️ Zone "${zone.name}": bounds=${JSON.stringify(zone.bounds)} → pos=(${centerX.toFixed(2)}, ${centerZ.toFixed(2)}) size=(${sizeX.toFixed(2)}, ${sizeZ.toFixed(2)})`);
  
  return {
    id: zone.id || `zone-${index}`,
    name: zone.name || `Zone ${index + 1}`,
    position: new THREE.Vector3(centerX, 0, centerZ),
    size: [sizeX, 0.1, sizeZ],
    color: zone.color || getColorForType(zone.type),
    type: TYPE_MAP[zone.type] || TYPE_MAP[zone.name] || 'other',
    originalType: zone.type,
  };
}

// Real construction material names for objects (English)
const CONSTRUCTION_MATERIALS = [
  // Heavy materials - beams (long flat shapes)
  { name: 'Steel Beam H200', color: '#475569', type: 'beam' as const },
  { name: 'Concrete Block', color: '#78716c', type: 'pallet' as const },
  { name: 'Rebar Bundle D16', color: '#44403c', type: 'beam' as const },
  { name: 'Brick Pallet', color: '#b45309', type: 'pallet' as const },
  // Piping & Electrical - cylinders
  { name: 'PVC Pipe 4"', color: '#0ea5e9', type: 'cylinder' as const },
  { name: 'Galvanized Pipe 2"', color: '#94a3b8', type: 'cylinder' as const },
  { name: 'Electrical Panel', color: '#eab308', type: 'box' as const },
  { name: 'Cable Drum NYY', color: '#1e293b', type: 'barrel' as const },
  // Bags & Bulk materials - rounded bag shapes
  { name: 'Cement Bag 40kg', color: '#64748b', type: 'bag' as const },
  { name: 'Sand Bag 25kg', color: '#d4a574', type: 'bag' as const },
  { name: 'Gravel Bag 20kg', color: '#6b7280', type: 'bag' as const },
  { name: 'Mortar Mix 25kg', color: '#a3a3a3', type: 'bag' as const },
  // Boards & Sheets - flat boxes
  { name: 'Plywood Sheet 12mm', color: '#a16207', type: 'box' as const },
  { name: 'Gypsum Board', color: '#f5f5f4', type: 'box' as const },
  { name: 'GRC Panel', color: '#d1d5db', type: 'box' as const },
  { name: 'Ceramic Tiles Box', color: '#e5e7eb', type: 'cube' as const },
  // Scaffolding & Frame
  { name: 'Scaffolding Frame', color: '#a855f7', type: 'beam' as const },
  { name: 'U-Head Jack', color: '#71717a', type: 'cylinder' as const },
  { name: 'Base Plate', color: '#52525b', type: 'cube' as const },
  { name: 'Cross Brace', color: '#737373', type: 'beam' as const },
  // HVAC & Equipment
  { name: 'AC Unit 2HP', color: '#22c55e', type: 'box' as const },
  { name: 'Exhaust Fan', color: '#16a34a', type: 'barrel' as const },
  { name: 'Water Pump', color: '#0891b2', type: 'barrel' as const },
  // Light materials
  { name: 'Tool Box Red', color: '#ef4444', type: 'cube' as const },
  { name: 'Safety Helmet Box', color: '#f97316', type: 'cube' as const },
  { name: 'Paint Bucket 20L', color: '#3b82f6', type: 'barrel' as const },
  { name: 'Fire Extinguisher', color: '#b91c1c', type: 'barrel' as const },
  { name: 'Wire Mesh Roll', color: '#374151', type: 'barrel' as const },
  { name: 'Safety Cone', color: '#fb923c', type: 'cylinder' as const },
];

function generateObjectsForZones(zones: Zone3D[]): PickableObject[] {
  const objects: PickableObject[] = [];
  let materialIndex = 0;

  // First pass: calculate counts per zone
  const zoneCounts: Array<{ zone: Zone3D; count: number }> = [];
  let totalCount = 0;

  zones.forEach((zone) => {
    // Only generate objects in storage/work/assembly/staging zones
    if (['lobby', 'office', 'charging', 'kitchen', 'restaurant'].includes(zone.type)) return;

    const zoneArea = zone.size[0] * zone.size[2];
    const count = Math.max(5, Math.min(10, Math.floor(zoneArea / 1.2)));
    zoneCounts.push({ zone, count });
    totalCount += count;
  });

  // Ensure minimum 25 total objects
  if (totalCount < 25 && zoneCounts.length > 0) {
    const sorted = [...zoneCounts].sort((a, b) =>
      (b.zone.size[0] * b.zone.size[2]) - (a.zone.size[0] * a.zone.size[2])
    );
    const deficit = 25 - totalCount;
    sorted[0].count += deficit;
  }

  // Second pass: generate objects
  for (const { zone, count } of zoneCounts) {
    for (let i = 0; i < count; i++) {
      const material = CONSTRUCTION_MATERIALS[materialIndex % CONSTRUCTION_MATERIALS.length];
      const offsetX = (Math.random() - 0.5) * (zone.size[0] * 0.7);
      const offsetZ = (Math.random() - 0.5) * (zone.size[2] * 0.7);

      // Size depends on type for realistic proportions
      const sizeMap: Record<string, [number, number, number]> = {
        beam: [0.6, 0.08, 0.08],    // long steel beam
        pallet: [0.3, 0.12, 0.25],   // stacked bricks/blocks
        bag: [0.2, 0.14, 0.15],      // rounded cement bag
        barrel: [0.12, 0.2, 0.12],   // tall barrel/bucket
        box: [0.25, 0.18, 0.3],      // flat board/panel
        cube: [0.15, 0.15, 0.15],    // small cube
        cylinder: [0.06, 0.4, 0.06], // long pipe
      };
      const size = sizeMap[material.type] || [0.15, 0.15, 0.15];

      objects.push({
        id: material.name.replace(/\s+/g, '-').toLowerCase() + `-${materialIndex + 1}`,
        position: new THREE.Vector3(
          zone.position.x + offsetX,
          size[1] / 2 + 0.01,
          zone.position.z + offsetZ
        ),
        color: material.color,
        type: material.type,
        size,
        picked: false,
        inZone: zone.id,
        name: material.name,
      });

      materialIndex++;
    }
  }

  return objects;
}

function createInitialRobots(zones: Zone3D[], count: number = 4): RobotState[] {
  const robots: RobotState[] = [];
  const types: ('box_truck' | 'forklift' | 'amr')[] = ['box_truck', 'box_truck', 'forklift', 'amr'];
  const names = ['MM-01', 'MM-02', 'Forklift-01', 'Transport-01'];
  
  // Find robot home zone first, then charging zone, then center
  const robotHomeZone = zones.find(z => z.originalType === 'ROBOT_HOME');
  const chargingZone = zones.find(z => z.type === 'charging');
  const spawnZone = robotHomeZone || chargingZone;
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 2;
    const homeX = spawnZone ? spawnZone.position.x + (i - 1) * 1.5 : Math.cos(angle) * radius;
    const homeZ = spawnZone ? spawnZone.position.z : Math.sin(angle) * radius;
    const homePos = new THREE.Vector3(homeX, 0, homeZ);
    
    robots.push({
      id: `robot-${i + 1}`,
      name: names[i],
      type: types[i % types.length],
      position: homePos.clone(),
      rotation: 0,
      homePosition: homePos.clone(),
      armRotation: 0,
      liftHeight: 0,
      gripperOpen: 1,
      isHolding: false,
      heldObjectId: null,
      status: 'idle',
      targetPosition: null,
      path: [],
      battery: 100,
      tasksCompleted: 0,
      color: ROBOT_COLORS[i % ROBOT_COLORS.length],
    });
  }
  
  return robots;
}

const DEFAULT_ZONES: Zone3D[] = [
  { id: 'zone-material-storage', name: 'Material Storage', position: new THREE.Vector3(-5, 0, -4), size: [4, 0.1, 3], color: '#6366f1', type: 'storage' },
  { id: 'zone-assembly', name: 'Assembly Area', position: new THREE.Vector3(2, 0, 2), size: [5, 0.1, 4], color: '#22c55e', type: 'assembly' },
  { id: 'zone-staging', name: 'Staging Zone', position: new THREE.Vector3(5, 0, -4), size: [3.5, 0.1, 3], color: '#f59e0b', type: 'staging' },
  { id: 'zone-work-1', name: 'Work Zone A', position: new THREE.Vector3(-4, 0, 4), size: [4, 0.1, 3], color: '#8b5cf6', type: 'work' },
  { id: 'zone-inspection', name: 'Inspection Point', position: new THREE.Vector3(6, 0, 4), size: [2, 0.1, 2], color: '#ef4444', type: 'work' },
  { id: 'zone-charging', name: 'Charging Station', position: new THREE.Vector3(0, 0, -6), size: [3, 0.1, 3], color: '#06b6d4', type: 'charging' },
];

// ============================================
// 3D COMPONENTS
// ============================================

function getStatusLabel(status: string, heldObject?: PickableObject | null): string {
  switch (status) {
    case 'moving_to_pickup': return heldObject ? `picking ${heldObject.name}` : 'moving to pickup';
    case 'picking': return heldObject ? `grabbing ${heldObject.name}` : 'picking';
    case 'moving_to_drop': return heldObject ? `carrying ${heldObject.name}` : 'delivering';
    case 'placing': return 'placing object';
    case 'returning_home': return 'returning';
    case 'idle': return 'idle - ready';
    default: return status.replace(/_/g, ' ');
  }
}

function BoxTruckRobot({
  robot,
  heldObject,
}: { 
  robot: RobotState;
  heldObject: PickableObject | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(robot.position.clone());
  const currentRot = useRef(robot.rotation);
  const liftRef = useRef<THREE.Group>(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Smooth position interpolation
    currentPos.current.lerp(robot.position, 0.08);
    currentRot.current = THREE.MathUtils.lerp(currentRot.current, robot.rotation, 0.1);
    
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = currentRot.current;

    // Animate wheels when moving
    if (robot.status.includes('moving')) {
      setWheelRotation(prev => prev + delta * 8);
    }

    // Animate lift
    if (liftRef.current) {
      const targetLift = robot.isHolding ? 0.3 : 0;
      liftRef.current.position.y = THREE.MathUtils.lerp(liftRef.current.position.y, targetLift, 0.1);
    }
  });

  const getStatusColor = () => {
    switch (robot.status) {
      case 'idle': return '#22c55e';
      case 'moving_to_pickup':
      case 'moving_to_drop': return '#eab308';
      case 'picking':
      case 'placing': return '#3b82f6';
      case 'returning_home': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <group ref={groupRef}>
      {/* Box Truck Body */}
      <RoundedBox args={[0.8, 0.35, 0.5]} position={[0, 0.2, 0]} radius={0.03} castShadow>
        <meshStandardMaterial color={robot.color} metalness={0.6} roughness={0.4} />
      </RoundedBox>
      
      {/* Cabin */}
      <RoundedBox args={[0.25, 0.25, 0.45]} position={[0.35, 0.28, 0]} radius={0.02} castShadow>
        <meshStandardMaterial color="#1e3a5f" metalness={0.7} roughness={0.3} />
      </RoundedBox>
      
      {/* Cargo Area */}
      <RoundedBox args={[0.45, 0.3, 0.48]} position={[-0.1, 0.32, 0]} radius={0.02} castShadow>
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </RoundedBox>

      {/* Wheels */}
      {[
        [-0.25, 0.08, 0.25],
        [-0.25, 0.08, -0.25],
        [0.25, 0.08, 0.25],
        [0.25, 0.08, -0.25],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[wheelRotation, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.7} />
        </mesh>
      ))}

      {/* Status Light */}
      <mesh position={[0.35, 0.45, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={getStatusColor()} emissive={getStatusColor()} emissiveIntensity={0.8} />
      </mesh>

      {/* Lift Platform */}
      <group ref={liftRef} position={[-0.1, 0.48, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.03, 0.35]} />
          <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Held Object */}
        {heldObject && (
          <mesh position={[0, 0.12, 0]} castShadow>
            {heldObject.type === 'cube' && <boxGeometry args={[0.15, 0.15, 0.15]} />}
            {heldObject.type === 'cylinder' && <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />}
            {heldObject.type === 'box' && <boxGeometry args={heldObject.size} />}
            <meshStandardMaterial color={heldObject.color} metalness={0.3} roughness={0.7} />
          </mesh>
        )}
      </group>

      {/* Robot Label */}
      <Html position={[0, 0.8, 0]} center>
        <div className="bg-slate-900/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap border border-slate-700">
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3" style={{ color: robot.color }} />
            <span className="font-bold">{robot.name}</span>
          </div>
          <div className="text-[10px] text-yellow-300">{getStatusLabel(robot.status, heldObject)}</div>
          <div className="text-[10px] text-green-400">🔋 {robot.battery.toFixed(0)}%</div>
        </div>
      </Html>
    </group>
  );
}

function ForkliftRobot({ 
  robot,
  heldObject,
}: { 
  robot: RobotState;
  heldObject: PickableObject | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(robot.position.clone());
  const currentRot = useRef(robot.rotation);
  const forkRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    currentPos.current.lerp(robot.position, 0.08);
    currentRot.current = THREE.MathUtils.lerp(currentRot.current, robot.rotation, 0.1);
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = currentRot.current;

    if (forkRef.current) {
      const targetLift = robot.isHolding ? 0.25 : 0.05;
      forkRef.current.position.y = THREE.MathUtils.lerp(forkRef.current.position.y, targetLift, 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Body */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.25, 0.4]} />
        <meshStandardMaterial color={robot.color} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Cabin */}
      <mesh position={[-0.1, 0.38, 0]} castShadow>
        <boxGeometry args={[0.25, 0.2, 0.35]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Mast */}
      <mesh position={[0.3, 0.35, 0]} castShadow>
        <boxGeometry args={[0.05, 0.5, 0.04]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Forks */}
      <group ref={forkRef} position={[0.35, 0.05, 0]}>
        <mesh position={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[0.4, 0.03, 0.05]} />
          <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.1]} castShadow>
          <boxGeometry args={[0.4, 0.03, 0.05]} />
          <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {heldObject && (
          <mesh position={[0.1, 0.1, 0]} castShadow>
            {heldObject.type === 'cube' && <boxGeometry args={[0.15, 0.15, 0.15]} />}
            {heldObject.type === 'cylinder' && <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />}
            {heldObject.type === 'box' && <boxGeometry args={heldObject.size} />}
            <meshStandardMaterial color={heldObject.color} metalness={0.3} roughness={0.7} />
          </mesh>
        )}
      </group>

      {/* Wheels */}
      {[
        [-0.2, 0.06, 0.2], [-0.2, 0.06, -0.2], [0.15, 0.06, 0.15], [0.15, 0.06, -0.15]
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}

      <Html position={[0, 0.7, 0]} center>
        <div className="bg-slate-900/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap border border-slate-700">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" style={{ color: robot.color }} />
            <span className="font-bold">{robot.name}</span>
          </div>
          <div className="text-[10px] text-yellow-300">{getStatusLabel(robot.status, heldObject)}</div>
        </div>
      </Html>
    </group>
  );
}

function AMRRobot({ 
  robot,
  heldObject,
}: { 
  robot: RobotState;
  heldObject: PickableObject | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(robot.position.clone());
  const currentRot = useRef(robot.rotation);
  const platformRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    currentPos.current.lerp(robot.position, 0.08);
    currentRot.current = THREE.MathUtils.lerp(currentRot.current, robot.rotation, 0.1);
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = currentRot.current;

    if (platformRef.current) {
      const targetY = robot.isHolding ? 0.25 : 0.18;
      platformRef.current.position.y = THREE.MathUtils.lerp(platformRef.current.position.y, targetY, 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Base */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.12, 24]} />
        <meshStandardMaterial color={robot.color} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Platform */}
      <mesh ref={platformRef} position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 24]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Sensor Ring */}
      <mesh position={[0, 0.15, 0]}>
        <torusGeometry args={[0.32, 0.01, 8, 32]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>

      {/* Wheels */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.25, 0.04, Math.sin(angle) * 0.25]} rotation={[Math.PI / 2, 0, angle]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        );
      })}

      {heldObject && (
        <mesh position={[0, 0.3, 0]} castShadow>
          {heldObject.type === 'cube' && <boxGeometry args={[0.15, 0.15, 0.15]} />}
          {heldObject.type === 'cylinder' && <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />}
          {heldObject.type === 'box' && <boxGeometry args={heldObject.size} />}
          <meshStandardMaterial color={heldObject.color} metalness={0.3} roughness={0.7} />
        </mesh>
      )}

      <Html position={[0, 0.6, 0]} center>
        <div className="bg-slate-900/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap border border-slate-700">
          <div className="flex items-center gap-1">
            <Bot className="w-3 h-3" style={{ color: robot.color }} />
            <span className="font-bold">{robot.name}</span>
          </div>
          <div className="text-[10px] text-yellow-300">{getStatusLabel(robot.status, heldObject)}</div>
        </div>
      </Html>
    </group>
  );
}

function RobotRenderer({ robot, objects }: { robot: RobotState; objects: PickableObject[] }) {
  const heldObject = robot.heldObjectId ? objects.find(o => o.id === robot.heldObjectId) || null : null;
  
  switch (robot.type) {
    case 'box_truck':
      return <BoxTruckRobot robot={robot} heldObject={heldObject} />;
    case 'forklift':
      return <ForkliftRobot robot={robot} heldObject={heldObject} />;
    case 'amr':
      return <AMRRobot robot={robot} heldObject={heldObject} />;
    default:
      return <BoxTruckRobot robot={robot} heldObject={heldObject} />;
  }
}

function PathLine({ path, color }: { path: THREE.Vector3[]; color: string }) {
  if (path.length < 2) return null;
  const points = path.map(p => [p.x, 0.05, p.z] as [number, number, number]);
  return (
    <Line points={points} color={color} lineWidth={2} dashed dashScale={10} dashSize={0.3} dashOffset={0} />
  );
}

function PickableObjectMesh({ 
  obj, 
  onClick, 
  isSelected 
}: { 
  obj: PickableObject; 
  onClick: (id: string) => void; 
  isSelected: boolean; 
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const currentPos = useRef(obj.position.clone());

  useFrame(() => {
    if (meshRef.current && !obj.picked) {
      currentPos.current.lerp(obj.position, 0.1);
      meshRef.current.position.copy(currentPos.current);
    }
  });

  if (obj.picked) return null;

  return (
    <group position={[obj.position.x, obj.position.y, obj.position.z]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onClick(obj.id)}
      >
        {/* Cube: small box */}
        {obj.type === 'cube' && <boxGeometry args={[0.15, 0.15, 0.15]} />}
        {/* Cylinder: long pipe */}
        {obj.type === 'cylinder' && <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />}
        {/* Box: flat panel/board */}
        {obj.type === 'box' && <boxGeometry args={obj.size} />}
        {/* Beam: long steel/rebar */}
        {obj.type === 'beam' && <boxGeometry args={[0.6, 0.08, 0.08]} />}
        {/* Pallet: stacked blocks (wide flat with height) */}
        {obj.type === 'pallet' && <boxGeometry args={[0.3, 0.12, 0.25]} />}
        {/* Bag: rounded shape (sphere-ish) */}
        {obj.type === 'bag' && <sphereGeometry args={[0.1, 12, 8]} />}
        {/* Barrel: drum/bucket shape */}
        {obj.type === 'barrel' && <cylinderGeometry args={[0.08, 0.1, 0.2, 12]} />}
        <meshStandardMaterial
          color={hovered || isSelected ? '#fff' : obj.color}
          metalness={obj.type === 'beam' ? 0.7 : obj.type === 'barrel' ? 0.5 : 0.2}
          roughness={obj.type === 'bag' ? 0.9 : obj.type === 'pallet' ? 0.8 : 0.6}
          emissive={isSelected ? obj.color : hovered ? obj.color : '#000'}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.2 : 0}
        />
      </mesh>
      {/* Pallet: add stacking lines */}
      {obj.type === 'pallet' && (
        <>
          <mesh position={[0, 0.065, 0]} castShadow>
            <boxGeometry args={[0.28, 0.005, 0.23]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          <mesh position={[0, 0.035, 0]} castShadow>
            <boxGeometry args={[0.28, 0.005, 0.23]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        </>
      )}
      {/* Bag: add stitching line on top */}
      {obj.type === 'bag' && (
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.005, 4, 12]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      )}
      {(hovered || isSelected) && (
        <Html position={[0, 0.4, 0]} center distanceFactor={8}>
          <div className="px-2 py-1 bg-slate-900/90 rounded text-xs text-white whitespace-nowrap border border-slate-600">
            {obj.name || obj.id}
          </div>
        </Html>
      )}
    </group>
  );
}

function WorkZone({ zone, isTarget }: { zone: Zone3D; isTarget: boolean }) {
  const typeColors: Record<string, string> = {
    storage: '#3182ce', work: '#38a169', assembly: '#d69e2e', staging: '#805ad5',
    office: '#22c55e', lobby: '#3b82f6', kitchen: '#ef4444', restaurant: '#f59e0b',
    charging: '#06b6d4', other: '#6366f1',
  };
  const zoneColor = typeColors[zone.type] || zone.color;

  return (
    <group position={[zone.position.x, 0, zone.position.z]}>
      {/* Zone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[zone.size[0], zone.size[2]]} />
        <meshStandardMaterial color={zoneColor} transparent opacity={isTarget ? 0.6 : 0.3} />
      </mesh>
      
      {/* Zone border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(zone.size[0], 0.02, zone.size[2])]} />
        <lineBasicMaterial color={isTarget ? '#fff' : zoneColor} linewidth={isTarget ? 3 : 1} />
      </lineSegments>
      
      {/* Zone label */}
      <Html position={[0, 0.3, 0]} center>
        <div className={`px-2 py-1 rounded text-xs text-white whitespace-nowrap ${isTarget ? 'bg-green-600' : 'bg-slate-900/80'}`}>
          {zone.type === 'charging' && '⚡ '}
          {zone.name}
        </div>
      </Html>
    </group>
  );
}

function FloorPlanGround({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
      <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
      <meshStandardMaterial map={texture} transparent opacity={0.45} />
    </mesh>
  );
}

function SimulationScene({
  robots,
  objects,
  zones,
  selectedObject,
  targetZone,
  onObjectClick,
}: {
  robots: RobotState[];
  objects: PickableObject[];
  zones: Zone3D[];
  selectedObject: string | null;
  targetZone: string | null;
  onObjectClick: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />
      <Environment preset="warehouse" />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      
      {/* Grid */}
      <Grid 
        position={[0, 0.01, 0]} 
        args={[WORLD_SIZE, WORLD_SIZE]} 
        cellSize={0.5} 
        cellThickness={0.5} 
        cellColor="#2d3748" 
        sectionSize={2} 
        sectionThickness={1} 
        sectionColor="#4a5568" 
        fadeDistance={30} 
        fadeStrength={1} 
        followCamera={false} 
      />
      
      {/* Zones */}
      {zones.map(zone => (
        <WorkZone key={zone.id} zone={zone} isTarget={zone.id === targetZone} />
      ))}
      
      {/* Robot paths */}
      {robots.map(robot => (
        robot.path.length > 0 && <PathLine key={`path-${robot.id}`} path={robot.path} color={robot.color} />
      ))}
      
      {/* Robots */}
      {robots.map(robot => (
        <RobotRenderer key={robot.id} robot={robot} objects={objects} />
      ))}
      
      {/* Physics */}
      <Physics gravity={[0, -9.81, 0]}>
        <RigidBody type="fixed" colliders="cuboid">
          <CuboidCollider args={[WORLD_SIZE / 2, 0.1, WORLD_SIZE / 2]} position={[0, -0.1, 0]} />
        </RigidBody>
      </Physics>
      
      {/* Objects */}
      {objects.map(obj => (
        <PickableObjectMesh 
          key={obj.id} 
          obj={obj} 
          onClick={onObjectClick} 
          isSelected={obj.id === selectedObject} 
        />
      ))}
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Robot3DSimulation({
  externalZones,
  canvasWidth = 800,
  canvasHeight = 600,
  floorPlanUrl
}: Robot3DSimulationProps) {
  const [isRunning, setIsRunning] = useState(true);
  const [cameraView, setCameraView] = useState<'orbit' | 'top'>('orbit');
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [selectedTargetZone, setSelectedTargetZone] = useState<string | null>(null);
  // Auto-enable external zones when they are provided from AI detection
  const [useExternalZones, setUseExternalZones] = useState(true);
  const [autoMode, setAutoMode] = useState(true);

  // Memoize zones - Always prefer external zones when available
  const zones = useMemo<Zone3D[]>(() => {
    if (externalZones && externalZones.length > 0) {
      console.log('🗺️ Using external zones from floor plan:', externalZones.length);
      return externalZones.map((z, i) => convertTo3DZone(z, canvasWidth, canvasHeight, i));
    }
    console.log('📦 Using default zones');
    return DEFAULT_ZONES;
  }, [externalZones, canvasWidth, canvasHeight]);

  // State
  const [robots, setRobots] = useState<RobotState[]>(() => createInitialRobots(zones));
  const [objects, setObjects] = useState<PickableObject[]>(() => generateObjectsForZones(zones));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityLog, setActivityLog] = useState<{id: string; text: string; color: string; time: number}[]>([]);
  const prevCompletedRef = useRef(0);

  // Add Material state
  const [addMaterialType, setAddMaterialType] = useState<string>('');
  const [addMaterialZone, setAddMaterialZone] = useState<string>('');

  const handleAddMaterial = useCallback(() => {
    if (!addMaterialType || !addMaterialZone) return;
    const zone = zones.find(z => z.id === addMaterialZone);
    if (!zone) return;

    const materialIdx = parseInt(addMaterialType);
    const material = CONSTRUCTION_MATERIALS[materialIdx];
    if (!material) return;

    const sizeMap: Record<string, [number, number, number]> = {
      beam: [0.6, 0.08, 0.08],
      pallet: [0.3, 0.12, 0.25],
      bag: [0.2, 0.14, 0.15],
      barrel: [0.12, 0.2, 0.12],
      box: [0.25, 0.18, 0.3],
      cube: [0.15, 0.15, 0.15],
      cylinder: [0.06, 0.4, 0.06],
    };
    const size = sizeMap[material.type] || [0.15, 0.15, 0.15];
    const offsetX = (Math.random() - 0.5) * (zone.size[0] * 0.7);
    const offsetZ = (Math.random() - 0.5) * (zone.size[2] * 0.7);

    const newObj: PickableObject = {
      id: `added-${material.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      position: new THREE.Vector3(
        zone.position.x + offsetX,
        size[1] / 2 + 0.01,
        zone.position.z + offsetZ
      ),
      color: material.color,
      type: material.type,
      size,
      picked: false,
      inZone: zone.id,
      name: material.name,
    };

    setObjects(prev => [...prev, newObj]);
    setAddMaterialType('');
  }, [addMaterialType, addMaterialZone, zones]);

  // Reset when zones change
  useEffect(() => {
    if (!isRunning) {
      setRobots(createInitialRobots(zones));
      setObjects(generateObjectsForZones(zones));
      setTasks([]);
    }
  }, [zones, isRunning]);

  // Find all idle robots for task assignment
  const findIdleRobots = useCallback((): RobotState[] => {
    return robots.filter(r => r.status === 'idle' && r.battery > 20);
  }, [robots]);

  // Assign task to specific robot
  const assignTaskToRobot = useCallback((task: Task, robotId?: string) => {
    const idleRobots = findIdleRobots();
    const targetRobot = robotId
      ? idleRobots.find(r => r.id === robotId)
      : idleRobots[0];

    if (!targetRobot) return;

    const obj = objects.find(o => o.id === task.objectId);
    if (!obj || obj.picked) return;

    const targetPos = obj.position.clone();
    const waypoints = generateWaypoints(targetRobot.position, targetPos, zones);

    setRobots(prev => prev.map(r => {
      if (r.id === targetRobot.id) {
        return {
          ...r,
          status: 'moving_to_pickup' as const,
          targetPosition: waypoints[1] || targetPos, // Next waypoint
          path: waypoints,
        };
      }
      return r;
    }));

    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: 'in_progress' as const, assignedRobotId: targetRobot.id }
        : t
    ));
  }, [findIdleRobots, objects, zones]);

  // Auto-assign tasks - assign to ALL idle robots simultaneously
  useEffect(() => {
    if (!isRunning || !autoMode) return;

    const interval = setInterval(() => {
      const idleRobots = findIdleRobots();
      if (idleRobots.length === 0) return;

      const pendingTasks = tasks.filter(t => t.status === 'pending');

      // Assign pending tasks to idle robots
      let assigned = 0;
      pendingTasks.forEach((task) => {
        if (assigned < idleRobots.length) {
          assignTaskToRobot(task, idleRobots[assigned].id);
          assigned++;
        }
      });

      // For remaining idle robots, create new tasks immediately
      const availableObjects = objects.filter(o => !o.picked && !tasks.some(t =>
        t.objectId === o.id && (t.status === 'pending' || t.status === 'in_progress')
      ));
      const targetZones = zones.filter(z => !['charging', 'office', 'lobby'].includes(z.type));

      for (let i = assigned; i < idleRobots.length; i++) {
        const objIndex = i - assigned;
        const availableObj = availableObjects[objIndex];
        if (availableObj && targetZones.length > 0) {
          // Pick a different target zone than the object's current zone
          const otherZones = targetZones.filter(z => z.id !== availableObj.inZone);
          const randomTargetZone = otherZones.length > 0
            ? otherZones[Math.floor(Math.random() * otherZones.length)]
            : targetZones[Math.floor(Math.random() * targetZones.length)];

          const newTask: Task = {
            id: `task-${Date.now()}-${idleRobots[i].id}`,
            objectId: availableObj.id,
            sourceZone: availableObj.inZone,
            targetZone: randomTargetZone.id,
            assignedRobotId: null,
            status: 'pending',
            priority: Math.random() * 100,
          };
          setTasks(prev => [...prev, newTask]);
          setTimeout(() => assignTaskToRobot(newTask, idleRobots[i].id), 50);
        }
      }
    }, 800); // Fast interval for responsive multi-robot

    return () => clearInterval(interval);
  }, [isRunning, autoMode, tasks, objects, zones, findIdleRobots, assignTaskToRobot]);

  // Track completed tasks for activity log
  useEffect(() => {
    const currentCompleted = tasks.filter(t => t.status === 'completed').length;
    if (currentCompleted > prevCompletedRef.current && currentCompleted > 0) {
      const completedList = tasks.filter(t => t.status === 'completed');
      const newest = completedList[completedList.length - 1];
      if (newest) {
        const obj = objects.find(o => o.id === newest.objectId);
        const targetZone = zones.find(z => z.id === newest.targetZone);
        const robot = robots.find(r => r.id === newest.assignedRobotId);
        setActivityLog(prev => [{
          id: `log-${Date.now()}`,
          text: `${robot?.name || '?'} delivered ${obj?.name || obj?.id || 'object'} → ${targetZone?.name || 'zone'}`,
          color: robot?.color || '#6b7280',
          time: Date.now(),
        }, ...prev].slice(0, 15));
      }
    }
    prevCompletedRef.current = currentCompleted;
  }, [tasks, objects, zones, robots]);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRobots(prevRobots => {
        return prevRobots.map(robot => {
          if (!robot.targetPosition) return robot;

          const distance = robot.position.distanceTo(robot.targetPosition);
          const task = tasks.find(t => t.assignedRobotId === robot.id && t.status === 'in_progress');

          // Move towards target (following waypoints)
          if (distance > 0.15) {
            const direction = new THREE.Vector3()
              .subVectors(robot.targetPosition, robot.position)
              .normalize();
            const newPosition = robot.position.clone().add(direction.multiplyScalar(ROBOT_SPEED));
            const targetRotation = Math.atan2(direction.x, direction.z);

            return {
              ...robot,
              position: newPosition,
              rotation: targetRotation,
              battery: Math.max(0, robot.battery - 0.01),
            };
          }

          // Reached current waypoint - advance to next waypoint if available
          if (robot.path.length > 2) {
            const nextPath = robot.path.slice(1);
            const nextTarget = nextPath[1] || nextPath[0];
            return {
              ...robot,
              position: robot.targetPosition.clone(),
              path: nextPath,
              targetPosition: nextTarget,
            };
          }

          // Arrived at target
          switch (robot.status) {
            case 'moving_to_pickup': {
              if (!task) return { ...robot, status: 'idle' as const, targetPosition: null, path: [] };
              
              const obj = objects.find(o => o.id === task.objectId);
              if (!obj || obj.picked) {
                return { ...robot, status: 'idle' as const, targetPosition: null, path: [] };
              }

              // Pick the object
              setObjects(objs => objs.map(o => 
                o.id === task.objectId ? { ...o, picked: true } : o
              ));

              const targetZone = zones.find(z => z.id === task.targetZone);
              if (!targetZone) {
                return { ...robot, status: 'idle' as const, targetPosition: null, path: [] };
              }

              const dropWaypoints = generateWaypoints(robot.position, targetZone.position, zones);
              return {
                ...robot,
                status: 'moving_to_drop' as const,
                isHolding: true,
                heldObjectId: task.objectId,
                targetPosition: dropWaypoints[1] || targetZone.position.clone(),
                path: dropWaypoints,
              };
            }

            case 'moving_to_drop': {
              if (!task) return { ...robot, status: 'idle' as const, targetPosition: null, path: [] };

              const targetZone = zones.find(z => z.id === task.targetZone);
              if (!targetZone) {
                return { ...robot, status: 'idle' as const, targetPosition: null, path: [] };
              }

              // Place the object
              const placeOffset = new THREE.Vector3(
                (Math.random() - 0.5) * (targetZone.size[0] * 0.5),
                0.1,
                (Math.random() - 0.5) * (targetZone.size[2] * 0.5)
              );
              const newObjPosition = targetZone.position.clone().add(placeOffset);

              setObjects(objs => objs.map(o =>
                o.id === task.objectId
                  ? { ...o, picked: false, position: newObjPosition, inZone: task.targetZone }
                  : o
              ));

              // Mark task completed
              setTasks(prevTasks => prevTasks.map(t =>
                t.id === task.id ? { ...t, status: 'completed' as const } : t
              ));

              // Skip return home - go idle immediately so auto-assign picks up new task
              return {
                ...robot,
                status: 'idle' as const,
                isHolding: false,
                heldObjectId: null,
                targetPosition: null,
                path: [],
                tasksCompleted: robot.tasksCompleted + 1,
              };
            }

            case 'returning_home': {
              return {
                ...robot,
                status: 'idle' as const,
                targetPosition: null,
                path: [],
              };
            }

            default:
              return robot;
          }
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, tasks, objects, zones]);

  // Add task handler
  const handleAddTask = useCallback(() => {
    if (selectedObject && selectedTargetZone) {
      const obj = objects.find(o => o.id === selectedObject);
      if (!obj) return;

      const newTask: Task = {
        id: `task-${Date.now()}`,
        objectId: selectedObject,
        sourceZone: obj.inZone,
        targetZone: selectedTargetZone,
        assignedRobotId: null,
        status: 'pending',
        priority: 50,
      };
      
      setTasks(prev => [...prev, newTask]);
      assignTaskToRobot(newTask);
      setSelectedObject(null);
      setSelectedTargetZone(null);
    }
  }, [selectedObject, selectedTargetZone, objects, assignTaskToRobot]);

  // Reset handler
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setAutoMode(false);
    setTasks([]);
    setSelectedObject(null);
    setSelectedTargetZone(null);
    setRobots(createInitialRobots(zones));
    setObjects(generateObjectsForZones(zones));
  }, [zones]);

  // Toggle zone source
  const toggleZoneSource = useCallback(() => {
    if (externalZones && externalZones.length > 0) {
      setUseExternalZones(prev => !prev);
      handleReset();
    }
  }, [externalZones, handleReset]);

  const availableObjects = objects.filter(o => !o.picked);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const hasExternalZones = externalZones && externalZones.length > 0;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Control Bar — compact, only simulation controls */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Simulation Controls */}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsRunning(true)} disabled={isRunning} className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-1" /> Start
              </Button>
              <Button size="sm" onClick={() => setIsRunning(false)} disabled={!isRunning} className="bg-yellow-600 hover:bg-yellow-700">
                <Pause className="w-4 h-4 mr-1" /> Pause
              </Button>
              <Button size="sm" onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
              <Button
                size="sm"
                onClick={() => setAutoMode(!autoMode)}
                variant={autoMode ? "default" : "outline"}
                className={autoMode ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                <Zap className="w-4 h-4 mr-1" /> Auto
              </Button>
              {hasExternalZones && (
                <Button
                  size="sm"
                  onClick={toggleZoneSource}
                  variant={useExternalZones ? "default" : "outline"}
                  className={useExternalZones ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {useExternalZones ? 'Floor Plan Active' : 'Use Floor Plan'}
                </Button>
              )}
            </div>

            {/* Task Creation */}
            <div className="flex items-center gap-2">
              <Select value={selectedObject || ''} onValueChange={setSelectedObject}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Select object" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                  {availableObjects.map(obj => (
                    <SelectItem key={obj.id} value={obj.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: obj.color }} />
                        <span className="truncate">{obj.name || obj.id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <Select value={selectedTargetZone || ''} onValueChange={setSelectedTargetZone}>
                <SelectTrigger className="w-[150px] h-8 text-xs bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Target zone" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {zones.filter(z => !['charging'].includes(z.type)).map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAddTask}
                disabled={!selectedObject || !selectedTargetZone}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Task
              </Button>
            </div>

            {/* Add Material */}
            <div className="flex items-center gap-2">
              <Select value={addMaterialType} onValueChange={setAddMaterialType}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Material type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                  {CONSTRUCTION_MATERIALS.map((mat, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: mat.color }} />
                        <span className="truncate">{mat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={addMaterialZone} onValueChange={setAddMaterialZone}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-800 border-slate-700">
                  <SelectValue placeholder="To zone" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {zones.filter(z => !['charging'].includes(z.type)).map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAddMaterial}
                disabled={!addMaterialType || !addMaterialZone}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Material
              </Button>
            </div>

            {/* Status & View */}
            <div className="flex items-center gap-3">
              <Badge variant={isRunning ? 'default' : 'secondary'}>{isRunning ? 'Running' : 'Stopped'}</Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-500/50">Robots: {robots.length}</Badge>
              <Badge variant="outline" className="text-purple-400 border-purple-500/50">Zones: {zones.length}</Badge>
              <Badge variant="outline" className="text-amber-400 border-amber-500/50">Objects: {objects.length}</Badge>
              <Badge variant="outline" className="text-green-400 border-green-500/50">✓ {completedTasks}</Badge>
              <div className="flex items-center gap-1">
                <Button size="sm" variant={cameraView === 'orbit' ? 'default' : 'outline'} onClick={() => setCameraView('orbit')} className="h-7 w-7 p-0">
                  <Move3D className="w-4 h-4" />
                </Button>
                <Button size="sm" variant={cameraView === 'top' ? 'default' : 'outline'} onClick={() => setCameraView('top')} className="h-7 w-7 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Info */}
      {useExternalZones && hasExternalZones && (
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">Using {externalZones.length} zones from uploaded floor plan</span>
              <Badge variant="outline" className="text-purple-400 border-purple-500/50 text-xs">AI Detected</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3D Canvas */}
      <Card className="flex-1 bg-slate-900/50 border-slate-800 overflow-hidden min-h-[500px]">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera 
            makeDefault 
            position={cameraView === 'top' ? [0, 15, 0.1] : [10, 8, 10]} 
            fov={50} 
          />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={cameraView === 'orbit'} 
            maxPolarAngle={cameraView === 'top' ? 0.1 : Math.PI / 2}
            minDistance={5}
            maxDistance={25}
          />
          <Suspense fallback={null}>
            {floorPlanUrl && <FloorPlanGround url={floorPlanUrl} />}
            <SimulationScene 
              robots={robots}
              objects={objects} 
              zones={zones} 
              selectedObject={selectedObject} 
              targetZone={selectedTargetZone || tasks.find(t => t.status === 'in_progress')?.targetZone || null}
              onObjectClick={setSelectedObject}
            />
          </Suspense>
        </Canvas>
      </Card>

      {/* Live Activity Feed — shows what auto-mode is doing */}
      {autoMode && isRunning && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-400 animate-pulse" />
              <span className="text-sm font-medium text-white">Auto Mode — Live Fleet Activity</span>
              <Badge variant="outline" className="text-green-400 border-green-500/50 text-xs ml-auto">
                {robots.filter(r => r.status !== 'idle').length}/{robots.length} active
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {robots.map(robot => {
                const heldObj = robot.heldObjectId ? objects.find(o => o.id === robot.heldObjectId) : null;
                const task = tasks.find(t => t.assignedRobotId === robot.id && t.status === 'in_progress');
                const targetObj = task ? objects.find(o => o.id === task.objectId) : null;
                const targetZone = task ? zones.find(z => z.id === task.targetZone) : null;
                return (
                  <div key={robot.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-slate-800/50">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: robot.status !== 'idle' ? robot.color : '#4b5563' }} />
                    <span className="font-mono font-medium text-white w-24 flex-shrink-0">{robot.name}</span>
                    {robot.status === 'idle' ? (
                      <span className="text-slate-500">standby</span>
                    ) : robot.status === 'moving_to_pickup' ? (
                      <span className="text-yellow-400 truncate">picking {targetObj?.name || 'object'}</span>
                    ) : robot.status === 'moving_to_drop' && heldObj ? (
                      <span className="text-green-400 truncate">carrying {heldObj.name} → {targetZone?.name || '...'}</span>
                    ) : (
                      <span className="text-blue-400 truncate">{getStatusLabel(robot.status, heldObj)}</span>
                    )}
                    <span className="text-slate-600 ml-auto flex-shrink-0">{robot.battery.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
            {activityLog.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800 space-y-0.5 max-h-20 overflow-y-auto">
                {activityLog.slice(0, 5).map(entry => (
                  <div key={entry.id} className="flex items-center gap-2 text-[10px] text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span>{entry.text}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-3">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-400">Robots</div>
              <div className="text-sm font-mono text-white">{robots.length} Active</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Working</div>
              <div className="text-sm font-mono text-yellow-400">{robots.filter(r => r.status !== 'idle').length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Objects</div>
              <div className="text-sm font-mono text-white">{availableObjects.length} / {objects.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Pending</div>
              <div className="text-sm font-mono text-blue-400">{pendingTasks}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Completed</div>
              <div className="text-sm font-mono text-green-400">{completedTasks}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Auto Mode</div>
              <div className="text-sm font-mono text-white">{autoMode ? 'ON' : 'OFF'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Zone Source</div>
              <div className="text-sm font-mono text-purple-400">{useExternalZones ? 'Floor Plan' : 'Default'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
