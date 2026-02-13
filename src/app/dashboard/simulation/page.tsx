'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Bot,
  Zap,
  Activity,
  Map,
  HardHat,
  Package,
  Info,
  Upload,
  Layers,
  PenTool,
  Sparkles,
  Play,
  Settings2,
  Eye,
  Box,
  Cpu,
  FileText,
  Server,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSimulation } from '@/lib/simulation-context';

// Dynamic imports to avoid SSR issues
const ConstructionSimulation = dynamic(
  () => import('@/components/simulation/ConstructionSimulation'),
  { ssr: false, loading: () => <SimulationPlaceholder /> }
);

// 3D Robot Simulation with Physics
const Robot3DSimulation = dynamic(
  () => import('@/components/simulation/Robot3DSimulation'),
  { ssr: false, loading: () => <SimulationPlaceholder /> }
);

// Floor Plan Viewer with PDF support
const FloorPlanViewer = dynamic(
  () => import('@/components/simulation/FloorPlanViewer'),
  { ssr: false, loading: () => <SimulationPlaceholder /> }
);

// ROS 2 / Gazebo Bridge
const RosBridgeConnector = dynamic(
  () => import('@/components/simulation/RosBridgeConnector'),
  { ssr: false }
);

const MapUploader = dynamic(
  () => import('@/components/simulation/MapUploader'),
  { ssr: false }
);

const ZoneDrawingTool = dynamic(
  () => import('@/components/simulation/ZoneDrawingTool'),
  { ssr: false }
);

const AITaskPlanner = dynamic(
  () => import('@/components/simulation/AITaskPlanner'),
  { ssr: false }
);

// Placeholder while loading
function SimulationPlaceholder() {
  return (
    <div className="h-[500px] bg-slate-900/50 rounded-lg flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400">Loading simulation...</p>
      </div>
    </div>
  );
}

interface UploadedMap {
  id: string;
  filePath: string;
  mapType: string;
}

interface Zone {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  capacity?: number;
  aiGenerated?: boolean;
  confidence?: number;
}

export default function SimulationPage() {
  const [uploadedMap, setUploadedMap] = useState<UploadedMap | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeTab, setActiveTab] = useState<string>('3d-robot');
  const [isAnalyzingMap, setIsAnalyzingMap] = useState(false);
  const [floorPlanImage, setFloorPlanImage] = useState<string | null>(null);

  // WebSocket connection from SimulationProvider (shared context)
  const { socket, state: simState } = useSimulation();

  // Handle file upload - store the image for ZoneDrawingTool
  const handleMapUploaded = useCallback((file: { id: string; filePath: string; mapType: string }) => {
    // Clear old zones from previous image
    setZones([]);

    // Convert /upload/ path to /api/upload/ for serving files via API route
    const apiPath = file.filePath.startsWith('/upload/')
      ? file.filePath.replace('/upload/', '/api/upload/')
      : file.filePath;
    
    setUploadedMap({
      id: file.id,
      filePath: apiPath,
      mapType: file.mapType
    });
    // Set the floor plan image for ZoneDrawingTool
    setFloorPlanImage(apiPath);
  }, []);

  // Handle AI map analysis
  const handleAnalyzeMap = useCallback(async (imageData: string): Promise<Zone[]> => {
    setIsAnalyzingMap(true);
    try {
      // Convert base64 to blob for upload
      const base64Data = imageData.split(',')[1];
      if (!base64Data) {
        console.error('Invalid image data');
        return [];
      }
      
      const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
      
      const formData = new FormData();
      formData.append('file', blob, 'map.png');
      formData.append('mapType', uploadedMap?.mapType || 'floor_plan');
      
      const response = await fetch('/api/ai/analyze-map', {
        method: 'POST',
        body: formData
      });
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        console.error('API error:', response.status, response.statusText);
        return [];
      }
      
      const text = await response.text();
      if (!text) {
        console.error('Empty response from API');
        return [];
      }
      
      const data = JSON.parse(text);
      
      if (data.success && data.analysis?.zones) {
        // Return zones as-is with percentage bounds (0-100)
        // ZoneDrawingTool will handle conversion to pixels during render
        return data.analysis.zones.map((zone: any) => ({
          ...zone,
          aiGenerated: true // Mark as AI-generated for percentage detection
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Map analysis failed:', error);
      return [];
    } finally {
      setIsAnalyzingMap(false);
    }
  }, [uploadedMap]);

  // Handle tasks created by AI
  const handleTasksCreated = useCallback((tasks: any[]) => {
    console.log('Tasks created by AI:', tasks.length);
  }, []);

  // Send AI-generated tasks to simulation via WebSocket
  const handleSendToSimulation = useCallback((tasks: any[]) => {
    if (!socket) {
      console.warn('WebSocket not connected, cannot send tasks');
      return;
    }

    for (const task of tasks) {
      if (task.objectType && task.targetZone) {
        // Find matching AVAILABLE objects by type
        const matchingObjects = simState?.objects
          ?.filter((o: any) => o.status === 'AVAILABLE' && o.type === task.objectType)
          ?.slice(0, task.quantity || 1) || [];

        // Find target zone by name (fuzzy match)
        const targetZone = simState?.zones?.find((z: any) =>
          z.name.toLowerCase().includes(task.targetZone.toLowerCase())
        );

        if (matchingObjects.length > 0 && targetZone) {
          socket.emit('task:create-bulk', {
            objectIds: matchingObjects.map((o: any) => o.id),
            targetZoneId: targetZone.id,
            autoAssign: true,
          });
        } else {
          console.warn('Could not match AI task to simulation objects:', task);
        }
      }
    }
  }, [socket, simState]);

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
              <HardHat className="w-6 h-6 text-orange-400" />
              Construction Site Simulation
            </h1>
            <p className="text-sm text-slate-400">
              Track 3: Robotic Interaction & Task Execution - Pick and Place Operations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-purple-400 border-purple-500/50">
            <Sparkles className="w-3 h-3 mr-1" />
            Gemini AI
          </Badge>
          <Badge variant="outline" className="text-orange-400 border-orange-500/50">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 border-orange-500/20">
        <CardContent className="py-2 px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Info className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white text-sm">Construction & Facilities Domain</h3>
              <p className="text-xs text-slate-400">
                AI-powered robots performing pick-and-place operations. Upload floor plans, define zones, and let Gemini AI plan tasks.
              </p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-orange-400">4</div>
                <div className="text-xs text-slate-500">Robots</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">35+</div>
                <div className="text-xs text-slate-500">Objects</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">{zones.length || 6}</div>
                <div className="text-xs text-slate-500">Zones</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 flex-1 flex flex-col">
        <TabsList className="bg-slate-900/50 border border-slate-800/30">
          <TabsTrigger value="3d-robot" className="data-[state=active]:bg-purple-600">
            <Box className="w-4 h-4 mr-1" />
            3D Robot Arm
          </TabsTrigger>
          <TabsTrigger value="floor-plan" className="data-[state=active]:bg-amber-600">
            <FileText className="w-4 h-4 mr-1" />
            Floor Plan
          </TabsTrigger>
          <TabsTrigger value="simulation" className="data-[state=active]:bg-purple-600">
            <Play className="w-4 h-4 mr-1" />
            Fleet Simulation
          </TabsTrigger>
          <TabsTrigger value="setup" className="data-[state=active]:bg-purple-600">
            <Settings2 className="w-4 h-4 mr-1" />
            Setup & Zones
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600">
            <Sparkles className="w-4 h-4 mr-1" />
            AI Planner
          </TabsTrigger>
        </TabsList>

        {/* Floor Plan Tab - Upload and view PDF/images with zone drawing */}
        <TabsContent value="floor-plan" className="flex-1 mt-0">
          <div className="h-[calc(100vh-220px)] min-h-[600px]">
            <FloorPlanViewer 
              initialZones={zones}
              onZonesUpdate={setZones}
              onAnalysisComplete={(result) => {
                console.log('Floor plan analysis:', result);
                if (result.analysis?.zones) {
                  setZones(result.analysis.zones);
                }
              }}
            />
          </div>
        </TabsContent>

        {/* 3D Robot Arm Tab - Physics-based simulation like Webots */}
        <TabsContent value="3d-robot" className="flex-1 mt-0">
          <div className="h-[calc(100vh-200px)] min-h-[650px]">
            <Robot3DSimulation
              externalZones={zones}
              canvasWidth={800}
              canvasHeight={600}
              floorPlanUrl={floorPlanImage || undefined}
            />
          </div>
        </TabsContent>

        {/* Fleet Simulation Tab */}
        <TabsContent value="simulation" className="space-y-3 mt-0">
          {/* Quick Guide */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="bg-slate-900/50 border-slate-800/20">
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-500/20">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">Click Robot</div>
                  <div className="text-[10px] text-slate-500">Select & control</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800/20">
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <div className="p-1.5 rounded bg-green-500/20">
                  <Package className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">Click Object</div>
                  <div className="text-[10px] text-slate-500">Select for task</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800/20">
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <div className="p-1.5 rounded bg-purple-500/20">
                  <Map className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">Shift + Drag</div>
                  <div className="text-[10px] text-slate-500">Pan the view</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800/20">
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <div className="p-1.5 rounded bg-orange-500/20">
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">AI Schedule</div>
                  <div className="text-[10px] text-slate-500">Auto-assign</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Uploaded Map Info */}
          {uploadedMap && (
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="py-2 px-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-white">
                    Map loaded: <span className="text-green-400">{uploadedMap.mapType}</span>
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 text-xs text-slate-400 hover:text-white"
                  onClick={() => setUploadedMap(null)}
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Simulation Canvas */}
          <div className="h-[calc(100vh-260px)] min-h-[600px]">
            <ConstructionSimulation
              width={1200}
              height={700}
              backgroundMap={uploadedMap?.filePath}
              externalZones={zones}
            />
          </div>
        </TabsContent>

        {/* Setup & Zones Tab */}
        <TabsContent value="setup" className="space-y-3 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Map Uploader */}
            <MapUploader 
              onMapUploaded={handleMapUploaded}
            />

            {/* Zone Drawing Tool */}
            <ZoneDrawingTool
              backgroundImage={uploadedMap?.filePath}
              width={800}
              height={600}
              initialZones={zones}
              onZonesChange={setZones}
              onAnalyzeWithAI={handleAnalyzeMap}
            />
          </div>

          {/* Zones Summary */}
          {zones.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800/20">
              <CardHeader className="py-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Defined Zones Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex flex-wrap gap-2">
                  {zones.map(zone => (
                    <Badge
                      key={zone.id}
                      variant="outline"
                      style={{ borderColor: zone.color, color: zone.color }}
                      className="text-xs"
                    >
                      {zone.aiGenerated && <Sparkles className="w-3 h-3 mr-1" />}
                      {zone.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Planner Tab */}
        <TabsContent value="ai" className="space-y-3 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <AITaskPlanner
              onTasksCreated={handleTasksCreated}
              onSendToSimulation={handleSendToSimulation}
            />

            {/* AI Capabilities Info */}
            <Card className="bg-slate-900/50 border-slate-800/20">
              <CardHeader className="py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Gemini AI Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-purple-500/20 mt-0.5">
                      <PenTool className="w-3 h-3 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Natural Language Task Planning</div>
                      <p className="text-xs text-slate-400">
                        Describe tasks in plain English. Gemini converts them to robot commands.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-blue-500/20 mt-0.5">
                      <Map className="w-3 h-3 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Vision Map Analysis</div>
                      <p className="text-xs text-slate-400">
                        Upload floor plans and let AI detect zones, obstacles, and pathways.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-green-500/20 mt-0.5">
                      <Bot className="w-3 h-3 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Intelligent Task Assignment</div>
                      <p className="text-xs text-slate-400">
                        AI selects the best robot for each task based on capabilities and location.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-orange-500/20 mt-0.5">
                      <Zap className="w-3 h-3 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Real-time Adaptation</div>
                      <p className="text-xs text-slate-400">
                        Robots react to environmental changes and handle failures gracefully.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-500">
                    Powered by <span className="text-purple-400">Gemini 2.0 Flash</span> • 
                    Track 3: Robotic Interaction & Task Execution
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ROS 2 / Gazebo Bridge Connector */}
            <RosBridgeConnector zones={zones} />
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
