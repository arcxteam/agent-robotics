'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Bot,
  Zap,
  Activity,
  Clock,
  Map,
  Settings,
  Play,
  Pause,
  MoreVertical,
  Battery,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Radar,
  Navigation,
  LayoutGrid,
  Sliders,
  TrendingUp,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import SimulationCanvas from '@/components/simulation/SimulationCanvas';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnvironmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // Redirect "new" to simulation page
  useEffect(() => {
    if (id === 'new') {
      router.replace('/dashboard/simulation');
    }
  }, [id, router]);
  
  // Return null while redirecting
  if (id === 'new') {
    return null;
  }
  
  const environment = {
    id: id,
    name: 'Warehouse Alpha',
    type: 'WAREHOUSE',
    description: 'Main distribution center with 200 racks',
    width: 100,
    height: 80,
    robots: 5,
    activeTasks: 12,
    completedTasks: 156,
    efficiency: 87,
    uptime: 99.2,
    lastActivity: '2 min ago',
  };

  const robotStats = [
    { id: 'Robot-01', status: 'moving', battery: 85, task: 'Task #123', progress: 67, path: 'optimal' },
    { id: 'Robot-02', status: 'idle', battery: 92, task: null, progress: 0, path: 'idle' },
    { id: 'Robot-03', status: 'charging', battery: 45, task: null, progress: 100, path: 'charging' },
    { id: 'Robot-04', status: 'picking', battery: 78, task: 'Task #125', progress: 34, path: 'optimal' },
    { id: 'Robot-05', status: 'moving', battery: 67, task: 'Task #124', progress: 89, path: 'rerouting' },
  ];

  const recentTasks = [
    { id: '#123', robot: 'Robot-01', status: 'in-progress', priority: 'high', time: '5 min' },
    { id: '#124', robot: 'Robot-05', status: 'in-progress', priority: 'normal', time: '8 min' },
    { id: '#125', robot: 'Robot-04', status: 'in-progress', priority: 'urgent', time: '3 min' },
    { id: '#122', robot: 'Robot-04', status: 'completed', priority: 'normal', time: '12 min' },
    { id: '#121', robot: 'Robot-01', status: 'completed', priority: 'high', time: '15 min' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-gradient-to-r from-red-500 to-pink-500',
      high: 'bg-gradient-to-r from-orange-500 to-yellow-500',
      normal: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      low: 'bg-gradient-to-r from-gray-500 to-slate-500',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getPathColor = (path: string) => {
    switch (path) {
      case 'optimal':
        return 'text-green-500';
      case 'rerouting':
        return 'text-yellow-500';
      case 'idle':
        return 'text-foreground/60';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/environments">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold mb-1 text-foreground">
              <span className="text-gradient-primary">{environment.name}</span>
            </h1>
            <p className="text-muted-foreground">{environment.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-gradient-primary">{environment.type}</Badge>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/60">Active Robots</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{environment.robots}</div>
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/60">Active Tasks</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{environment.activeTasks}</div>
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-foreground/60">Completed</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{environment.completedTasks}</div>
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/60">Efficiency</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{environment.efficiency}%</div>
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/60">Uptime</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{environment.uptime}%</div>
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Map className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/60">Size</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {environment.width}×{environment.height}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Canvas */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="card-gradient overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <LayoutGrid className="w-5 h-5" />
                    Live Simulation
                  </CardTitle>
                  <CardDescription className="text-foreground/70">
                    Real-time robot fleet visualization with sensors
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button className="btn-gradient-primary text-foreground" size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SimulationCanvas width={800} height={600} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Side Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {/* Robot Status */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Robot Fleet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {robotStats.map((robot) => (
                <div
                  key={robot.id}
                  className="p-3 rounded-lg bg-card border-border/30 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{robot.id}</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-medium ${getPathColor(robot.path)}`}
                      >
                        {robot.path.toUpperCase()}
                      </span>
                      <Badge
                        className={`status-${robot.status} ${
                          robot.status === 'idle' ? 'bg-muted' : ''
                        }`}
                      >
                        {robot.status.charAt(0).toUpperCase() + robot.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  {robot.task && (
                    <div className="text-sm text-foreground/70 mb-2">{robot.task}</div>
                  )}
                  <div className="flex items-center space-x-2 mb-2">
                    <Battery className="w-3 h-3 text-foreground/70" />
                    <Progress value={robot.battery} className="flex-1 h-2" />
                    <span className="text-xs text-foreground">{robot.battery}%</span>
                  </div>
                  {robot.progress > 0 && robot.progress < 100 && (
                    <div className="flex items-center space-x-2">
                      <Activity className="w-3 h-3 text-foreground/70" />
                      <Progress value={robot.progress} className="flex-1 h-2" />
                      <span className="text-xs text-foreground">{robot.progress}%</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Target className="w-5 h-5" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border-border/30"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <p className="font-medium text-sm text-foreground">{task.id}</p>
                      <p className="text-xs text-foreground/60">{task.robot}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getPriorityBadge(task.priority)}>
                      {task.priority.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-foreground/60 mt-1">{task.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Advanced Controls */}
          <Card className="card-gradient border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Advanced Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full btn-gradient-primary text-foreground" variant="outline" asChild>
                <Link href={`/dashboard/environments/${id}/pathfinding`}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Pathfinding Settings
                </Link>
              </Button>
              <Button className="w-full btn-gradient-secondary text-foreground" variant="outline" asChild>
                <Link href={`/dashboard/environments/${id}/sensors`}>
                  <Radar className="w-4 h-4 mr-2" />
                  Sensor Configuration
                </Link>
              </Button>
              <Button className="w-full text-foreground" variant="outline" asChild>
                <Link href={`/dashboard/environments/${id}/teleop`}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Teleoperation Mode
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
