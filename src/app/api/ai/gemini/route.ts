import { NextResponse } from 'next/server';
import { 
  callGemini, 
  generateGeminiSchedulingPrompt, 
  parseGeminiSchedulingResponse,
  analyzeConstructionSite
} from '@/lib/gemini';

// POST - Gemini-powered task scheduling for construction site
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { robots, tasks, zones, action = 'schedule' } = body;

    console.log(`[Gemini AI] Action: ${action}, Robots: ${robots?.length}, Tasks: ${tasks?.length}`);

    if (action === 'analyze') {
      // Analyze construction site and provide recommendations
      const analysis = await analyzeConstructionSite(
        robots.map((r: any) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          status: r.status,
          battery: r.battery,
          position: { x: r.pose?.x || 0, y: r.pose?.y || 0 },
          hasArm: r.arm !== null,
          isHolding: r.gripper?.heldObject !== null,
          tasksCompleted: r.tasksCompleted || 0,
          pickSuccessRate: r.pickSuccessRate || 0
        })),
        tasks.map((t: any) => ({
          id: t.id,
          type: t.type,
          priority: t.priority,
          objectType: t.objectId || 'unknown',
          objectWeight: 20,
          sourceZone: t.sourceZone || 'material-storage',
          targetZone: t.targetZone || 'assembly-area',
          estimatedDuration: t.estimatedDuration || 60
        })),
        zones.map((z: any) => ({
          id: z.id,
          name: z.name,
          type: z.type,
          position: { x: z.bounds?.x || 0, y: z.bounds?.y || 0 },
          capacity: z.capacity,
          occupancy: z.currentOccupancy
        }))
      );

      return NextResponse.json({
        success: true,
        analysis
      });
    }

    // Default: Schedule tasks
    if (!robots || robots.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No robots provided',
        assignments: []
      });
    }

    const pendingTasks = tasks?.filter((t: any) => t.status === 'PENDING') || [];
    
    if (pendingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        assignments: [],
        message: 'No pending tasks to schedule'
      });
    }

    const availableRobots = robots.filter((r: any) => 
      r.status === 'IDLE' && r.battery > 30 && !r.currentTaskId
    );

    if (availableRobots.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No available robots',
        assignments: [],
        message: 'All robots are busy, charging, or have low battery'
      });
    }

    // Transform data for Gemini prompt
    const robotsInfo = availableRobots.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      battery: r.battery,
      position: { x: r.pose?.x || 0, y: r.pose?.y || 0 },
      hasArm: r.arm !== null || r.type === 'MOBILE_MANIPULATOR',
      isHolding: r.gripper?.heldObject !== null,
      tasksCompleted: r.tasksCompleted || 0,
      pickSuccessRate: r.pickSuccessRate || 0.8
    }));

    const tasksInfo = pendingTasks.map((t: any) => ({
      id: t.id,
      type: t.type,
      priority: t.priority,
      objectType: t.objectId || 'construction_material',
      objectWeight: 20,
      sourceZone: t.sourceZone || 'material-storage',
      targetZone: t.targetZone || 'assembly-area',
      estimatedDuration: t.estimatedDuration || 60
    }));

    const zonesInfo = (zones || []).map((z: any) => ({
      id: z.id,
      name: z.name,
      type: z.type,
      position: { x: z.bounds?.x || 0, y: z.bounds?.y || 0 },
      capacity: z.capacity,
      occupancy: z.currentOccupancy
    }));

    // Generate prompt and call Gemini
    const prompt = generateGeminiSchedulingPrompt(robotsInfo, tasksInfo, zonesInfo);
    
    console.log('[Gemini AI] Calling Gemini API...');
    
    const geminiResponse = await callGemini(prompt, 0.3, 2048);
    
    console.log('[Gemini AI] Response received');

    // Parse assignments
    const assignments = parseGeminiSchedulingResponse(geminiResponse);

    console.log(`[Gemini AI] Parsed ${assignments.length} assignments`);

    return NextResponse.json({
      success: true,
      assignments,
      message: `Successfully scheduled ${assignments.length} tasks using Gemini AI`,
      rawResponse: process.env.NODE_ENV === 'development' ? geminiResponse : undefined
    });

  } catch (error) {
    console.error('[Gemini AI] Error:', error);
    
    // Fallback to simple rule-based scheduling
    const body = await request.json().catch(() => ({}));
    const { robots = [], tasks = [] } = body;
    
    const fallbackAssignments: Array<{
      taskId: string;
      robotId: string;
      score: number;
      reasoning: string;
    }> = [];
    
    const availableRobots = robots.filter((r: any) => 
      r.status === 'IDLE' && r.battery > 30 && !r.currentTaskId
    );
    const pendingTasks = tasks.filter((t: any) => t.status === 'PENDING');

    for (let i = 0; i < Math.min(availableRobots.length, pendingTasks.length); i++) {
      fallbackAssignments.push({
        taskId: pendingTasks[i].id,
        robotId: availableRobots[i].id,
        score: 0.7,
        reasoning: 'Fallback assignment (Gemini unavailable)'
      });
    }

    return NextResponse.json({
      success: true,
      assignments: fallbackAssignments,
      message: 'Using fallback scheduling (Gemini API unavailable)',
      error: (error as Error).message
    });
  }
}

// GET - Health check
export async function GET() {
  return NextResponse.json({
    service: 'Gemini AI Scheduling',
    status: 'active',
    model: 'gemini-2.0-flash',
    capabilities: [
      'task_scheduling',
      'site_analysis',
      'multi_step_planning',
      'workflow_optimization'
    ]
  });
}
