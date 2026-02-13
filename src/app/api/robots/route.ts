import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all robots
export async function GET() {
  try {
    const robots = await db.robot.findMany({
      include: {
        currentTask: true,
        environment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(robots);
  } catch (error) {
    console.error('Error fetching robots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch robots' },
      { status: 500 }
    );
  }
}

// POST create new robot
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const robot = await db.robot.create({
      data: {
        name: body.name,
        type: body.type,
        environmentId: body.environmentId,
        battery: body.battery || 100,
        capacity: body.capacity || 50,
        speed: body.speed || 1.5,
        x: body.x || 0,
        y: body.y || 0,
        status: 'IDLE',
      },
    });

    return NextResponse.json(robot, { status: 201 });
  } catch (error) {
    console.error('Error creating robot:', error);
    return NextResponse.json(
      { error: 'Failed to create robot' },
      { status: 500 }
    );
  }
}
