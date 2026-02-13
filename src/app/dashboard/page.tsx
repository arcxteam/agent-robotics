'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bot,
  HardHat,
  ListTodo,
  Activity,
  TrendingUp,
  Battery,
  Map,
  Zap,
  ArrowRight,
  Package,
  CheckCircle2,
  Clock,
  Wrench,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useSimulation } from '@/lib/simulation-context';

export default function DashboardPage() {
  const { state, isConnected } = useSimulation();

  const stats = useMemo(() => {
    if (isConnected && state) {
      const activeRobots = state.robots.filter(r => r.status !== 'IDLE' && r.status !== 'CHARGING').length;
      const activeTasks = state.tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
      return [
        {
          name: 'Active Robots',
          value: `${activeRobots}/${state.robots.length}`,
          change: 'Live',
          icon: Bot,
          color: 'from-blue-500 to-cyan-500',
        },
        {
          name: 'Zones',
          value: String(state.zones.length),
          change: `${state.objects.length} objects`,
          icon: HardHat,
          color: 'from-orange-500 to-amber-500',
        },
        {
          name: 'Active Tasks',
          value: String(activeTasks),
          change: `${state.tasks.length} total`,
          icon: ListTodo,
          color: 'from-purple-500 to-pink-500',
        },
        {
          name: 'Tasks Completed',
          value: String(state.metrics.totalTasksCompleted),
          change: `${Math.round(state.metrics.fleetEfficiency * 100)}% efficiency`,
          icon: CheckCircle2,
          color: 'from-green-500 to-emerald-500',
        },
      ];
    }
    return [
      { name: 'Active Robots', value: '4', change: 'Offline', icon: Bot, color: 'from-blue-500 to-cyan-500' },
      { name: 'Zones', value: '6', change: '45 objects', icon: HardHat, color: 'from-orange-500 to-amber-500' },
      { name: 'Active Tasks', value: '0', change: 'Start simulation', icon: ListTodo, color: 'from-purple-500 to-pink-500' },
      { name: 'Tasks Completed', value: '0', change: 'No data', icon: CheckCircle2, color: 'from-green-500 to-emerald-500' },
    ];
  }, [state, isConnected]);

  const fleetStatus = useMemo(() => {
    if (isConnected && state?.robots) {
      return state.robots.map(r => {
        const task = r.currentTaskId
          ? state.tasks.find(t => t.id === r.currentTaskId)
          : null;
        const obj = task?.objectId
          ? state.objects.find(o => o.id === task.objectId)
          : null;
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          battery: Math.round(r.battery),
          task: task ? (obj ? obj.name : task.id) : (r.status === 'CHARGING' ? 'Charging' : 'Idle'),
        };
      });
    }
    return [
      { id: 'robot-mm-01', name: 'Mobile Manipulator 01', status: 'IDLE', battery: 100, task: 'Offline' },
      { id: 'robot-mm-02', name: 'Mobile Manipulator 02', status: 'IDLE', battery: 85, task: 'Offline' },
      { id: 'robot-forklift-01', name: 'Forklift 01', status: 'IDLE', battery: 90, task: 'Offline' },
      { id: 'robot-transport-01', name: 'Transport Robot 01', status: 'IDLE', battery: 75, task: 'Offline' },
    ];
  }, [state, isConnected]);

  const recentActivities = useMemo(() => {
    if (isConnected && state?.tasks && state.tasks.length > 0) {
      return state.tasks
        .filter(t => t.status === 'COMPLETED' || t.status === 'IN_PROGRESS')
        .slice(-5)
        .reverse()
        .map((t, i) => {
          const robot = state.robots.find(r => r.id === t.assignedRobotId);
          const obj = state.objects.find(o => o.id === t.objectId);
          return {
            id: i,
            robot: robot ? `${robot.id} (${robot.name})` : 'Unassigned',
            action: t.status === 'COMPLETED'
              ? `Completed: ${obj?.name || t.objectId}`
              : `Working: ${obj?.name || t.objectId}`,
            time: t.completedAt
              ? `${Math.round((Date.now() - t.completedAt) / 1000)}s ago`
              : 'In progress',
            status: t.status === 'COMPLETED' ? 'success' : 'info',
          };
        });
    }
    return [
      { id: 1, robot: 'robot-mm-01', action: 'Start simulation to see activity', time: '-', status: 'info' },
    ];
  }, [state, isConnected]);

  const quickActions = [
    {
      name: 'Run Simulation',
      description: 'Live pick & place demo',
      icon: Activity,
      href: '/dashboard/simulation',
      color: 'bg-gradient-to-r from-orange-500 to-red-500',
    },
    {
      name: 'Site Construction',
      description: 'Create environment',
      icon: HardHat,
      href: '/dashboard/environments',
      color: 'bg-gradient-to-r from-amber-500 to-orange-500',
    },
    {
      name: 'Robot Fleet',
      description: 'View all robots',
      icon: Bot,
      href: '/dashboard/robots',
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    },
    {
      name: 'View Analytics',
      description: 'Check performance',
      icon: TrendingUp,
      href: '/dashboard/analytics',
      color: 'bg-gradient-to-r from-green-500 to-emerald-500',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MOVING':
      case 'MOVING_TO_PICKUP':
      case 'MOVING_TO_DROP':
        return 'bg-blue-500';
      case 'PICKING': return 'bg-amber-500';
      case 'PLACING': return 'bg-purple-500';
      case 'CARRYING': return 'bg-green-500';
      case 'CHARGING': return 'bg-cyan-500';
      case 'IDLE': return 'bg-slate-500';
      default: return 'bg-slate-600';
    }
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
            <span className="text-sm text-green-400">Connected to Simulation Server</span>
            <span className="text-xs text-slate-500 ml-2">({state?.robots.length || 0} robots, {state?.objects.length || 0} objects)</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">Not Connected - Go to Simulation tab to start</span>
          </>
        )}
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
          <HardHat className="w-9 h-9 text-orange-400" />
          <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
            Construction & Facilities
          </span>
        </h1>
        <p className="text-slate-400">
          Track 3: Robotic Interaction & Task Execution - Pick-and-Place Operations
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.name}
                </CardTitle>
                <div className={`p-2.5 rounded-xl bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="text-green-400">{stat.change}</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-xl font-bold mb-4 text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.name} href={action.href}>
              <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-4`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{action.name}</h3>
                  <p className="text-sm text-slate-400">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Status */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bot className="w-5 h-5 text-blue-400" />
                    Fleet Status
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {isConnected ? 'Real-time robot status' : 'Start simulation for live data'}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" asChild>
                  <Link href="/dashboard/robots">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fleetStatus.map((robot) => (
                  <div
                    key={robot.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${getStatusColor(robot.status)} flex items-center justify-center`}>
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{robot.id}</p>
                        <p className="text-sm text-slate-400">{robot.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-slate-300">{robot.task}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(robot.status)}/20 text-white`}>
                          {robot.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Battery className="w-4 h-4 text-slate-500" />
                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              robot.battery > 50 ? 'bg-green-500' : robot.battery > 20 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${robot.battery}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8">{robot.battery}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-purple-400" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-slate-400">
                {isConnected ? 'Latest task events' : 'Start simulation for live events'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-amber-500' :
                      activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{activity.action}</p>
                      <p className="text-xs text-slate-500">{activity.robot}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Simulation Preview */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Map className="w-5 h-5 text-orange-400" />
                  Active Construction Site
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {isConnected
                    ? `${state?.name || 'Construction Site Alpha'} - ${state?.status || 'STOPPED'}`
                    : 'Construction Site Alpha - Start Simulation'}
                </CardDescription>
              </div>
              <Button className="bg-gradient-to-r from-cyan-500 to-red-500 hover:from-red-600 hover:to-cyan-600 text-white" asChild>
                <Link href="/dashboard/simulation">
                  <Zap className="w-4 h-4 mr-2" />
                  Open Simulation
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-orange-500/20">
                    <Package className="w-8 h-8 text-orange-400" />
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-600" />
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <Wrench className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <p className="text-slate-400">Pick-and-Place Simulation</p>
                <p className="text-sm text-slate-500 mt-1">
                  {isConnected
                    ? `${state?.objects.length || 0} objects across ${state?.zones.length || 0} zones`
                    : 'Material Storage → Assembly Area'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
