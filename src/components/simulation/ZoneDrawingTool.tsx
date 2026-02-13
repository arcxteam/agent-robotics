'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Square,
  Trash2,
  Save,
  Undo,
  Sparkles,
  Loader2,
  MousePointer2,
  Move,
  PenTool,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// Zone types with colors
const ZONE_TYPES = [
  { value: 'MATERIAL_STORAGE', label: 'Material Storage', color: '#6366f1' },
  { value: 'ASSEMBLY_AREA', label: 'Assembly Area', color: '#22c55e' },
  { value: 'STAGING_ZONE', label: 'Staging Zone', color: '#f59e0b' },
  { value: 'WORK_ZONE', label: 'Work Zone', color: '#8b5cf6' },
  { value: 'RESTRICTED_AREA', label: 'Restricted Area', color: '#ef4444' },
  { value: 'CHARGING_STATION', label: 'Charging Station', color: '#06b6d4' },
  { value: 'ROBOT_HOME', label: 'Robot Home', color: '#10b981' },
  { value: 'INSPECTION_POINT', label: 'Inspection Point', color: '#ec4899' },
];

interface Zone {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  capacity?: number;
  aiGenerated?: boolean;
  confidence?: number;
}

interface ZoneDrawingToolProps {
  backgroundImage?: string;
  width?: number;
  height?: number;
  initialZones?: Zone[];
  onZonesChange?: (zones: Zone[]) => void;
  onAnalyzeWithAI?: (imageData: string) => Promise<Zone[]>;
}

type Tool = 'select' | 'draw' | 'move';

export default function ZoneDrawingTool({
  backgroundImage,
  width = 800,
  height = 600,
  initialZones = [],
  onZonesChange,
  onAnalyzeWithAI
}: ZoneDrawingToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showZones, setShowZones] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newZoneType, setNewZoneType] = useState('MATERIAL_STORAGE');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [history, setHistory] = useState<Zone[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Load background image
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
        drawCanvas();
      };
      img.src = backgroundImage;
    }
  }, [backgroundImage]);

  // Notify parent of changes
  useEffect(() => {
    onZonesChange?.(zones);
  }, [zones, onZonesChange]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background image if available
    if (bgImageRef.current) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    } else {
      // Draw a better placeholder floor plan visualization when no background
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 2;
      
      // Draw some room outlines as placeholder
      const rooms = [
        { x: 50, y: 50, w: 200, h: 180, label: 'Room A' },
        { x: 280, y: 50, w: 220, h: 180, label: 'Room B' },
        { x: 530, y: 50, w: 200, h: 180, label: 'Room C' },
        { x: 50, y: 260, w: 150, h: 150, label: 'Storage' },
        { x: 230, y: 260, w: 270, h: 150, label: 'Work Area' },
        { x: 530, y: 260, w: 200, h: 150, label: 'Assembly' },
        { x: 50, y: 440, w: 680, h: 120, label: 'Corridor' },
      ];
      
      rooms.forEach(room => {
        // Room outline
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(room.x, room.y, room.w, room.h);
        ctx.setLineDash([]);
        
        // Room label
        ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.label, room.x + room.w / 2, room.y + room.h / 2 + 5);
      });
    }

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw zones
    if (showZones) {
      for (const zone of zones) {
        const isSelected = selectedZone === zone.id;
        
        // Convert percentage bounds to pixel bounds if needed
        // AI-generated zones use percentage (0-100), manually drawn use pixel
        const isPercentage = zone.aiGenerated || 
          (zone.bounds.x <= 100 && zone.bounds.y <= 100 && 
           zone.bounds.width <= 100 && zone.bounds.height <= 100 &&
           zone.bounds.x + zone.bounds.width <= 100 &&
           zone.bounds.y + zone.bounds.height <= 100);
        
        const bounds = isPercentage ? {
          x: (zone.bounds.x / 100) * canvas.width,
          y: (zone.bounds.y / 100) * canvas.height,
          width: (zone.bounds.width / 100) * canvas.width,
          height: (zone.bounds.height / 100) * canvas.height
        } : zone.bounds;
        
        // Fill
        ctx.fillStyle = zone.color + '40'; // 25% opacity
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Border
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // AI generated badge
        if (zone.aiGenerated) {
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(bounds.x + 12, bounds.y + 12, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('AI', bounds.x + 12, bounds.y + 15);
        }
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          zone.name,
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2
        );
        
        // Type label
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = zone.color;
        ctx.fillText(
          zone.type.replace(/_/g, ' '),
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2 + 14
        );
        
        // Selection handles
        if (isSelected) {
          const handles = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
          ];
          ctx.fillStyle = '#ffffff';
          for (const handle of handles) {
            ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
          }
        }
      }
    }

    // Draw current rectangle being drawn
    if (currentRect) {
      const typeColor = ZONE_TYPES.find(t => t.value === newZoneType)?.color || '#6366f1';
      ctx.fillStyle = typeColor + '30';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.strokeStyle = typeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.setLineDash([]);
    }
  }, [zones, selectedZone, showZones, currentRect, newZoneType]);

  // Redraw on changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // Find zone at position (handles both percentage and pixel bounds)
  const findZoneAtPosition = useCallback((pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    for (let i = zones.length - 1; i >= 0; i--) {
      const zone = zones[i];
      
      // Check if bounds are in percentage (AI-generated) or pixels (manual)
      const isPercentage = zone.aiGenerated || 
        (zone.bounds.x <= 100 && zone.bounds.y <= 100 && 
         zone.bounds.width <= 100 && zone.bounds.height <= 100 &&
         zone.bounds.x + zone.bounds.width <= 100 &&
         zone.bounds.y + zone.bounds.height <= 100);
      
      const bounds = isPercentage ? {
        x: (zone.bounds.x / 100) * canvas.width,
        y: (zone.bounds.y / 100) * canvas.height,
        width: (zone.bounds.width / 100) * canvas.width,
        height: (zone.bounds.height / 100) * canvas.height
      } : zone.bounds;
      
      if (
        pos.x >= bounds.x &&
        pos.x <= bounds.x + bounds.width &&
        pos.y >= bounds.y &&
        pos.y <= bounds.y + bounds.height
      ) {
        return zone;
      }
    }
    return null;
  }, [zones]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    
    if (tool === 'select') {
      const zone = findZoneAtPosition(pos);
      setSelectedZone(zone?.id || null);
    } else if (tool === 'draw') {
      setIsDrawing(true);
      setDrawStart(pos);
      setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    }
  }, [tool, getMousePos, findZoneAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    
    const pos = getMousePos(e);
    const width = pos.x - drawStart.x;
    const height = pos.y - drawStart.y;
    
    setCurrentRect({
      x: width > 0 ? drawStart.x : pos.x,
      y: height > 0 ? drawStart.y : pos.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  }, [isDrawing, drawStart, getMousePos]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false);
      return;
    }
    
    // Minimum size check
    if (currentRect.width < 20 || currentRect.height < 20) {
      setIsDrawing(false);
      setCurrentRect(null);
      setDrawStart(null);
      return;
    }
    
    // Create new zone
    const typeInfo = ZONE_TYPES.find(t => t.value === newZoneType);
    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name: `Zone ${zones.length + 1}`,
      type: newZoneType,
      bounds: currentRect,
      color: typeInfo?.color || '#6366f1',
      capacity: 10
    };
    
    // Save to history
    setHistory(prev => [...prev.slice(0, historyIndex + 1), zones]);
    setHistoryIndex(prev => prev + 1);
    
    setZones(prev => [...prev, newZone]);
    setSelectedZone(newZone.id);
    setIsDrawing(false);
    setCurrentRect(null);
    setDrawStart(null);
    setEditingZone(newZone);
    setEditDialogOpen(true);
  }, [isDrawing, currentRect, newZoneType, zones, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      setZones(history[historyIndex]);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  // Delete selected zone
  const handleDeleteZone = useCallback(() => {
    if (!selectedZone) return;
    
    setHistory(prev => [...prev.slice(0, historyIndex + 1), zones]);
    setHistoryIndex(prev => prev + 1);
    
    setZones(prev => prev.filter(z => z.id !== selectedZone));
    setSelectedZone(null);
  }, [selectedZone, zones, historyIndex]);

  // AI Analysis
  const handleAIAnalysis = async () => {
    if (!onAnalyzeWithAI) return;
    
    setIsAnalyzing(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const imageData = canvas.toDataURL('image/png');
      const suggestedZones = await onAnalyzeWithAI(imageData);
      
      if (suggestedZones.length > 0) {
        setHistory(prev => [...prev.slice(0, historyIndex + 1), zones]);
        setHistoryIndex(prev => prev + 1);
        
        setZones(prev => [...prev, ...suggestedZones.map(z => ({
          ...z,
          aiGenerated: true
        }))]);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save zone edit
  const handleSaveZone = () => {
    if (!editingZone) return;
    
    setZones(prev => prev.map(z => 
      z.id === editingZone.id ? editingZone : z
    ));
    setEditDialogOpen(false);
    setEditingZone(null);
  };

  // Double click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const zone = findZoneAtPosition(pos);
    if (zone) {
      setEditingZone(zone);
      setEditDialogOpen(true);
    }
  }, [getMousePos, findZoneAtPosition]);

  return (
    <Card className="bg-slate-900/50 border-slate-800/30">
      <CardHeader className="py-3 border-b border-slate-800/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5 text-purple-400" />
            Zone Drawing Tool
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-slate-400">
              {zones.length} zones
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Tool Selection */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            <Button
              size="sm"
              variant={tool === 'select' ? 'default' : 'ghost'}
              onClick={() => setTool('select')}
              className="h-8"
            >
              <MousePointer2 className="w-4 h-4 mr-1" />
              Select
            </Button>
            <Button
              size="sm"
              variant={tool === 'draw' ? 'default' : 'ghost'}
              onClick={() => setTool('draw')}
              className="h-8"
            >
              <Square className="w-4 h-4 mr-1" />
              Draw
            </Button>
          </div>

          {/* Zone Type Selector (when drawing) */}
          {tool === 'draw' && (
            <Select value={newZoneType} onValueChange={setNewZoneType}>
              <SelectTrigger className="w-44 h-8 bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {ZONE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: type.color }}
                      />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowZones(!showZones)}
              className="h-8"
            >
              {showZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              disabled={historyIndex < 0}
              className="h-8"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteZone}
              disabled={!selectedZone}
              className="h-8 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            {onAnalyzeWithAI && (
              <Button
                size="sm"
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="h-8 bg-purple-600 hover:bg-purple-500"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                AI Detect
              </Button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={containerRef}
          className="relative rounded-lg overflow-hidden border border-slate-800/30"
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full cursor-crosshair"
            style={{ maxHeight: '500px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          />
          
          {/* Instructions overlay */}
          {tool === 'draw' && zones.length === 0 && !isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900/90 px-4 py-2 rounded-lg text-slate-400 text-sm">
                Click and drag to draw a zone
              </div>
            </div>
          )}
        </div>

        {/* Zone List */}
        {zones.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-slate-400">Defined Zones</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {zones.map(zone => (
                <motion.div
                  key={zone.id}
                  className={`p-2 rounded-lg bg-slate-800/50 cursor-pointer border-2 transition-colors ${
                    selectedZone === zone.id ? 'border-white' : 'border-transparent'
                  }`}
                  onClick={() => setSelectedZone(zone.id)}
                  onDoubleClick={() => {
                    setEditingZone(zone);
                    setEditDialogOpen(true);
                  }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-sm text-white truncate">{zone.name}</span>
                    {zone.aiGenerated && (
                      <Sparkles className="w-3 h-3 text-purple-400" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {zone.type.replace(/_/g, ' ')}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Zone Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle>Edit Zone</DialogTitle>
            </DialogHeader>
            {editingZone && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Zone Name</Label>
                  <Input
                    value={editingZone.name}
                    onChange={(e) => setEditingZone(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zone Type</Label>
                  <Select 
                    value={editingZone.type} 
                    onValueChange={(value) => {
                      const typeInfo = ZONE_TYPES.find(t => t.value === value);
                      setEditingZone(prev => prev ? { 
                        ...prev, 
                        type: value,
                        color: typeInfo?.color || prev.color
                      } : null);
                    }}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded" 
                              style={{ backgroundColor: type.color }}
                            />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={editingZone.capacity || 10}
                    onChange={(e) => setEditingZone(prev => prev ? { ...prev, capacity: parseInt(e.target.value) || 10 } : null)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveZone}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Zone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
