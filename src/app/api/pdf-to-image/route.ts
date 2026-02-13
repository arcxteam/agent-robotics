/**
 * RoboOps Intelligence - PDF to Image Conversion API
 * Converts PDF floor plans to images for canvas display
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// We'll use a different approach - return the PDF path and let frontend handle it with PDF.js
// This is more reliable than server-side rendering

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfPath, page = 1 } = body;

    if (!pdfPath) {
      return NextResponse.json(
        { success: false, error: 'No PDF path provided' },
        { status: 400 }
      );
    }

    // Clean up the path
    const cleanPath = pdfPath.replace(/^\/api\/upload\//, '/upload/').replace(/^\/upload\//, '');
    const absolutePath = path.join(process.cwd(), 'upload', cleanPath);

    // Security check
    const normalizedPath = path.normalize(absolutePath);
    const uploadDir = path.join(process.cwd(), 'upload');
    if (!normalizedPath.startsWith(uploadDir)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!existsSync(normalizedPath)) {
      return NextResponse.json(
        { success: false, error: 'PDF file not found', path: cleanPath },
        { status: 404 }
      );
    }

    // Generate a preview image path
    const baseName = path.basename(cleanPath, '.pdf');
    const previewDir = path.join(process.cwd(), 'upload', 'previews');
    
    // Ensure preview directory exists
    if (!existsSync(previewDir)) {
      await mkdir(previewDir, { recursive: true });
    }

    const previewPath = `/api/upload/previews/${baseName}_page${page}.png`;
    
    // Return info for frontend to handle
    return NextResponse.json({
      success: true,
      pdf: {
        path: `/api/upload/${cleanPath}`,
        originalPath: cleanPath,
        page,
      },
      preview: {
        path: previewPath,
        generated: false, // Frontend will generate this
      },
      message: 'Use PDF.js on frontend to render this PDF'
    });

  } catch (error) {
    console.error('[PDF Convert] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'PDF to Image Conversion API',
    endpoint: 'POST /api/pdf-to-image',
    body: {
      pdfPath: 'string - path to PDF file',
      page: 'number - page number to convert (default: 1)'
    },
    note: 'Returns PDF info for frontend rendering with PDF.js'
  });
}
