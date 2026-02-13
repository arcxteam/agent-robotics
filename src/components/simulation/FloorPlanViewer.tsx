/**
 * Floor Plan Viewer Component
 * Displays PDF floor plans with zone drawing capability
 * Uses PDF.js for PDF rendering
 */
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Move,
  Square,
  Circle,
  Trash2,
  Save,
  Layers,
  Eye,
  EyeOff,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  Send,
  Play,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface Zone {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  confidence?: number;
  description?: string;
}

interface Obstacle {
  id: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  isTemporary?: boolean;
}

interface Pathway {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  width: number;
}

interface FloorPlanViewerProps {
  onZonesUpdate?: (zones: Zone[]) => void;
  onAnalysisComplete?: (analysis: any) => void;
  initialZones?: Zone[];
}

const ZONE_TYPES = [
  { type: 'MATERIAL_STORAGE', label: 'Material Storage', color: '#6366f1' },
  { type: 'ASSEMBLY_AREA', label: 'Assembly Area', color: '#22c55e' },
  { type: 'STAGING_ZONE', label: 'Staging Zone', color: '#f59e0b' },
  { type: 'WORK_ZONE', label: 'Work Zone', color: '#8b5cf6' },
  { type: 'RESTRICTED_AREA', label: 'Restricted', color: '#ef4444' },
  { type: 'CHARGING_STATION', label: 'Charging', color: '#06b6d4' },
  { type: 'OFFICE', label: 'Office', color: '#22c55e' },
  { type: 'LOBBY', label: 'Lobby', color: '#3b82f6' },
  { type: 'RESTAURANT', label: 'Restaurant', color: '#f59e0b' },
  { type: 'KITCHEN', label: 'Kitchen', color: '#ef4444' },
];

export default function FloorPlanViewer({
  onZonesUpdate,
  onAnalysisComplete,
  initialZones = []
}: FloorPlanViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [floorPlanImage, setFloorPlanImage] = useState<HTMLImageElement | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPdf, setIsPdf] = useState(false);

  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  const [tool, setTool] = useState<'pan' | 'zone' | 'select'>('pan');
  const [selectedZoneType, setSelectedZoneType] = useState(ZONE_TYPES[0]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });

  const [showZones, setShowZones] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);
  const [showPathways, setShowPathways] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'success' | 'fallback'>('idle');
  const [isSendingToSim, setIsSendingToSim] = useState(false);
  const [simSyncStatus, setSimSyncStatus] = useState<'idle' | 'synced' | 'error'>('idle');

  // Send zones to simulation server
  const sendZonesToSimulation = useCallback(async () => {
    if (zones.length === 0) return;
    
    setIsSendingToSim(true);
    try {
      // Send to ROS Bridge
      const rosResponse = await fetch('/api/ros/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_zones',
          data: { zones, obstacles, pathways }
        })
      });
      
      const rosResult = await rosResponse.json();
      console.log('[FloorPlan] Zones synced to ROS:', rosResult);
      
      setSimSyncStatus('synced');
      setTimeout(() => setSimSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('[FloorPlan] Failed to sync zones:', error);
      setSimSyncStatus('error');
    } finally {
      setIsSendingToSim(false);
    }
  }, [zones, obstacles, pathways]);

  // Render PDF page to canvas
  const renderPdfPage = useCallback(async (pdf: pdfjs.PDFDocumentProxy, pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas, // Required by pdfjs-dist RenderParameters
    };

    await page.render(renderContext).promise;

    // Also update overlay canvas size
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = viewport.width;
      overlayCanvasRef.current.height = viewport.height;
    }
  }, []);

  // Load PDF file
  const loadPdf = useCallback(async (url: string) => {
    try {
      const loadingTask = pdfjs.getDocument(url);
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setIsPdf(true);
      await renderPdfPage(pdf, 1);
    } catch (error) {
      console.error('Failed to load PDF:', error);
    }
  }, [renderPdfPage]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setAnalysisStatus('idle');

    try {
      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapType', 'floor_plan');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const filePath = uploadResult.file.filePath;
      // Convert to API path for serving
      const apiPath = filePath.replace('/upload/', '/api/upload/');
      setUploadedFile(apiPath);

      // Check if it's a PDF or image
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Load PDF
        await loadPdf(apiPath);
      } else {
        // Load as image
        const img = new Image();
        img.onload = () => {
          setFloorPlanImage(img);
          setIsPdf(false);
          
          if (canvasRef.current && overlayCanvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            overlayCanvasRef.current.width = img.width;
            overlayCanvasRef.current.height = img.height;
            
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
            }
          }
        };
        img.src = apiPath;
      }

      // Analyze the map
      setIsAnalyzing(true);
      setAnalysisStatus('analyzing');
      
      const analyzeFormData = new FormData();
      analyzeFormData.append('file', file);
      analyzeFormData.append('mapType', 'floor_plan');

      const analyzeResponse = await fetch('/api/ai/analyze-map', {
        method: 'POST',
        body: analyzeFormData,
      });

      const analyzeResult = await analyzeResponse.json();

      if (analyzeResult.success && analyzeResult.analysis) {
        const analysis = analyzeResult.analysis;
        
        // Set zones from analysis
        if (analysis.zones) {
          setZones(analysis.zones);
          onZonesUpdate?.(analysis.zones);
        }
        
        if (analysis.obstacles) {
          setObstacles(analysis.obstacles);
        }
        
        if (analysis.pathways) {
          setPathways(analysis.pathways);
        }

        onAnalysisComplete?.(analyzeResult);
        
        // Check if fallback was used
        if (analyzeResult.metadata?.isFallback) {
          setAnalysisStatus('fallback');
        } else {
          setAnalysisStatus('success');
        }
      }

    } catch (error) {
      console.error('Upload/analysis error:', error);
      setAnalysisStatus('idle');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // Draw overlay (zones, obstacles, pathways)
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw pathways
    if (showPathways) {
      pathways.forEach(pathway => {
        if (pathway.points.length < 2) return;
        
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = pathway.width || 4;
        ctx.setLineDash([10, 5]);
        
        const startX = (pathway.points[0].x / 100) * canvas.width;
        const startY = (pathway.points[0].y / 100) * canvas.height;
        ctx.moveTo(startX, startY);
        
        pathway.points.slice(1).forEach(point => {
          const x = (point.x / 100) * canvas.width;
          const y = (point.y / 100) * canvas.height;
          ctx.lineTo(x, y);
        });
        
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Draw obstacles
    if (showObstacles) {
      obstacles.forEach(obstacle => {
        const x = (obstacle.bounds.x / 100) * canvas.width;
        const y = (obstacle.bounds.y / 100) * canvas.height;
        const w = (obstacle.bounds.width / 100) * canvas.width;
        const h = (obstacle.bounds.height / 100) * canvas.height;

        ctx.fillStyle = obstacle.isTemporary ? 'rgba(251, 146, 60, 0.3)' : 'rgba(239, 68, 68, 0.3)';
        ctx.strokeStyle = obstacle.isTemporary ? '#fb923c' : '#ef4444';
        ctx.lineWidth = 2;
        
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      });
    }

    // Draw zones
    if (showZones) {
      zones.forEach(zone => {
        const x = (zone.bounds.x / 100) * canvas.width;
        const y = (zone.bounds.y / 100) * canvas.height;
        const w = (zone.bounds.width / 100) * canvas.width;
        const h = (zone.bounds.height / 100) * canvas.height;

        // Fill
        ctx.fillStyle = zone.color + '40'; // 25% opacity
        ctx.fillRect(x, y, w, h);

        // Border
        ctx.strokeStyle = selectedZone === zone.id ? '#fff' : zone.color;
        ctx.lineWidth = selectedZone === zone.id ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        // Background for text
        const text = zone.name || zone.type;
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = zone.color;
        ctx.fillRect(x + w/2 - textWidth/2 - 4, y + 4, textWidth + 8, 18);
        
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x + w/2, y + 17);
      });
    }

    // Draw current drawing
    if (isDrawing && tool === 'zone') {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const w = Math.abs(drawEnd.x - drawStart.x);
      const h = Math.abs(drawEnd.y - drawStart.y);

      ctx.fillStyle = selectedZoneType.color + '40';
      ctx.strokeStyle = selectedZoneType.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [zones, obstacles, pathways, showZones, showObstacles, showPathways, selectedZone, 
      isDrawing, tool, drawStart, drawEnd, selectedZoneType, scale, offset]);

  // Redraw overlay when dependencies change
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Handle page change for PDF
  useEffect(() => {
    if (pdfDocument && currentPage >= 1 && currentPage <= totalPages) {
      renderPdfPage(pdfDocument, currentPage);
    }
  }, [pdfDocument, currentPage, totalPages, renderPdfPage]);

  // Mouse handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    if (tool === 'zone') {
      setIsDrawing(true);
      setDrawStart(coords);
      setDrawEnd(coords);
    } else if (tool === 'select') {
      // Find clicked zone
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      
      const clicked = zones.find(zone => {
        const x = (zone.bounds.x / 100) * canvas.width;
        const y = (zone.bounds.y / 100) * canvas.height;
        const w = (zone.bounds.width / 100) * canvas.width;
        const h = (zone.bounds.height / 100) * canvas.height;
        
        return coords.x >= x && coords.x <= x + w && 
               coords.y >= y && coords.y <= y + h;
      });
      
      setSelectedZone(clicked?.id || null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const coords = getCanvasCoords(e);
    setDrawEnd(coords);
  };

  const handleMouseUp = () => {
    if (!isDrawing || tool !== 'zone') {
      setIsDrawing(false);
      return;
    }

    const canvas = overlayCanvasRef.current;
    if (!canvas) {
      setIsDrawing(false);
      return;
    }

    // Create new zone
    const x = Math.min(drawStart.x, drawEnd.x);
    const y = Math.min(drawStart.y, drawEnd.y);
    const w = Math.abs(drawEnd.x - drawStart.x);
    const h = Math.abs(drawEnd.y - drawStart.y);

    // Only create if it has some size
    if (w > 10 && h > 10) {
      const newZone: Zone = {
        id: `zone-${Date.now()}`,
        name: `${selectedZoneType.label} ${zones.length + 1}`,
        type: selectedZoneType.type,
        bounds: {
          x: (x / canvas.width) * 100,
          y: (y / canvas.height) * 100,
          width: (w / canvas.width) * 100,
          height: (h / canvas.height) * 100
        },
        color: selectedZoneType.color
      };

      const updatedZones = [...zones, newZone];
      setZones(updatedZones);
      onZonesUpdate?.(updatedZones);
    }

    setIsDrawing(false);
  };

  // Delete selected zone
  const handleDeleteZone = () => {
    if (!selectedZone) return;
    
    const updatedZones = zones.filter(z => z.id !== selectedZone);
    setZones(updatedZones);
    setSelectedZone(null);
    onZonesUpdate?.(updatedZones);
  };

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 5));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.2));
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-zinc-800/50 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.svg"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Floor Plan'}
          </Button>

          {/* Analysis status */}
          {analysisStatus !== 'idle' && (
            <Badge 
              variant="outline" 
              className={
                analysisStatus === 'analyzing' ? 'border-blue-500 text-blue-400' :
                analysisStatus === 'success' ? 'border-green-500 text-green-400' :
                'border-amber-500 text-amber-400'
              }
            >
              {analysisStatus === 'analyzing' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse mr-2" />
                  Analyzing...
                </>
              )}
              {analysisStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  AI Analyzed
                </>
              )}
              {analysisStatus === 'fallback' && (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Using Fallback
                </>
              )}
            </Badge>
          )}

          <div className="w-px h-6 bg-zinc-700" />

          {/* Tools */}
          <Button
            variant={tool === 'pan' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTool('pan')}
          >
            <Move className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'select' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTool('select')}
          >
            <MapPin className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'zone' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTool('zone')}
          >
            <Square className="w-4 h-4" />
          </Button>

          {/* Zone type selector */}
          {tool === 'zone' && (
            <select
              value={selectedZoneType.type}
              onChange={(e) => {
                const type = ZONE_TYPES.find(t => t.type === e.target.value);
                if (type) setSelectedZoneType(type);
              }}
              className="bg-zinc-700 text-white text-sm rounded px-2 py-1 border border-zinc-600"
            >
              {ZONE_TYPES.map(type => (
                <option key={type.type} value={type.type}>
                  {type.label}
                </option>
              ))}
            </select>
          )}

          {selectedZone && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteZone}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layer toggles */}
          <Button
            variant={showZones ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowZones(!showZones)}
            title="Toggle zones"
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant={showObstacles ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowObstacles(!showObstacles)}
            title="Toggle obstacles"
          >
            {showObstacles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>

          <div className="w-px h-6 bg-zinc-700" />

          {/* Zoom controls */}
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-zinc-400 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRotate}>
            <RotateCw className="w-4 h-4" />
          </Button>

          {/* PDF page navigation */}
          {isPdf && totalPages > 1 && (
            <>
              <div className="w-px h-6 bg-zinc-700" />
              <div className="flex items-center gap-1 text-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  ←
                </Button>
                <span className="text-zinc-400">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  →
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Canvas container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-zinc-950"
        style={{ minHeight: '500px' }}
      >
        {!uploadedFile && !floorPlanImage && !pdfDocument ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                No Floor Plan Loaded
              </h3>
              <p className="text-zinc-500 mb-4">
                Upload a PDF or image file to get started
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Floor Plan
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Background canvas (floor plan) */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: '0 0'
              }}
            />
            
            {/* Overlay canvas (zones, obstacles) */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 cursor-crosshair"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: '0 0'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </>
        )}
      </div>

      {/* Zone list */}
      {zones.length > 0 && (
        <div className="p-3 bg-zinc-800/50 border-t border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">
                Detected Zones ({zones.length})
              </span>
              {analysisStatus === 'success' && (
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  AI Analyzed
                </Badge>
              )}
              {analysisStatus === 'fallback' && (
                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Fallback
                </Badge>
              )}
            </div>
            
            {/* Send to Simulation button */}
            <Button
              size="sm"
              onClick={sendZonesToSimulation}
              disabled={isSendingToSim || zones.length === 0}
              className={`${
                simSyncStatus === 'synced' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : simSyncStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isSendingToSim ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : simSyncStatus === 'synced' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Synced!
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Send to Simulation
                </>
              )}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {zones.map(zone => (
              <Badge
                key={zone.id}
                variant="outline"
                className={`cursor-pointer transition-colors ${
                  selectedZone === zone.id 
                    ? 'border-white bg-white/10' 
                    : 'border-zinc-600 hover:border-zinc-500'
                }`}
                style={{ borderColor: selectedZone === zone.id ? zone.color : undefined }}
                onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
              >
                <div 
                  className="w-2 h-2 rounded-full mr-1" 
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name}
                {zone.confidence && (
                  <span className="ml-1 text-xs opacity-60">
                    {Math.round(zone.confidence * 100)}%
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
