'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from './websocket-url';

// ============================================
// TYPES
// ============================================

export interface Robot {
  id: string;
  name: string;
  type: string;
  status: string;
  battery: number;
  pose: { x: number; y: number; rotation: number };
  currentTaskId: string | null;
  tasksCompleted: number;
  distanceTraveled: number;
  pickSuccessRate: number;
}

export interface SimulationTask {
  id: string;
  type: string;
  status: string;
  objectId: string;
  targetZone: string | null;
  assignedRobotId: string | null;
  steps: Array<{ action: string; target: string; completed: boolean }>;
  currentStep: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  retryCount?: number;
  maxRetries?: number;
  failureReason?: string | null;
}

export interface Zone {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  capacity: number;
  currentOccupancy: number;
  objects?: string[];
}

export interface SimulationObject {
  id: string;
  name: string;
  type: string;
  status: string;
  color: string;
  weight: number;
  pose: { x: number; y: number; rotation: number };
}

export interface SimulationState {
  id: string;
  name: string;
  status: 'STOPPED' | 'RUNNING' | 'PAUSED';
  dimensions?: { width: number; height: number };
  tick: number;
  timeMultiplier: number;
  robots: Robot[];
  objects: SimulationObject[];
  zones: Zone[];
  tasks: SimulationTask[];
  metrics: {
    totalTasksCreated: number;
    totalTasksCompleted: number;
    totalTasksFailed: number;
    fleetEfficiency: number;
    averageTaskTime: number;
    pickSuccessRate: number;
  };
}

interface SimulationContextType {
  state: SimulationState | null;
  isConnected: boolean;
  socket: Socket | null;
  // Actions
  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  createTask: (objectId: string, targetZoneId: string, robotId?: string) => void;
}

// ============================================
// CONTEXT
// ============================================

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<SimulationState | null>(null);

  useEffect(() => {
    // Connect to WebSocket server (auto-detects Codespaces, localhost, production)
    const wsUrl = getWebSocketUrl();
    console.log('🔌 SimulationProvider connecting to:', wsUrl);
    
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
      console.log('✅ Simulation context connected');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('simulation:state', (newState: SimulationState) => {
      setState(newState);
    });

    socketInstance.on('task:failed', (data: { taskId: string; reason: string; retryCount: number; objectId: string }) => {
      console.warn(`⚠️ Task ${data.taskId} failed (attempt ${data.retryCount}): ${data.reason}`);
    });

    socketInstance.on('connect_error', (error: Error) => {
      console.warn('⚠️ Simulation server not running. Start with: npm run ws:server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const startSimulation = () => socket?.emit('simulation:start');
  const pauseSimulation = () => socket?.emit('simulation:pause');
  const stopSimulation = () => socket?.emit('simulation:stop');
  const resetSimulation = () => socket?.emit('simulation:reset');
  
  const createTask = (objectId: string, targetZoneId: string, robotId?: string) => {
    socket?.emit('task:create', { objectId, targetZoneId, robotId });
  };

  return (
    <SimulationContext.Provider
      value={{
        state,
        isConnected,
        socket,
        startSimulation,
        pauseSimulation,
        stopSimulation,
        resetSimulation,
        createTask,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}

// Mock data matching actual WebSocket server robots
export const MOCK_ROBOTS: Robot[] = [
  {
    id: 'robot-mm-01',
    name: 'Mobile Manipulator 01',
    type: 'MOBILE_MANIPULATOR',
    status: 'IDLE',
    battery: 100,
    pose: { x: 100, y: 250, rotation: 0 },
    currentTaskId: null,
    tasksCompleted: 0,
    distanceTraveled: 0,
    pickSuccessRate: 0,
  },
  {
    id: 'robot-mm-02',
    name: 'Mobile Manipulator 02',
    type: 'MOBILE_MANIPULATOR',
    status: 'IDLE',
    battery: 85,
    pose: { x: 300, y: 450, rotation: 90 },
    currentTaskId: null,
    tasksCompleted: 0,
    distanceTraveled: 0,
    pickSuccessRate: 0,
  },
  {
    id: 'robot-forklift-01',
    name: 'Forklift 01',
    type: 'FORKLIFT',
    status: 'IDLE',
    battery: 90,
    pose: { x: 600, y: 250, rotation: 180 },
    currentTaskId: null,
    tasksCompleted: 0,
    distanceTraveled: 0,
    pickSuccessRate: 0,
  },
  {
    id: 'robot-transport-01',
    name: 'Transport Robot 01',
    type: 'AMR_TRANSPORT',
    status: 'IDLE',
    battery: 75,
    pose: { x: 750, y: 400, rotation: 270 },
    currentTaskId: null,
    tasksCompleted: 0,
    distanceTraveled: 0,
    pickSuccessRate: 0,
  },
];

// Mock zones matching actual WebSocket server
export const MOCK_ZONES: Zone[] = [
  { id: 'zone-material-storage', name: 'Material Storage', type: 'MATERIAL_STORAGE', bounds: { x: 50, y: 50, width: 200, height: 150 }, color: '#6366f1', capacity: 20, currentOccupancy: 30 },
  { id: 'zone-assembly', name: 'Assembly Area', type: 'ASSEMBLY_AREA', bounds: { x: 400, y: 300, width: 250, height: 200 }, color: '#22c55e', capacity: 10, currentOccupancy: 0 },
  { id: 'zone-staging', name: 'Staging Zone', type: 'STAGING_ZONE', bounds: { x: 700, y: 100, width: 180, height: 150 }, color: '#f59e0b', capacity: 15, currentOccupancy: 10 },
  { id: 'zone-charging', name: 'Charging Station', type: 'CHARGING_STATION', bounds: { x: 800, y: 600, width: 150, height: 150 }, color: '#06b6d4', capacity: 4, currentOccupancy: 0 },
  { id: 'zone-work-1', name: 'Work Zone A', type: 'WORK_ZONE', bounds: { x: 200, y: 500, width: 200, height: 150 }, color: '#8b5cf6', capacity: 8, currentOccupancy: 5 },
  { id: 'zone-inspection', name: 'Inspection Point', type: 'INSPECTION_POINT', bounds: { x: 500, y: 600, width: 100, height: 100 }, color: '#ef4444', capacity: 5, currentOccupancy: 0 },
  { id: 'zone-robot-home', name: 'Robot Home', type: 'ROBOT_HOME', bounds: { x: 850, y: 450, width: 120, height: 120 }, color: '#10b981', capacity: 4, currentOccupancy: 0 },
];
