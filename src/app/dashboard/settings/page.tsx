'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Webhook,
  Save,
  RefreshCw,
  AlertTriangle,
  Copy,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  status: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered: string | null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyValue, setNewApiKeyValue] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  
  // Webhook form state
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  
  // Database config state
  const [dbConfig, setDbConfig] = useState({
    type: 'postgresql',
    host: 'c6gderjfne3u74.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com',
    port: '5432',
    database: 'arcspatial',
    username: 'admin',
    password: ''
  });

  // Fetch API keys on mount
  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/settings/api-keys');
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/settings/webhooks');
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    }
  };

  const createApiKey = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newApiKeyName || 'New API Key' })
      });
      const data = await res.json();
      if (data.success) {
        setNewApiKeyValue(data.data.key);
        setShowNewKey(true);
        fetchApiKeys();
        toast({
          title: 'API Key Created',
          description: 'Make sure to copy your key now. It won\'t be shown again.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setNewApiKeyName('');
    }
  };

  const regenerateApiKey = async (keyId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/api-keys?id=${keyId}&action=regenerate`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        setNewApiKeyValue(data.data.key);
        setShowNewKey(true);
        fetchApiKeys();
        toast({
          title: 'API Key Regenerated',
          description: 'Your new key has been generated. Copy it now.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to regenerate API key',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/settings/api-keys?id=${keyId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchApiKeys();
        toast({
          title: 'API Key Deleted',
          description: 'The API key has been permanently deleted.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete API key',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Key copied to clipboard',
    });
  };

  const createWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: 'Error',
        description: 'Webhook URL is required',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: webhookName || 'Webhook',
          url: webhookUrl,
          events: ['task.completed', 'robot.status', 'simulation.finished']
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewWebhookSecret(data.data.secret);
        fetchWebhooks();
        toast({
          title: 'Webhook Created',
          description: 'Save your webhook secret - it won\'t be shown again.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create webhook',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      const res = await fetch(`/api/settings/webhooks?id=${webhookId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchWebhooks();
        toast({
          title: 'Webhook Deleted',
          description: 'The webhook has been removed.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive'
      });
    }
  };

  const testWebhook = async (webhookId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/webhooks?id=${webhookId}`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        fetchWebhooks();
        toast({
          title: 'Test Sent',
          description: 'Test event sent to webhook endpoint.',
        });
      } else {
        toast({
          title: 'Test Failed',
          description: data.error || 'Failed to send test event',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to test webhook',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    setTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test',
          config: {
            type: dbConfig.type,
            host: dbConfig.host,
            port: parseInt(dbConfig.port),
            database: dbConfig.database,
            username: dbConfig.username,
            password: dbConfig.password
          }
        })
      });
      const data = await res.json();
      setDbTestResult({ 
        success: data.success, 
        message: data.success ? data.message : data.error 
      });
      
      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: `Connected to ${dbConfig.type} (${data.data?.latency}ms latency)`,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch {
      setDbTestResult({ success: false, message: 'Network error' });
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive'
      });
    } finally {
      setTestingDb(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
          <Settings className="w-8 h-8 text-cyan-400" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your Arc Spatial platform preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-slate-800">
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-800">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-800">
            Security
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-slate-800">
            API & Integrations
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                General Settings
              </CardTitle>
              <CardDescription>Basic configuration for your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input 
                    id="workspace-name" 
                    defaultValue="Arc Spatial Construction" 
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      <SelectItem value="cet">Central European (CET)</SelectItem>
                      <SelectItem value="jst">Japan Standard (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-slate-800" />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Simulation Defaults</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="default-speed">Default Simulation Speed</Label>
                    <Select defaultValue="1x">
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="0.5x">0.5x (Slow)</SelectItem>
                        <SelectItem value="1x">1x (Normal)</SelectItem>
                        <SelectItem value="2x">2x (Fast)</SelectItem>
                        <SelectItem value="4x">4x (Very Fast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physics-engine">Physics Engine</Label>
                    <Select defaultValue="builtin">
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="builtin">Built-in (Recommended)</SelectItem>
                        <SelectItem value="bullet">Bullet Physics</SelectItem>
                        <SelectItem value="ode">ODE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-cyan-400" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how Arc Spatial looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Dark Mode</p>
                  <p className="text-sm text-slate-400">Use dark theme across the platform</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Reduce Motion</p>
                  <p className="text-sm text-slate-400">Minimize animations and transitions</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Compact View</p>
                  <p className="text-sm text-slate-400">Use smaller spacing and font sizes</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Task Completion Alerts</p>
                  <p className="text-sm text-slate-400">Get notified when robots complete tasks</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Error Notifications</p>
                  <p className="text-sm text-slate-400">Alerts for robot errors or failures</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Simulation Updates</p>
                  <p className="text-sm text-slate-400">Updates about simulation status changes</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Team Activity</p>
                  <p className="text-sm text-slate-400">Notifications about team member actions</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Weekly Reports</p>
                  <p className="text-sm text-slate-400">Receive weekly performance summaries</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-400">Add an extra layer of security</p>
                </div>
                <Button variant="outline" className="border-slate-700">
                  Enable 2FA
                </Button>
              </div>
              <Separator className="bg-slate-800" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Session Timeout</p>
                  <p className="text-sm text-slate-400">Automatically log out after inactivity</p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator className="bg-slate-800" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Active Sessions</p>
                  <p className="text-sm text-slate-400">Manage your active login sessions</p>
                </div>
                <Button variant="outline" className="border-slate-700">
                  View Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Reset Workspace</p>
                  <p className="text-sm text-slate-400">Clear all simulation data and settings</p>
                </div>
                <Button variant="destructive">
                  Reset
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Delete Workspace</p>
                  <p className="text-sm text-slate-400">Permanently delete this workspace</p>
                </div>
                <Button variant="destructive">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API & Integrations */}
        <TabsContent value="api" className="space-y-6">
          {/* API Keys */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                API Keys
              </CardTitle>
              <CardDescription>Manage API keys for external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Keys */}
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 rounded-lg bg-slate-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{key.name}</p>
                      <p className="text-sm text-slate-400">
                        Created on {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-700"
                        onClick={() => regenerateApiKey(key.id)}
                        disabled={loading}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-red-700 text-red-400 hover:bg-red-900/20"
                        onClick={() => deleteApiKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <code className="block p-3 rounded bg-slate-900 text-green-400 font-mono text-sm">
                    {key.key}
                  </code>
                </div>
              ))}

              {/* New Key Dialog */}
              <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      API Key Created
                    </DialogTitle>
                    <DialogDescription>
                      Copy your new API key now. It won&apos;t be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-slate-800 border border-green-500/30">
                      <code className="text-green-400 font-mono text-sm break-all">
                        {newApiKeyValue}
                      </code>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (newApiKeyValue) copyToClipboard(newApiKeyValue);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setShowNewKey(false);
                      setNewApiKeyValue(null);
                    }}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create New Key */}
              <div className="flex gap-2">
                <Input
                  placeholder="API Key Name (optional)"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
                <Button 
                  className="whitespace-nowrap border-slate-700" 
                  variant="outline"
                  onClick={createApiKey}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create API Key
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Webhook className="w-5 h-5 text-pink-400" />
                Webhooks
              </CardTitle>
              <CardDescription>Configure webhook endpoints for real-time events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {webhooks.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <div className="text-center">
                    <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No webhooks configured</p>
                  </div>
                </div>
              ) : (
                webhooks.map((webhook) => (
                  <div key={webhook.id} className="p-4 rounded-lg bg-slate-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{webhook.name}</p>
                          <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'}>
                            {webhook.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 font-mono">{webhook.url}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-slate-700"
                          onClick={() => testWebhook(webhook.id)}
                          disabled={loading}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Test
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-700 text-red-400 hover:bg-red-900/20"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    {webhook.lastTriggered && (
                      <p className="text-xs text-slate-500">
                        Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}

              {/* New Webhook Secret Dialog */}
              <Dialog open={!!newWebhookSecret} onOpenChange={() => setNewWebhookSecret(null)}>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Webhook Created
                    </DialogTitle>
                    <DialogDescription>
                      Copy your webhook secret now. It won&apos;t be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-slate-800 border border-green-500/30">
                      <code className="text-green-400 font-mono text-sm break-all">
                        {newWebhookSecret}
                      </code>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (newWebhookSecret) copyToClipboard(newWebhookSecret);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Secret
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setNewWebhookSecret(null);
                      setWebhookName('');
                      setWebhookUrl('');
                    }}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add Webhook Form */}
              <div className="space-y-3 p-4 rounded-lg border border-dashed border-slate-700">
                <h4 className="text-sm font-medium text-white">Add New Webhook</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Webhook name"
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                  <Input
                    placeholder="https://your-endpoint.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={createWebhook}
                  disabled={loading || !webhookUrl}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Webhook
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Database Connection */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-400" />
                Database Connection
              </CardTitle>
              <CardDescription>Configure external database connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Database Type</Label>
                  <Select 
                    value={dbConfig.type} 
                    onValueChange={(v) => setDbConfig({...dbConfig, type: v})}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Host</Label>
                  <Input 
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input 
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({...dbConfig, port: e.target.value})}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Database</Label>
                  <Input 
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    value={dbConfig.username}
                    onChange={(e) => setDbConfig({...dbConfig, username: e.target.value})}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password"
                  placeholder="Enter password"
                  value={dbConfig.password}
                  onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              
              {/* Test Result */}
              {dbTestResult && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  dbTestResult.success 
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {dbTestResult.success ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{dbTestResult.message}</span>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="border-slate-700"
                  onClick={testDatabaseConnection}
                  disabled={testingDb}
                >
                  {testingDb ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" className="border-slate-700">
          Cancel
        </Button>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </motion.div>
  );
}
