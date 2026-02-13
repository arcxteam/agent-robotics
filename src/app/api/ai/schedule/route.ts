import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callLLM, generateSchedulingPrompt, parseLLMResponse } from '@/lib/llm';

// POST - AI-powered task scheduling with z.ai LLM
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { environmentId } = body;

    console.log(`[AI Scheduling] Starting for environment: ${environmentId}`);

    // Fetch available robots and pending tasks
    const [robots, pendingTasks, environment] = await Promise.all([
      db.robot.findMany({
        where: {
          environmentId,
          status: {
            in: ['IDLE', 'MOVING'],
          },
          battery: {
            gte: 30, // Minimum battery threshold
          },
        },
      }),
      db.task.findMany({
        where: {
          environmentId,
          status: 'PENDING',
        },
        orderBy: {
          priority: 'desc',
        },
      }),
      db.environment.findUnique({
        where: { id: environmentId },
      }),
    ]);

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      );
    }

    console.log(`[AI Scheduling] Found ${robots.length} robots and ${pendingTasks.length} pending tasks`);

    if (pendingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        assignments: [],
        message: 'No pending tasks to schedule',
      });
    }

    if (robots.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No available robots',
        message: 'All robots are either charging or have low battery',
      });
    }

    // Generate prompt for LLM
    const messages = generateSchedulingPrompt(robots, pendingTasks, environment);

    console.log('[AI Scheduling] Calling z.ai LLM API...');

    // Call z.ai LLM API
    const llmResponse = await callLLM(messages, 'glm-4.7', 0.7);

    console.log('[AI Scheduling] LLM response received');

    // Parse LLM response
    const assignments = parseLLMResponse(llmResponse.choices[0]?.message?.content || '[]');

    console.log(`[AI Scheduling] Parsed ${assignments.length} assignments from LLM`);

    if (assignments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse LLM response',
        llmContent: llmResponse.choices[0]?.message?.content,
      });
    }

    // Apply assignments to database
    const appliedAssignments: typeof assignments = [];
    const assignedRobotIds = new Set<string>();
    const assignedTaskIds = new Set<string>();

    for (const assignment of assignments) {
      // Skip if robot or task not found
      const robot = robots.find(r => r.id === assignment.robotId);
      const task = pendingTasks.find(t => t.id === assignment.taskId);

      if (!robot || !task) {
        console.warn(`[AI Scheduling] Skipping assignment: robot or task not found`, assignment);
        continue;
      }

      // Skip if robot or task already assigned
      if (assignedRobotIds.has(robot.id) || assignedTaskIds.has(task.id)) {
        console.warn(`[AI Scheduling] Skipping assignment: robot or task already assigned`, assignment);
        continue;
      }

      // Create task assignment
      await db.taskAssignment.create({
        data: {
          taskId: task.id,
          robotId: robot.id,
          status: 'ASSIGNED',
          metadata: {
            reasoning: assignment.reasoning,
            priority: assignment.priority,
          }
        },
      });

      // Update robot status
      await db.robot.update({
        where: { id: robot.id },
        data: {
          status: 'MOVING',
          currentTaskId: task.id,
        },
      });

      // Update task status
      await db.task.update({
        where: { id: task.id },
        data: {
          status: 'ASSIGNED',
          aiAssignment: {
            robotId: robot.id,
            reasoning: assignment.reasoning,
            priority: assignment.priority,
          },
          aiScore: assignment.priority,
        },
      });

      appliedAssignments.push(assignment);
      assignedRobotIds.add(robot.id);
      assignedTaskIds.add(task.id);

      console.log(`[AI Scheduling] Assigned task ${task.id} to robot ${robot.id}`);
    }

    console.log(`[AI Scheduling] Successfully applied ${appliedAssignments.length} assignments`);

    return NextResponse.json({
      success: true,
      assignments: appliedAssignments,
      totalPending: pendingTasks.length,
      assigned: appliedAssignments.length,
      message: `Successfully assigned ${appliedAssignments.length} out of ${pendingTasks.length} tasks to robots`,
      llmUsage: {
        promptTokens: llmResponse.usage.prompt_tokens,
        completionTokens: llmResponse.usage.completion_tokens,
        totalTokens: llmResponse.usage.total_tokens,
      }
    });
  } catch (error) {
    console.error('[AI Scheduling] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to schedule tasks', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
