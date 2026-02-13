'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Settings,
  MoreVertical,
  Search,
  Filter,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const teamMembers = [
  {
    id: '1',
    name: 'Alex Chen',
    email: 'alex@arcspatial.com',
    role: 'Owner',
    avatar: null,
    status: 'online',
    joinedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@arcspatial.com',
    role: 'Admin',
    avatar: null,
    status: 'online',
    joinedAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Mike Rodriguez',
    email: 'mike@arcspatial.com',
    role: 'Operator',
    avatar: null,
    status: 'offline',
    joinedAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Emily Wang',
    email: 'emily@arcspatial.com',
    role: 'Operator',
    avatar: null,
    status: 'online',
    joinedAt: '2024-04-05',
  },
  {
    id: '5',
    name: 'David Kim',
    email: 'david@arcspatial.com',
    role: 'Viewer',
    avatar: null,
    status: 'away',
    joinedAt: '2024-05-12',
  },
];

const roleColors: Record<string, string> = {
  Owner: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  Admin: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
  Operator: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  Viewer: 'bg-slate-600 text-white',
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-slate-500',
  away: 'bg-amber-500',
};

export default function TeamPage() {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="w-8 h-8 text-cyan-400" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage team members and their access permissions
          </p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Members</p>
                <p className="text-2xl font-bold text-white">{teamMembers.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Online Now</p>
                <p className="text-2xl font-bold text-green-400">
                  {teamMembers.filter(m => m.status === 'online').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/20">
                <div className="w-6 h-6 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Admins</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {teamMembers.filter(m => m.role === 'Admin' || m.role === 'Owner').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/20">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Operators</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {teamMembers.filter(m => m.role === 'Operator').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/20">
                <Settings className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search team members..." 
            className="pl-10 bg-slate-900/50 border-slate-700"
          />
        </div>
        <Button variant="outline" className="border-slate-700">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Team Members List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Team Members</CardTitle>
          <CardDescription>All members with access to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span 
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${statusColors[member.status]}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{member.name}</p>
                      {member.role === 'Owner' && (
                        <Crown className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={roleColors[member.role]}>
                    {member.role}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Change Role</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400">Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Pending Invitations</CardTitle>
          <CardDescription>Invitations waiting to be accepted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-slate-500">
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending invitations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
