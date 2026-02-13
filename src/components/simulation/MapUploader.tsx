'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileImage,
  FileText,
  X,
  Check,
  Loader2,
  Map,
  Building2,
  Factory,
  Warehouse,
  HardHat,
  AlertCircle,
} from 'lucide-react';

interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  mapType: string;
  uploadedAt: string;
}

interface MapUploaderProps {
  onMapUploaded?: (file: UploadedFile) => void;
  environmentId?: string;
}

const MAP_TYPES = [
  { value: 'floor_plan', label: 'Floor Plan', icon: Building2 },
  { value: 'site_layout', label: 'Site Layout', icon: HardHat },
  { value: 'warehouse', label: 'Warehouse Map', icon: Warehouse },
  { value: 'factory', label: 'Factory Layout', icon: Factory },
];

const FILE_ICONS: Record<string, typeof FileImage> = {
  pdf: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  svg: FileImage,
  dxf: Map,
  dwg: Map,
};

export default function MapUploader({ onMapUploaded, environmentId }: MapUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapType] = useState('floor_plan');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapType', mapType);
      if (environmentId) {
        formData.append('environmentId', environmentId);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedFile(data.file);
      onMapUploaded?.(data.file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }, [mapType, environmentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    const Icon = FILE_ICONS[type.toLowerCase()] || FileImage;
    return <Icon className="w-8 h-8" />;
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-400" />
          Upload Environment Map
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="mapType">Map Type</Label>
          <Select value={mapType} onValueChange={setMapType}>
            <SelectTrigger id="mapType" className="bg-slate-800 border-slate-700">
              <SelectValue placeholder="Select map type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {MAP_TYPES.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Area */}
        {!uploadedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
              ${isDragging 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.svg,.dxf,.dwg"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3"
                >
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                  <p className="text-slate-400">Uploading...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                    <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      PDF, PNG, JPG, SVG, DXF, DWG (max 50MB)
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-green-500/30 bg-green-500/10 rounded-xl p-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-500/20 text-green-400">
                {getFileIcon(uploadedFile.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="font-medium text-white">Upload Complete</span>
                </div>
                <p className="text-sm text-slate-400 truncate mt-1">
                  {uploadedFile.originalName}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{formatFileSize(uploadedFile.fileSize)}</span>
                  <Badge variant="outline" className="text-xs">
                    {uploadedFile.fileType.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/50">
                    {MAP_TYPES.find(t => t.value === uploadedFile.mapType)?.label || uploadedFile.mapType}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white"
                onClick={clearUpload}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Help Text */}
        <p className="text-xs text-slate-500">
          Upload floor plans or CAD drawings to use as background for your simulation. 
          The map will be displayed in the simulation canvas and robots will navigate on top of it.
        </p>
      </CardContent>
    </Card>
  );
}
