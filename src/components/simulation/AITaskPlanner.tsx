'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Send,
  Loader2,
  Package,
  MapPin,
  Bot,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Wand2,
} from 'lucide-react';

interface Task {
  id: string;
  type: string;
  objectType?: string;
  quantity?: number;
  sourceZone?: string;
  targetZone?: string;
  priority: string;
  assignedRobotType?: string;
  reasoning: string;
  status: string;
}

interface AITaskPlannerProps {
  onTasksCreated?: (tasks: Task[]) => void;
  onSendToSimulation?: (tasks: Task[]) => void;
}

const EXAMPLE_COMMANDS = [
  "Move all steel beams from Storage A to Assembly Area",
  "Transport concrete blocks to the work zone",
  "Sort safety equipment and organize in staging area",
  "Prioritize moving pipe sections - urgent!",
  "Inspect all materials in Storage B",
];

export default function AITaskPlanner({ onTasksCreated, onSendToSimulation }: AITaskPlannerProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePlanTasks = async () => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/plan-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to plan tasks');
      }
      
      setTasks(data.tasks);
      onTasksCreated?.(data.tasks);
      setDialogOpen(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToSimulation = () => {
    onSendToSimulation?.(tasks);
    setDialogOpen(false);
    setTasks([]);
    setCommand('');
  };

  const handleExampleClick = (example: string) => {
    setCommand(example);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-400 border-red-500/50';
      case 'HIGH': return 'text-orange-400 border-orange-500/50';
      case 'NORMAL': return 'text-blue-400 border-blue-500/50';
      default: return 'text-slate-400 border-slate-500/50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PICK_AND_PLACE': return Package;
      case 'TRANSPORT': return ArrowRight;
      case 'INSPECT': return Bot;
      default: return MapPin;
    }
  };

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800/30">
        <CardHeader className="py-3 border-b border-slate-800/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            AI Task Planner
            <Badge variant="outline" className="ml-2 text-purple-400 border-purple-500/50">
              Gemini 2.0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {/* Command Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Describe what tasks you want the robots to perform..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="bg-slate-800/50 border-slate-700 min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handlePlanTasks();
                }
              }}
            />
            
            {/* Example Commands */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Lightbulb className="w-3 h-3" />
                Try these examples:
              </div>
              <div className="flex flex-wrap gap-1">
                {EXAMPLE_COMMANDS.slice(0, 3).map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs px-2 py-1 rounded bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors truncate max-w-[180px]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Plan Button */}
          <Button
            onClick={handlePlanTasks}
            disabled={!command.trim() || isProcessing}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is planning tasks...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Tasks with AI
              </>
            )}
          </Button>

          {/* Keyboard shortcut hint */}
          <p className="text-xs text-center text-slate-500">
            Press ⌘/Ctrl + Enter to generate
          </p>
        </CardContent>
      </Card>

      {/* Tasks Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              AI Generated Tasks
            </DialogTitle>
            <DialogDescription>
              Review the tasks generated by Gemini AI. You can send them to the simulation.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3 pr-4">
              {tasks.map((task, index) => {
                const TypeIcon = getTypeIcon(task.type);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-purple-500/20">
                          <TypeIcon className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="font-medium text-white">
                          {task.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getPriorityColor(task.priority)}
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      {task.objectType && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Package className="w-3 h-3" />
                          {task.objectType.replace(/_/g, ' ')}
                          {task.quantity && task.quantity > 1 && ` ×${task.quantity}`}
                        </div>
                      )}
                      {task.sourceZone && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-orange-400" />
                          From: {task.sourceZone}
                        </div>
                      )}
                      {task.targetZone && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-green-400" />
                          To: {task.targetZone}
                        </div>
                      )}
                      {task.assignedRobotType && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Bot className="w-3 h-3" />
                          {task.assignedRobotType.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 italic border-t border-slate-700/50 pt-2 mt-2">
                      💡 {task.reasoning}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendToSimulation}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Send {tasks.length} Tasks to Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
