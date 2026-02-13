/**
 * ROS 2 Bridge Status Component
 * Shows connection status to ROS 2 / Gazebo simulation
 * 
 * Integration with ROS 2 + Gazebo/Isaac Sim
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Terminal,
  Play,
  Square,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  Box,
  Layers
} from 'lucide-react';

interface RosBridgeStatus {
  rosBridge: {
    url: string;
    connected: boolean;
    protocol: string;
  };
  gazebo: {
    url: string;
    connected: boolean;
    worldLoaded: boolean;
  };
  capabilities: string[];
  supportedSimulators: Array<{
    name: string;
    protocol: string;
    supported: boolean;
  }>;
}

interface Zone {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
}

interface RosBridgeConnectorProps {
  zones?: Zone[];
  onStatusChange?: (connected: boolean) => void;
}

export default function RosBridgeConnector({ zones = [], onStatusChange }: RosBridgeConnectorProps) {
  const [status, setStatus] = useState<RosBridgeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch ROS bridge status
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ros/bridge?action=status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        onStatusChange?.(data.status.rosBridge.connected);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch (err) {
      setError('Connection failed');
      console.error('[ROS Bridge] Status fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  // Sync zones to Gazebo
  const syncZonesToGazebo = useCallback(async () => {
    if (zones.length === 0) {
      setError('No zones to sync');
      return;
    }
    
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ros/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_zones',
          data: { zones }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastSync(new Date().toLocaleTimeString());
        console.log('[ROS Bridge] Zones synced:', data.markers);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError('Failed to sync zones');
      console.error('[ROS Bridge] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [zones]);

  // Load world configuration
  const loadWorld = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ros/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'load_world',
          data: {
            worldFile: 'construction_site',
            robots: [
              {
                model: 'mobile_manipulator',
                name: 'robot_1',
                position: { x: 1.0, y: 1.0, z: 0.0 }
              },
              {
                model: 'amr_transport',
                name: 'robot_2',
                position: { x: 2.0, y: 1.0, z: 0.0 }
              }
            ]
          }
        })
      });
      
      const data = await response.json();
      console.log('[ROS Bridge] World loaded:', data);
    } catch (err) {
      console.error('[ROS Bridge] Load world error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <Card className="bg-slate-900/50 border-slate-800/30">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            ROS 2 / Gazebo Bridge
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchStatus}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-2">
          {/* ROS Bridge */}
          <div className="p-2 rounded bg-slate-800/50">
            <div className="flex items-center gap-2 mb-1">
              {status?.rosBridge.connected ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
              <span className="text-xs font-medium">ROS Bridge</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {status?.rosBridge.url || 'ws://localhost:9090'}
            </div>
            <Badge 
              variant="outline" 
              className={`text-[10px] mt-1 ${
                status?.rosBridge.connected 
                  ? 'text-green-400 border-green-500/50' 
                  : 'text-yellow-400 border-yellow-500/50'
              }`}
            >
              {status?.rosBridge.connected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
          
          {/* Gazebo */}
          <div className="p-2 rounded bg-slate-800/50">
            <div className="flex items-center gap-2 mb-1">
              {status?.gazebo.connected ? (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-slate-500" />
              )}
              <span className="text-xs font-medium">Gazebo</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {status?.gazebo.url || 'http://localhost:11345'}
            </div>
            <Badge 
              variant="outline" 
              className={`text-[10px] mt-1 ${
                status?.gazebo.worldLoaded 
                  ? 'text-green-400 border-green-500/50' 
                  : 'text-slate-400 border-slate-500/50'
              }`}
            >
              {status?.gazebo.worldLoaded ? 'World Loaded' : 'No World'}
            </Badge>
          </div>
        </div>

        {/* Supported Simulators */}
        <div className="p-2 rounded bg-slate-800/30">
          <div className="text-xs font-medium mb-2 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            Supported Simulators
          </div>
          <div className="flex flex-wrap gap-1">
            {status?.supportedSimulators.map(sim => (
              <Badge 
                key={sim.name}
                variant="outline" 
                className={`text-[10px] ${
                  sim.supported 
                    ? 'text-green-400 border-green-500/30' 
                    : 'text-slate-500 border-slate-600/30'
                }`}
              >
                {sim.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Zone Sync */}
        <div className="p-2 rounded bg-slate-800/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Zone Sync
            </div>
            <Badge variant="outline" className="text-[10px]">
              {zones.length} zones
            </Badge>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={syncZonesToGazebo}
            disabled={isSyncing || zones.length === 0}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Box className="w-3 h-3 mr-1" />
                Sync Zones to Gazebo
              </>
            )}
          </Button>
          
          {lastSync && (
            <div className="text-[10px] text-green-400 mt-1 text-center">
              Last sync: {lastSync}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={loadWorld}
            disabled={isLoading}
          >
            <Play className="w-3 h-3 mr-1" />
            Load World
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-slate-400"
            onClick={() => window.open('http://localhost:9090', '_blank')}
          >
            <Terminal className="w-3 h-3 mr-1" />
            Open Bridge
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Setup Instructions */}
        <details className="text-[10px]">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-400">
            Setup Instructions
          </summary>
          <div className="mt-2 p-2 rounded bg-slate-800/50 text-slate-400 space-y-1">
            <p>1. Install ROS 2 Humble/Iron</p>
            <p>2. <code className="text-purple-400">sudo apt install ros-humble-rosbridge-suite</code></p>
            <p>3. <code className="text-purple-400">ros2 launch rosbridge_server rosbridge_websocket_launch.xml</code></p>
            <p>4. <code className="text-purple-400">ros2 launch gazebo_ros gazebo.launch.py</code></p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
