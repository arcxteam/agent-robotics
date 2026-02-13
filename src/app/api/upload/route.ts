/**
 * RoboOps Intelligence - File Upload API
 * Handles CAD/PDF/Image uploads for environment mapping
 * 
 * Track 3: Simulation-first approach
 * Supports uploading floor plans and site layouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Supported file types for mapping
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'application/dxf', // AutoCAD DXF
  'image/vnd.dxf',
  'application/octet-stream' // For .dwg files
];

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.svg', '.dxf', '.dwg'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'upload', 'maps');

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const environmentId = formData.get('environmentId') as string;
    const mapType = formData.get('mapType') as string || 'floor_plan';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const safeFileName = `${mapType}_${timestamp}_${randomId}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, safeFileName);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get file info for response
    const fileInfo = {
      id: `map-${randomId}`,
      originalName: file.name,
      fileName: safeFileName,
      filePath: `/upload/maps/${safeFileName}`,
      fileType: fileExtension.replace('.', ''),
      mimeType: file.type,
      fileSize: file.size,
      mapType,
      environmentId: environmentId || null,
      uploadedAt: new Date().toISOString()
    };

    // Log upload
    console.log(`[Upload] Map file uploaded: ${file.name} -> ${safeFileName}`);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'File Upload API',
    supportedTypes: ALLOWED_EXTENSIONS,
    maxSize: '50MB',
    endpoint: 'POST /api/upload',
    description: 'Upload CAD/PDF/Image files for environment mapping'
  });
}
