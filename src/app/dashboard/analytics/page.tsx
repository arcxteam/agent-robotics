'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  Clock,
  CheckCircle2,
  Bot,
  Zap,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Package,
  HardHat,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSimulation } from '@/lib/simulation-context';

export default function AnalyticsPage() {
  const { state, isConnected } = useSimulation();

  // Calculate live stats from simulation data
  const liveStats = useMemo(() => {
    if (!state || !isConnected) {
      return null;
    }

    const completedTasks = state.tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = state.tasks.length;
    const activeRobots = state.robots.filter(r => r.status !== 'IDLE' && r.status !== 'ERROR').length;
    const totalRobots = state.robots.length;

    return {
      tasksCompleted: completedTasks,
      totalTasks,
      failedTasks: state.tasks.filter(t => t.status === 'FAILED').length,
      successRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      activeRobots,
      totalRobots,
      utilization: totalRobots > 0 ? Math.round((activeRobots / totalRobots) * 100) : 0,
      objectsDetected: state.objects.length,
      zonesActive: state.zones.length,
      fleetEfficiency: state.metrics ? Math.round(state.metrics.fleetEfficiency * 100) : 0,
      avgTaskTime: state.metrics ? state.metrics.averageTaskTime.toFixed(1) : '0',
      pickSuccessRate: state.metrics ? Math.round(state.metrics.pickSuccessRate * 100) : 0,
    };
  }, [state, isConnected]);
  // Task throughput: pipeline status breakdown from live simulation
  const taskThroughputData = useMemo(() => {
    if (isConnected && state?.tasks && state.tasks.length > 0) {
      const pickPlaceTasks = state.tasks.filter(t => t.type === 'PICK_AND_PLACE');
      const otherTasks = state.tasks.filter(t => t.type !== 'PICK_AND_PLACE');

      return [
        { time: 'Pending', pickPlace: pickPlaceTasks.filter(t => t.status === 'PENDING').length, transport: otherTasks.filter(t => t.status === 'PENDING').length },
        { time: 'Assigned', pickPlace: pickPlaceTasks.filter(t => t.status === 'ASSIGNED').length, transport: otherTasks.filter(t => t.status === 'ASSIGNED').length },
        { time: 'Active', pickPlace: pickPlaceTasks.filter(t => t.status === 'IN_PROGRESS').length, transport: otherTasks.filter(t => t.status === 'IN_PROGRESS').length },
        { time: 'Done', pickPlace: pickPlaceTasks.filter(t => t.status === 'COMPLETED').length, transport: otherTasks.filter(t => t.status === 'COMPLETED').length },
        { time: 'Failed', pickPlace: pickPlaceTasks.filter(t => t.status === 'FAILED').length, transport: otherTasks.filter(t => t.status === 'FAILED').length },
      ];
    }
    return [
      { time: 'Pending', pickPlace: 0, transport: 0 },
      { time: 'Active', pickPlace: 0, transport: 0 },
      { time: 'Done', pickPlace: 0, transport: 0 },
    ];
  }, [state, isConnected]);

  const robotPerformanceData = useMemo(() => {
    const abbreviateRobotId = (id: string): string => {
      // robot-mm-01 → MM-01, robot-forklift-01 → FK-01, robot-transport-01 → TR-01
      return id.replace('robot-', '')
        .replace('forklift', 'FK')
        .replace('transport', 'TR')
        .replace('mm', 'MM')
        .toUpperCase();
    };

    if (isConnected && state?.robots) {
      return state.robots.map(r => ({
        name: abbreviateRobotId(r.id),
        utilization: Math.round(r.distanceTraveled > 0 ? Math.min(95, 50 + r.tasksCompleted * 10) : 0),
        tasks: r.tasksCompleted,
        successRate: Math.round(r.pickSuccessRate * 100) || 0,
      }));
    }
    return [
      { name: 'MM-01', utilization: 0, tasks: 0, successRate: 0 },
      { name: 'MM-02', utilization: 0, tasks: 0, successRate: 0 },
      { name: 'FK-01', utilization: 0, tasks: 0, successRate: 0 },
      { name: 'TR-01', utilization: 0, tasks: 0, successRate: 0 },
    ];
  }, [state, isConnected]);

  // Material inventory: group objects by type from live simulation
  const materialHandlingData = useMemo(() => {
    if (isConnected && state?.objects && state.objects.length > 0) {
      const typeCounts: Record<string, number> = {};
      state.objects.forEach(obj => {
        const label = obj.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        typeCounts[label] = (typeCounts[label] || 0) + 1;
      });
      return Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
    }
    return [
      { name: 'No data', count: 0 },
    ];
  }, [state, isConnected]);

  const taskTypeDistribution = useMemo(() => {
    if (isConnected && state?.tasks && state.tasks.length > 0) {
      const typeCounts: Record<string, number> = {};
      state.tasks.forEach(t => {
        const label = t.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        typeCounts[label] = (typeCounts[label] || 0) + 1;
      });
      const typeColors: Record<string, string> = {
        'Pick And Place': '#f97316', 'Transport': '#3b82f6', 'Sort Materials': '#8b5cf6',
        'Assemble': '#22c55e', 'Inspect': '#06b6d4', 'Charge': '#eab308',
      };
      return Object.entries(typeCounts).map(([name, value]) => ({
        name, value, color: typeColors[name] || '#6b7280',
      }));
    }
    return [
      { name: 'Pick & Place', value: 48, color: '#f97316' },
      { name: 'Transport', value: 28, color: '#3b82f6' },
      { name: 'Sort Materials', value: 12, color: '#8b5cf6' },
      { name: 'Assembly', value: 8, color: '#22c55e' },
      { name: 'Inspection', value: 4, color: '#06b6d4' },
    ];
  }, [state, isConnected]);

  const zoneActivityData = useMemo(() => {
    if (isConnected && state?.zones) {
      return state.zones
        .filter(z => z.type !== 'CHARGING_STATION')
        .map(z => ({
          zone: z.name,
          pickups: z.objects?.length || z.currentOccupancy || 0,
          dropoffs: state.tasks.filter(t => t.targetZone === z.id && t.status === 'COMPLETED').length,
        }));
    }
    return [
      { zone: 'Material Storage', pickups: 0, dropoffs: 0 },
      { zone: 'Assembly Area', pickups: 0, dropoffs: 0 },
      { zone: 'Staging Zone', pickups: 0, dropoffs: 0 },
      { zone: 'Work Zone A', pickups: 0, dropoffs: 0 },
      { zone: 'Inspection Point', pickups: 0, dropoffs: 0 },
    ];
  }, [state, isConnected]);

  // Fallback stats when disconnected (zeros, not fake data)
  const fallbackStats = [
    {
      name: 'Tasks Completed',
      value: '0',
      change: 'Offline',
      trend: 'up' as const,
      icon: Package,
      color: 'from-orange-500 to-amber-500',
    },
    {
      name: 'Objects Detected',
      value: '0',
      change: 'Offline',
      trend: 'up' as const,
      icon: Clock,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Success Rate',
      value: '0%',
      change: 'Offline',
      trend: 'up' as const,
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Fleet Utilization',
      value: '0%',
      change: 'Offline',
      trend: 'up' as const,
      icon: Bot,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  // Use live stats if connected
  const displayStats = useMemo(() => {
    if (liveStats) {
      return [
        {
          name: 'Tasks Completed',
          value: liveStats.tasksCompleted.toString(),
          change: `${liveStats.totalTasks} total`,
          trend: 'up',
          icon: Package,
          color: 'from-orange-500 to-amber-500',
        },
        {
          name: 'Objects Detected',
          value: liveStats.objectsDetected.toString(),
          change: 'AI detected',
          trend: 'up',
          icon: Clock,
          color: 'from-blue-500 to-cyan-500',
        },
        {
          name: 'Success Rate',
          value: `${liveStats.successRate}%`,
          change: 'Live',
          trend: 'up',
          icon: CheckCircle2,
          color: 'from-green-500 to-emerald-500',
        },
        {
          name: 'Fleet Utilization',
          value: `${liveStats.utilization}%`,
          change: `${liveStats.activeRobots}/${liveStats.totalRobots} active`,
          trend: 'up',
          icon: Bot,
          color: 'from-purple-500 to-pink-500',
        },
      ];
    }
    return fallbackStats;
  }, [liveStats]);

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
            <span className="text-sm text-green-400">Live Analytics from Simulation</span>
            <span className="text-xs text-slate-500 ml-2">({liveStats?.zonesActive || 0} zones active)</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">Showing sample data - Go to Simulation tab for live metrics</span>
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
          <BarChart3 className="w-8 h-8 text-green-400" />
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Construction Analytics
          </span>
        </h1>
        <p className="text-slate-400">
          Track 3: Performance metrics for pick-and-place operations
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-blue-400'}`}>
                    {stat.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {stat.change}
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <p className="text-sm text-slate-400 mt-1">{stat.name}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Throughput */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-400" />
                Task Throughput
              </CardTitle>
              <CardDescription className="text-slate-400">Pick & Place vs Other tasks by pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={taskThroughputData}>
                    <defs>
                      <linearGradient id="colorPickPlace" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTransport" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Area type="monotone" dataKey="pickPlace" stroke="#f97316" fill="url(#colorPickPlace)" name="Pick & Place" />
                    <Area type="monotone" dataKey="transport" stroke="#3b82f6" fill="url(#colorTransport)" name="Other Tasks" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Task Distribution */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Task Type Distribution
              </CardTitle>
              <CardDescription className="text-slate-400">Breakdown by task category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {taskTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {taskTypeDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Robot Performance */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                Robot Performance
              </CardTitle>
              <CardDescription className="text-slate-400">Utilization and success rates by robot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={robotPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" width={50} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="successRate" fill="#22c55e" name="Success Rate %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Material Handling */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-400" />
                Material Inventory
              </CardTitle>
              <CardDescription className="text-slate-400">Objects by type in simulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={materialHandlingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" angle={-25} textAnchor="end" height={60} fontSize={11} />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="count" fill="#f97316" name="Count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Zone Activity */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Zone Activity Summary</CardTitle>
            <CardDescription className="text-slate-400">Pickups and dropoffs per zone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {zoneActivityData.map((zone) => (
                <div key={zone.zone} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <h4 className="font-medium text-white text-sm mb-3">{zone.zone}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-400">Pickups</span>
                      <span className="text-white font-bold">{zone.pickups}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Dropoffs</span>
                      <span className="text-white font-bold">{zone.dropoffs}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
