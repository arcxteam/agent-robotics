import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all tasks
export async function GET() {
  try {
    const tasks = await db.task.findMany({
      include: {
        assignments: {
          include: {
            robot: true,
          },
        },
        environment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST create new task
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const task = await db.task.create({
      data: {
        type: body.type,
        priority: body.priority,
        environmentId: body.environmentId,
        startLocation: body.startLocation,
        endLocation: body.endLocation,
        items: body.items,
        estimatedTime: body.estimatedTime,
        aiAssignment: body.aiAssignment,
        aiScore: body.aiScore,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
