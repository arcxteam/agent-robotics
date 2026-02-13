/**
 * Zone Management API
 * CRUD operations for construction site zones
 * Stores zones in database via Prisma
 */

import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// GET - List all zones or zones for specific environment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environmentId = searchParams.get('environmentId');

    const zones = await prisma.zone.findMany({
      where: environmentId ? { environmentId } : undefined,
      include: {
        environment: true,
        objects: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      zones,
      count: zones.length
    });

  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch zones' },
      { status: 500 }
    );
  }
}

// POST - Create new zone(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zones, environmentId } = body;

    // Handle single zone or array of zones
    const zonesToCreate = Array.isArray(zones) ? zones : [body];

    const createdZones = await Promise.all(
      zonesToCreate.map(async (zone: any) => {
        return prisma.zone.create({
          data: {
            name: zone.name,
            type: zone.type,
            description: zone.description || '',
            bounds: zone.bounds, // { x, y, width, height }
            color: zone.color || getDefaultColor(zone.type),
            capacity: zone.capacity || 10,
            currentOccupancy: zone.currentOccupancy || 0,
            isActive: zone.isActive !== false,
            aiGenerated: zone.aiGenerated || false,
            confidence: zone.confidence,
            environmentId: zone.environmentId || environmentId,
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      zones: createdZones,
      count: createdZones.length
    });

  } catch (error) {
    console.error('Error creating zones:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create zones' },
      { status: 500 }
    );
  }
}

// PUT - Update zone
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Zone ID is required' },
        { status: 400 }
      );
    }

    const updatedZone = await prisma.zone.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      zone: updatedZone
    });

  } catch (error) {
    console.error('Error updating zone:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update zone' },
      { status: 500 }
    );
  }
}

// DELETE - Delete zone
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Zone ID is required' },
        { status: 400 }
      );
    }

    await prisma.zone.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Zone deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting zone:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete zone' },
      { status: 500 }
    );
  }
}

function getDefaultColor(type: string): string {
  const colors: Record<string, string> = {
    MATERIAL_STORAGE: '#6366f1',
    ASSEMBLY_AREA: '#22c55e',
    STAGING_ZONE: '#f59e0b',
    WORK_ZONE: '#8b5cf6',
    RESTRICTED_AREA: '#ef4444',
    CHARGING_STATION: '#06b6d4',
    INSPECTION_POINT: '#ec4899'
  };
  return colors[type] || '#6b7280';
}
