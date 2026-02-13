'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ListTodo,
  Plus,
  Search,
  MoreVertical,
  ArrowRight,
  Clock,
  MapPin,
  Bot,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Package,
  Zap,
  Send,
  Sparkles,
  HardHat,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSimulation } from '@/lib/simulation-context';

// All 17 object types matching the WebSocket server
const OBJECT_TYPES = [
  { value: 'STEEL_BEAM', label: 'Steel Beam' },
  { value: 'CONCRETE_BLOCK', label: 'Concrete Block' },
  { value: 'PIPE_SECTION', label: 'Pipe Section' },
  { value: 'ELECTRICAL_PANEL', label: 'Electrical Panel' },
  { value: 'HVAC_UNIT', label: 'HVAC Unit' },
  { value: 'TOOL_BOX', label: 'Tool Box' },
  { value: 'SAFETY_EQUIPMENT', label: 'Safety Equipment' },
  { value: 'SCAFFOLDING_PART', label: 'Scaffolding Part' },
  { value: 'CEMENT_BAG', label: 'Cement Bag' },
  { value: 'SAND_BAG', label: 'Sand Bag' },
  { value: 'CARDBOARD_BOX', label: 'Cardboard Box' },
  { value: 'BRICK_PALLET', label: 'Brick Pallet' },
  { value: 'GRAVEL_BAG', label: 'Gravel Bag' },
  { value: 'TILE_STACK', label: 'Tile Stack' },
  { value: 'WOOD_PLANK', label: 'Wood Plank' },
  { value: 'REBAR_BUNDLE', label: 'Rebar Bundle' },
  { value: 'MIXED_MATERIAL', label: 'Mixed Material' },
];

// All 6 zones matching the WebSocket server
const ZONE_OPTIONS = [
  { value: 'zone-material-storage', label: 'Material Storage' },
  { value: 'zone-assembly', label: 'Assembly Area' },
  { value: 'zone-staging', label: 'Staging Zone' },
  { value: 'zone-work-1', label: 'Work Zone A' },
  { value: 'zone-inspection', label: 'Inspection Point' },
  { value: 'zone-charging', label: 'Charging Station' },
  { value: 'zone-robot-home', label: 'Robot Home' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS':
      return 'border-blue-500/50 text-blue-400 bg-blue-500/10';
    case 'COMPLETED':
      return 'border-green-500/50 text-green-400 bg-green-500/10';
    case 'PENDING':
      return 'border-amber-500/50 text-amber-400 bg-amber-500/10';
    case 'ASSIGNED':
      return 'border-purple-500/50 text-purple-400 bg-purple-500/10';
    case 'FAILED':
      return 'border-red-500/50 text-red-400 bg-red-500/10';
    default:
      return 'border-slate-500/50 text-slate-400 bg-slate-500/10';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-500';
    case 'HIGH':
      return 'bg-orange-500';
    case 'NORMAL':
      return 'bg-blue-500';
    case 'LOW':
      return 'bg-slate-500';
    default:
      return 'bg-slate-500';
  }
};

export default function TasksPage() {
  const { state, isConnected, createTask, socket } = useSimulation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Manual task creation state
  const [newTask, setNewTask] = useState({
    type: 'PICK_AND_PLACE',
    object: '',
    sourceZone: '',
    targetZone: '',
    priority: 'NORMAL',
    description: '',
  });

  // Use simulation data if connected
  const tasks = useMemo(() => {
    if (state?.tasks && state.tasks.length > 0) {
      return state.tasks.map(t => {
        const robot = state.robots.find(r => r.id === t.assignedRobotId);
        const obj = state.objects.find(o => o.id === t.objectId);
        return {
          id: t.id,
          type: t.type,
          description: `Move ${obj?.name || t.objectId} to target zone`,
          object: obj?.name || t.objectId,
          sourceZone: t.steps[0]?.target || 'Unknown',
          targetZone: t.steps[t.steps.length - 1]?.target || 'Unknown',
          priority: 'NORMAL',
          status: t.status,
          robot: robot ? `${robot.id} (${robot.name})` : null,
          progress: Math.round((t.currentStep / Math.max(t.steps.length, 1)) * 100),
          estimatedTime: '~2 min',
          createdAt: new Date(t.createdAt).toLocaleTimeString(),
          aiScore: 0.9,
        };
      });
    }
    // Return empty array when not connected - user should go to simulation
    return [];
  }, [state]);

  const filteredTasks = tasks.filter(
    (task) =>
      (task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.robot?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || task.status.toUpperCase() === statusFilter.toUpperCase())
  );

  const handleAICreateTask = async () => {
    if (!aiPrompt.trim()) return;

    setIsAIProcessing(true);
    try {
      const res = await fetch('/api/ai/plan-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: aiPrompt }),
      });
      const data = await res.json();

      if (data.success && data.tasks && socket) {
        for (const task of data.tasks) {
          // Find available objects matching the type
          const matchingObjects = state?.objects
            ?.filter((o: any) => o.status === 'AVAILABLE' && o.type === task.objectType)
            ?.slice(0, task.quantity || 1) || [];

          const targetZoneId = task.targetZone || 'zone-assembly';

          if (matchingObjects.length > 0) {
            for (const obj of matchingObjects) {
              createTask(obj.id, targetZoneId);
            }
          }
        }
      }
    } catch (err) {
      console.error('AI task creation failed:', err);
    }
    setIsAIProcessing(false);
    setAiPrompt('');
    setDialogOpen(false);
  };

  const handleManualCreateTask = async () => {
    if (!newTask.object || !newTask.targetZone) return;

    setIsCreatingTask(true);
    try {
      if (isConnected && state?.objects) {
        // Find an AVAILABLE object of the selected type, preferring objects in the source zone
        const availableObjects = state.objects.filter(
          (o: any) => o.status === 'AVAILABLE' && o.type === newTask.object
        );

        if (availableObjects.length > 0) {
          createTask(availableObjects[0].id, newTask.targetZone);
        }
      }
    } catch (err) {
      console.error('Manual task creation failed:', err);
    }
    setIsCreatingTask(false);
    setDialogOpen(false);
    setNewTask({
      type: 'PICK_AND_PLACE',
      object: '',
      sourceZone: '',
      targetZone: '',
      priority: 'NORMAL',
      description: '',
    });
  };

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
        isConnected 
          ? 'bg-green-500/10 border border-green-500/30' 
          : 'bg-yellow-500/10 border border-yellow-500/30'
      }`}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Connected to Simulation</span>
            <span className="text-xs text-slate-500 ml-2">({tasks.length} tasks)</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">Not Connected - Go to Simulation tab to run tasks</span>
          </>
        )}
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-purple-400" />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              Construction Tasks
            </span>
          </h1>
          <p className="text-slate-400">
            Track 3: Pick-and-Place & Material Handling Operations
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Create New Task
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Use AI to generate tasks from natural language or create manually
              </DialogDescription>
            </DialogHeader>
            
            {/* AI Task Creation */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                <Label className="text-purple-400 flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  AI Task Planning (Gemini 2.0 Flash)
                </Label>
                <Textarea
                  placeholder="Describe the task in natural language, e.g., 'Move all steel beams from storage to the assembly area, prioritize the larger ones first'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                />
                <Button 
                  onClick={handleAICreateTask}
                  disabled={isAIProcessing || !aiPrompt.trim()}
                  className="mt-3 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isAIProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">Or create manually</span>
                </div>
              </div>

              {/* Manual Task Creation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">Task Type</Label>
                  <Select value={newTask.type} onValueChange={(v) => setNewTask({...newTask, type: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="PICK_AND_PLACE">Pick & Place</SelectItem>
                      <SelectItem value="TRANSPORT">Transport</SelectItem>
                      <SelectItem value="SORT_MATERIALS">Sort Materials</SelectItem>
                      <SelectItem value="ASSEMBLE">Assemble</SelectItem>
                      <SelectItem value="INSPECT">Inspect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400">Object to Pick</Label>
                  <Select value={newTask.object} onValueChange={(v) => setNewTask({...newTask, object: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select object..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      {OBJECT_TYPES.map((obj) => {
                        const count = state?.objects?.filter(
                          (o: any) => o.status === 'AVAILABLE' && o.type === obj.value
                        ).length || 0;
                        return (
                          <SelectItem key={obj.value} value={obj.value}>
                            {obj.label}{isConnected ? ` (${count})` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400">Source Zone</Label>
                  <Select value={newTask.sourceZone} onValueChange={(v) => setNewTask({...newTask, sourceZone: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select zone..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {ZONE_OPTIONS.map((zone) => (
                        <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-slate-400">Target Zone</Label>
                  <Select value={newTask.targetZone} onValueChange={(v) => setNewTask({...newTask, targetZone: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {ZONE_OPTIONS.map((zone) => (
                        <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-slate-400">Description (Optional)</Label>
                  <Textarea
                    placeholder="Additional task details..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <Button 
                onClick={handleManualCreateTask}
                disabled={isCreatingTask || !newTask.object || !newTask.sourceZone || !newTask.targetZone}
                className="w-full bg-slate-700 hover:bg-slate-600"
              >
                {isCreatingTask ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task Manually
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={
                statusFilter === status
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                  : 'border-slate-700 text-slate-400 hover:text-white'
              }
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ListTodo className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-400">Total Tasks</span>
            </div>
            <div className="text-2xl font-bold text-white">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-400">In Progress</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {tasks.filter(t => t.status === 'IN_PROGRESS').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-slate-400">Pending</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {tasks.filter(t => t.status === 'PENDING' || t.status === 'ASSIGNED').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-slate-400">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {tasks.filter(t => t.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Task Cards */}
      <div className="space-y-4">
        {filteredTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Task Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      <span className="text-sm font-mono text-slate-500">{task.id}</span>
                      <Badge variant="outline" className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="border-slate-700 text-slate-400">
                        {task.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-white font-medium">{task.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-400" />
                        <span className="text-slate-400">{task.object}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-400" />
                        <span className="text-slate-400">{task.sourceZone} → {task.targetZone}</span>
                      </div>
                    </div>

                    {task.robot && (
                      <div className="flex items-center gap-2 text-sm">
                        <Bot className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400">{task.robot}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Progress & Actions */}
                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2 justify-end">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-purple-400">AI Score: {(task.aiScore * 100).toFixed(0)}%</span>
                    </div>
                    
                    {task.status === 'IN_PROGRESS' && (
                      <div className="w-32">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1 justify-end text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>~{task.estimatedTime}</span>
                    </div>
                    
                    <span className="text-xs text-slate-600">{task.createdAt}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border-2 border-slate-700">
            <ListTodo className="w-12 h-12 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">No tasks found</h3>
          <p className="text-slate-400 mb-4">
            {searchQuery ? 'Try a different search term' : 'Create your first construction task'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
