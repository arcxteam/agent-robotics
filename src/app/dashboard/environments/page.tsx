'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  HardHat,
  Plus,
  Search,
  Map,
  MoreVertical,
  Bot,
  Zap,
  ArrowRight,
  Trash2,
  Edit,
  Building2,
  Wifi,
  WifiOff,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSimulation } from '@/lib/simulation-context';

// Single construction environment matching the actual simulation
const defaultEnvironment = {
  id: 'construction-site-alpha',
  name: 'Construction Site Alpha',
  type: 'CONSTRUCTION_SITE',
  description: 'Construction site with material handling zones and robot fleet',
  width: 1000,
  height: 800,
  robots: 4,
  activeTasks: 0,
  lastActivity: 'Not started',
  icon: Building2,
  materials: ['Steel Beams', 'Concrete Blocks', 'Cement Bags', 'Bricks'],
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'CONSTRUCTION_SITE':
      return 'bg-gradient-to-r from-orange-500 to-amber-500';
    case 'RENOVATION':
      return 'bg-gradient-to-r from-purple-500 to-pink-500';
    case 'INDUSTRIAL':
      return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    case 'MAINTENANCE':
      return 'bg-gradient-to-r from-green-500 to-emerald-500';
    case 'LIVE_SIMULATION':
      return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    default:
      return 'bg-gradient-to-r from-slate-500 to-slate-600';
  }
};

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'CONSTRUCTION_SITE':
      return 'border-orange-500/50 text-orange-400 bg-orange-500/10';
    case 'RENOVATION':
      return 'border-purple-500/50 text-purple-400 bg-purple-500/10';
    case 'INDUSTRIAL':
      return 'border-blue-500/50 text-blue-400 bg-blue-500/10';
    case 'MAINTENANCE':
      return 'border-green-500/50 text-green-400 bg-green-500/10';
    case 'LIVE_SIMULATION':
      return 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10';
    default:
      return 'border-slate-500/50 text-slate-400 bg-slate-500/10';
  }
};

export default function EnvironmentsPage() {
  const { state, isConnected } = useSimulation();
  const [searchQuery, setSearchQuery] = useState('');

  // Build live environment from simulation zones
  const liveEnvironment = useMemo(() => {
    if (!state || !isConnected || state.zones.length === 0) {
      return null;
    }

    // Create an environment from the active zones
    const uniqueTypes = [...new Set(state.objects.map(o => o.type))];
    const materialNames = uniqueTypes.slice(0, 5).map(t =>
      t.replace(/_/g, ' ').split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')
    );

    return {
      id: 'live-simulation',
      name: state.name || 'Construction Site Alpha',
      type: 'LIVE_SIMULATION',
      description: `${state.zones.length} zones, ${state.objects.length} objects, ${state.robots.length} robots`,
      width: state.dimensions?.width || 1000,
      height: state.dimensions?.height || 800,
      robots: state.robots.length,
      activeTasks: state.tasks.filter(t => t.status === 'IN_PROGRESS').length,
      lastActivity: state.status === 'RUNNING' ? 'Live' : state.status,
      icon: MapPin,
      materials: materialNames,
      zones: state.zones,
    };
  }, [state, isConnected]);

  // When connected show live env; otherwise show default
  const allEnvironments = useMemo(() => {
    if (liveEnvironment) {
      return [liveEnvironment];
    }
    return [defaultEnvironment];
  }, [liveEnvironment]);

  const filteredEnvironments = allEnvironments.filter((env) =>
    env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    env.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    env.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <span className="text-sm text-green-400">Live Environment Available</span>
            <span className="text-xs text-slate-500 ml-2">({state?.zones.length || 0} zones detected)</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">Not Connected - Go to Simulation to create environments</span>
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
            <HardHat className="w-8 h-8 text-orange-400" />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
              Construction Environments
            </span>
          </h1>
          <p className="text-slate-400">
            Track 3: Robotic Interaction & Task Execution - Construction & Facilities
          </p>
        </div>
        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white" asChild>
          <Link href="/dashboard/simulation">
            <Plus className="w-4 h-4 mr-2" />
            New Environment
          </Link>
        </Button>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search construction sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </motion.div>

      {/* Environment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEnvironments.map((env, index) => {
          const IconComponent = env.icon;
          return (
            <motion.div
              key={env.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-xl ${getTypeColor(env.type)} flex items-center justify-center mb-3 shadow-lg`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                        <DropdownMenuItem className="text-slate-300 hover:text-white">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Environment
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-slate-300 hover:text-white">
                          <Zap className="w-4 h-4 mr-2" />
                          Run Simulation
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-xl text-white">{env.name}</CardTitle>
                  <CardDescription className="text-slate-400">{env.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Type Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Type</span>
                    <Badge variant="outline" className={getTypeBadgeColor(env.type)}>
                      {env.type.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Dimensions */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Dimensions</span>
                    <span className="font-medium text-white">
                      {env.width}m × {env.height}m
                    </span>
                  </div>

                  {/* Robots & Tasks */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-slate-400">Active Robots</span>
                      </div>
                      <span className="text-xl font-bold text-white">{env.robots}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-slate-400">Active Tasks</span>
                      </div>
                      <span className="text-xl font-bold text-white">{env.activeTasks}</span>
                    </div>
                  </div>

                  {/* Materials */}
                  <div>
                    <span className="text-xs text-slate-500 mb-2 block">Materials</span>
                    <div className="flex flex-wrap gap-1">
                      {env.materials.map((material, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-slate-700 text-slate-400">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Last activity</span>
                      <span className="text-green-400">{env.lastActivity}</span>
                    </div>
                    <Link href="/dashboard/simulation">
                      <Button className="w-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30">
                        <Map className="w-4 h-4 mr-2" />
                        Open Environment
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
      {filteredEnvironments.length === 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border-2 border-slate-700">
            <HardHat className="w-12 h-12 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">No construction sites found</h3>
          <p className="text-slate-400 mb-4">
            {searchQuery ? 'Try a different search term' : 'Create your first construction environment'}
          </p>
          {!searchQuery && (
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white" asChild>
              <Link href="/dashboard/simulation">
                <Plus className="w-4 h-4 mr-2" />
                Create Construction Site
              </Link>
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
