'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  ArrowLeft,
  Battery,
  Activity,
  MapPin,
  Settings,
  Zap,
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RobotDetailPage({ params }: { params: { id: string } }) {
  const robot = {
    id: params.id,
    name: params.id,
    type: 'AMR_PICKER',
    status: 'moving',
    battery: 85,
    environment: 'Warehouse Alpha',
    task: 'Task #123',
    x: 100,
    y: 100,
    capacity: 50,
    speed: 1.5,
    lastMaintenance: '30 days ago',
    uptime: 99.2,
    totalDistance: 1250.5,
    tasksCompleted: 156,
    lastActivity: '2 min ago',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'moving':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500';
      case 'picking':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500';
      case 'charging':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-pink-500';
      default:
        return 'bg-card';
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
            <Link href="/dashboard/robots">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className={`w-16 h-16 rounded-2xl ${getStatusColor(robot.status)} flex items-center justify-center`}>
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">{robot.name}</h1>
            <p className="text-lg text-foreground/70">{robot.type.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`${getStatusColor(robot.status)} text-white font-semibold`}>
            {robot.status.charAt(0).toUpperCase() + robot.status.slice(1)}
          </Badge>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Status Card */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-card border-border/30">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Status</p>
                    <p className="text-sm text-foreground/60">Current operational state</p>
                  </div>
                </div>
                <Badge className={`${getStatusColor(robot.status)} text-white font-semibold`}>
                  {robot.status.charAt(0).toUpperCase() + robot.status.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-card border-border/30">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Current Task</p>
                    <p className="text-sm text-foreground/60">Active assignment</p>
                  </div>
                </div>
                <span className="font-semibold text-foreground">{robot.task || 'None'}</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-card border-border/30">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Location</p>
                    <p className="text-sm text-foreground/60">Current coordinates</p>
                  </div>
                </div>
                <span className="font-semibold text-foreground">
                  X: {robot.x}, Y: {robot.y}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 flex items-center">
                    <Battery className="w-4 h-4 mr-1" />
                    Battery Level
                  </span>
                  <span className="font-medium text-foreground">{robot.battery}%</span>
                </div>
                <Progress value={robot.battery} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Specifications Card */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-foreground/60">Type</p>
                  <p className="font-semibold text-foreground">{robot.type.replace('_', ' ')}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground/60">Capacity</p>
                  <p className="font-semibold text-foreground">{robot.capacity} kg</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground/60">Speed</p>
                  <p className="font-semibold text-foreground">{robot.speed} m/s</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground/60">Environment</p>
                  <Link href={`/dashboard/environments/${robot.environment.toLowerCase().replace(' ', '-')}`} className="font-semibold text-primary hover:text-primary/80 hover:underline">
                    {robot.environment}
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Card */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-card border-border/30">
                  <p className="text-3xl font-bold text-foreground">{robot.tasksCompleted}</p>
                  <p className="text-sm text-foreground/60 mt-1">Tasks Completed</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card border-border/30">
                  <p className="text-3xl font-bold text-foreground">{robot.uptime}%</p>
                  <p className="text-sm text-foreground/60 mt-1">Uptime</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card border-border/30">
                  <p className="text-3xl font-bold text-foreground">{robot.totalDistance.toFixed(1)}</p>
                  <p className="text-sm text-foreground/60 mt-1">Distance (m)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Actions & History */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Quick Actions */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full btn-gradient-primary text-foreground" size="lg">
                <Play className="w-4 h-4 mr-2" />
                Start Robot
              </Button>
              <Button className="w-full btn-gradient-secondary text-foreground" variant="outline" size="lg">
                <Pause className="w-4 h-4 mr-2" />
                Pause Robot
              </Button>
              <Button className="w-full text-foreground" variant="outline">
                <Zap className="w-4 h-4 mr-2" />
                Return to Charger
              </Button>
              <Button className="w-full text-foreground" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </CardContent>
          </Card>

          {/* Maintenance Info */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Last Maintenance</span>
                <span className="font-medium text-foreground">{robot.lastMaintenance}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Next Scheduled</span>
                <span className="font-medium text-foreground">In 30 days</span>
              </div>
              <Button className="w-full text-foreground" variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Schedule Maintenance
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Robot Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">ID</span>
                <span className="font-medium text-foreground">{robot.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Last Activity</span>
                <span className="font-medium text-foreground">{robot.lastActivity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Environment</span>
                <Link href={`/dashboard/environments/${robot.environment.toLowerCase().replace(' ', '-')}`} className="font-medium text-primary hover:text-primary/80 hover:underline">
                  {robot.environment}
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="card-gradient border-red-500/20">
            <CardHeader>
              <CardTitle className="text-xl text-red-500">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full text-red-500 hover:text-red-400 border-red-500" variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Robot
              </Button>
              <Button className="w-full text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20" variant="outline">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Robot
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
