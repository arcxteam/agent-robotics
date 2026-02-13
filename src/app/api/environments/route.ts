import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all environments
export async function GET() {
  try {
    const environments = await db.environment.findMany({
      include: {
        robots: true,
        tasks: true,
        obstacles: true,
        zones: true,
        chargingStations: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(environments);
  } catch (error) {
    console.error('Error fetching environments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environments' },
      { status: 500 }
    );
  }
}

// POST create new environment
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const environment = await db.environment.create({
      data: {
        name: body.name,
        type: body.type,
        width: body.width || 100,
        height: body.height || 80,
        description: body.description,
        layout: body.layout || {},
        organizationId: body.organizationId || 'default-org-id',
      },
    });

    return NextResponse.json(environment, { status: 201 });
  } catch (error) {
    console.error('Error creating environment:', error);
    return NextResponse.json(
      { error: 'Failed to create environment' },
      { status: 500 }
    );
  }
}
