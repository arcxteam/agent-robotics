import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET environment by ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const environment = await db.environment.findUnique({
      where: { id },
      include: {
        robots: true,
        tasks: true,
        obstacles: true,
        zones: true,
        chargingStations: true,
      },
    });

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(environment);
  } catch (error) {
    console.error('Error fetching environment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environment' },
      { status: 500 }
    );
  }
}

// PATCH update environment
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const environment = await db.environment.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        layout: body.layout,
      },
    });

    return NextResponse.json(environment);
  } catch (error) {
    console.error('Error updating environment:', error);
    return NextResponse.json(
      { error: 'Failed to update environment' },
      { status: 500 }
    );
  }
}

// DELETE environment
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    await db.environment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting environment:', error);
    return NextResponse.json(
      { error: 'Failed to delete environment' },
      { status: 500 }
    );
  }
}
