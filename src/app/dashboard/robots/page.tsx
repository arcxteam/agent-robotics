'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  Search,
  Battery,
  MoreVertical,
  Settings,
  ArrowRight,
  Edit,
  Trash2,
  Zap,
  MapPin,
  HardHat,
  Truck,
  Forklift,
  Cog,
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
import { Progress } from '@/components/ui/progress';
import { useSimulation, MOCK_ROBOTS } from '@/lib/simulation-context';

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'MOVING':
    case 'MOVING_TO_PICKUP':
    case 'MOVING_TO_DROP':
      return 'bg-blue-500';
    case 'PICKING':
      return 'bg-amber-500';
    case 'PLACING':
      return 'bg-purple-500';
    case 'CARRYING':
      return 'bg-green-500';
    case 'CHARGING':
      return 'bg-cyan-500';
    case 'IDLE':
      return 'bg-slate-500';
    case 'ERROR':
      return 'bg-red-500';
    default:
      return 'bg-slate-600';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'MOVING':
    case 'MOVING_TO_PICKUP':
    case 'MOVING_TO_DROP':
      return 'border-blue-500/50 text-blue-400 bg-blue-500/10';
    case 'PICKING':
      return 'border-amber-500/50 text-amber-400 bg-amber-500/10';
    case 'PLACING':
      return 'border-purple-500/50 text-purple-400 bg-purple-500/10';
    case 'CARRYING':
      return 'border-green-500/50 text-green-400 bg-green-500/10';
    case 'CHARGING':
      return 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10';
    case 'IDLE':
      return 'border-slate-500/50 text-slate-400 bg-slate-500/10';
    case 'ERROR':
      return 'border-red-500/50 text-red-400 bg-red-500/10';
    default:
      return 'border-slate-500/50 text-slate-400 bg-slate-500/10';
  }
};

const getRobotIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'FORKLIFT':
      return Forklift;
    case 'TRANSPORT':
    case 'AMR':
    case 'AMR_TRANSPORT':
      return Truck;
    case 'MOBILE_MANIPULATOR':
      return Bot;
    default:
      return Bot;
  }
};

const getBatteryColor = (battery: number) => {
  if (battery > 50) return 'bg-green-500';
  if (battery > 20) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function RobotsPage() {
  const { state, isConnected } = useSimulation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Use simulation data if connected, otherwise use mock data
  const robots = useMemo(() => {
    if (state?.robots && state.robots.length > 0) {
      return state.robots.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        battery: r.battery,
        environment: 'Construction Site Alpha',
        task: r.currentTaskId ? `Task ${r.currentTaskId}` : null,
        lastActivity: 'Live',
        x: r.pose.x,
        y: r.pose.y,
        capacity: 200,
        tasksCompleted: r.tasksCompleted,
        pickSuccessRate: Math.round(r.pickSuccessRate * 100),
      }));
    }
    return MOCK_ROBOTS.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      battery: r.battery,
      environment: 'Simulation Offline',
      task: r.currentTaskId,
      lastActivity: 'Offline',
      x: r.pose.x,
      y: r.pose.y,
      capacity: 200,
      tasksCompleted: r.tasksCompleted,
      pickSuccessRate: Math.round(r.pickSuccessRate * 100),
    }));
  }, [state]);

  const filteredRobots = robots.filter(
    (robot) =>
      (robot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.environment.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || robot.status.toUpperCase() === statusFilter)
  );

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-green-400' : 'text-slate-500'}`}>
        {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {isConnected ? 'Connected to Simulation Server (Live Data)' : 'Offline Mode (Mock Data)'}
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
            <Bot className="w-8 h-8 text-blue-400" />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Construction Robot Fleet
            </span>
          </h1>
          <p className="text-slate-400">
            {isConnected ? `${robots.length} robots connected • Live status from simulation` : 'Start simulation to see live robot data'}
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white" asChild>
          <Link href="/dashboard/simulation">
            <Zap className="w-4 h-4 mr-2" />
            Go to Simulation
          </Link>
        </Button>
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
            placeholder="Search robots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'MOVING', 'PICKING', 'PLACING', 'CARRYING', 'IDLE', 'CHARGING'].map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={
                statusFilter === status
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'border-slate-700 text-slate-400 hover:text-white'
              }
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-400">Total Fleet</span>
            </div>
            <div className="text-2xl font-bold text-white">{robots.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-sm text-slate-400">Active</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {robots.filter((r) => ['MOVING', 'PICKING', 'PLACING', 'CARRYING'].includes(r.status)).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-slate-400">Low Battery</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {robots.filter((r) => r.battery < 30).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardHat className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-400">Tasks Done</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {robots.reduce((sum, r) => sum + r.tasksCompleted, 0)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Robot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRobots.map((robot, index) => {
          const RobotIcon = getRobotIcon(robot.type);
          return (
            <motion.div
              key={robot.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${getStatusColor(robot.status)} flex items-center justify-center`}>
                        <RobotIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-white">{robot.name}</CardTitle>
                        <CardDescription className="text-slate-500">{robot.id} • {robot.type.replace('_', ' ')}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                        <DropdownMenuItem className="text-slate-300">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Robot
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-slate-300">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Status</span>
                    <Badge variant="outline" className={getStatusBadgeColor(robot.status)}>
                      {robot.status}
                    </Badge>
                  </div>

                  {/* Environment */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Environment</span>
                    <span className="text-sm text-orange-400">{robot.environment}</span>
                  </div>

                  {/* Current Task */}
                  {robot.task && (
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="text-xs text-slate-500 mb-1">Current Task</div>
                      <div className="text-sm text-white">{robot.task}</div>
                    </div>
                  )}

                  {/* Battery */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Battery className="w-3 h-3" />
                        Battery
                      </span>
                      <span className={robot.battery < 30 ? 'text-red-400' : 'text-white'}>{robot.battery}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getBatteryColor(robot.battery)} transition-all`}
                        style={{ width: `${robot.battery}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 rounded bg-slate-800/30">
                      <div className="text-lg font-bold text-white">{robot.tasksCompleted}</div>
                      <div className="text-xs text-slate-500">Tasks Done</div>
                    </div>
                    <div className="text-center p-2 rounded bg-slate-800/30">
                      <div className="text-lg font-bold text-green-400">{robot.pickSuccessRate}%</div>
                      <div className="text-xs text-slate-500">Success Rate</div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Position
                    </span>
                    <span className="text-slate-400">({robot.x}, {robot.y})</span>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Last activity</span>
                      <span className="text-green-400">{robot.lastActivity}</span>
                    </div>
                    <Link href="/dashboard/simulation">
                      <Button className="w-full bg-slate-800 border border-slate-700 text-white hover:bg-slate-700">
                        View in Simulation
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRobots.length === 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border-2 border-slate-700">
            <Bot className="w-12 h-12 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">No robots found</h3>
          <p className="text-slate-400 mb-4">
            {searchQuery
              ? 'Try a different search term or filter'
              : 'Deploy your first construction robot'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
