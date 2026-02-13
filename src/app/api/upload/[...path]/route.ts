/**
 * RoboOps Intelligence - File Serving API
 * Serves uploaded files from /upload directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.dxf': 'application/dxf',
  '.dwg': 'application/octet-stream',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    
    // Reconstruct the file path
    const relativePath = pathSegments.join('/');
    const absolutePath = path.join(process.cwd(), 'upload', relativePath);

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(absolutePath);
    const uploadDir = path.join(process.cwd(), 'upload');
    if (!normalizedPath.startsWith(uploadDir)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!existsSync(normalizedPath)) {
      console.log(`[FileServe] File not found: ${normalizedPath}`);
      return NextResponse.json(
        { error: 'File not found', path: relativePath },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(normalizedPath);
    
    // Determine MIME type
    const ext = path.extname(normalizedPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Disposition': `inline; filename="${path.basename(normalizedPath)}"`,
      },
    });

  } catch (error) {
    console.error('[FileServe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
