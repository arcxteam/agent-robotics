/**
 * LLM Task Planning API Endpoint
 * Uses Google Gemini to convert natural language commands into robot tasks
 * 
 * Track 3: Robotic Interaction and Task Execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Available objects and zones for context - matching websocket-server.ts exactly
const AVAILABLE_OBJECTS = [
  { type: 'STEEL_BEAM', name: 'Steel Beam', weight: 50 },
  { type: 'CONCRETE_BLOCK', name: 'Concrete Block', weight: 30 },
  { type: 'PIPE_SECTION', name: 'Pipe Section', weight: 15 },
  { type: 'ELECTRICAL_PANEL', name: 'Electrical Panel', weight: 20 },
  { type: 'HVAC_UNIT', name: 'HVAC Unit', weight: 40 },
  { type: 'TOOL_BOX', name: 'Tool Box', weight: 10 },
  { type: 'SAFETY_EQUIPMENT', name: 'Safety Equipment', weight: 5 },
  { type: 'SCAFFOLDING_PART', name: 'Scaffolding Part', weight: 25 },
  { type: 'CEMENT_BAG', name: 'Cement Bag', weight: 50 },
  { type: 'SAND_BAG', name: 'Sand Bag', weight: 30 },
  { type: 'CARDBOARD_BOX', name: 'Cardboard Box', weight: 8 },
  { type: 'BRICK_PALLET', name: 'Brick Pallet', weight: 45 },
  { type: 'GRAVEL_BAG', name: 'Gravel Bag', weight: 25 },
  { type: 'TILE_STACK', name: 'Tile Stack', weight: 35 },
  { type: 'WOOD_PLANK', name: 'Wood Plank', weight: 12 },
  { type: 'REBAR_BUNDLE', name: 'Rebar Bundle', weight: 60 },
  { type: 'MIXED_MATERIAL', name: 'Mixed Material', weight: 20 },
];

const AVAILABLE_ZONES = [
  { id: 'zone-material-storage', name: 'Material Storage', type: 'MATERIAL_STORAGE' },
  { id: 'zone-assembly', name: 'Assembly Area', type: 'ASSEMBLY_AREA' },
  { id: 'zone-staging', name: 'Staging Zone', type: 'STAGING_ZONE' },
  { id: 'zone-charging', name: 'Charging Station', type: 'CHARGING_STATION' },
  { id: 'zone-work-1', name: 'Work Zone A', type: 'WORK_ZONE' },
  { id: 'zone-inspection', name: 'Inspection Point', type: 'INSPECTION_POINT' },
];

const AVAILABLE_ROBOTS = [
  { id: 'robot-mm-01', name: 'Mobile Manipulator 01', type: 'MOBILE_MANIPULATOR', capabilities: ['pick', 'place', 'lift_heavy'] },
  { id: 'robot-mm-02', name: 'Mobile Manipulator 02', type: 'MOBILE_MANIPULATOR', capabilities: ['pick', 'place', 'precision'] },
  { id: 'robot-transport-01', name: 'Transport Robot 01', type: 'AMR_TRANSPORT', capabilities: ['transport', 'heavy_load'] },
  { id: 'robot-forklift-01', name: 'Forklift 01', type: 'FORKLIFT', capabilities: ['lift', 'transport', 'stack'] },
];

/**
 * Fallback task generator when AI is unavailable (rate limit, no API key, etc.)
 * Uses keyword matching to create tasks without AI
 */
function generateFallbackTasks(command: string): any[] {
  const lowerCmd = command.toLowerCase();
  const tasks: any[] = [];
  
  // Detect object types from command
  const objectMappings: Record<string, string> = {
    'concrete': 'CONCRETE_BLOCK',
    'semen': 'CEMENT_BAG',
    'cement': 'CEMENT_BAG',
    'beton': 'CONCRETE_BLOCK',
    'steel': 'STEEL_BEAM',
    'baja': 'STEEL_BEAM',
    'beam': 'STEEL_BEAM',
    'pipe': 'PIPE_SECTION',
    'pipa': 'PIPE_SECTION',
    'tool': 'TOOL_BOX',
    'alat': 'TOOL_BOX',
    'safety': 'SAFETY_EQUIPMENT',
    'keselamatan': 'SAFETY_EQUIPMENT',
    'scaffolding': 'SCAFFOLDING_PART',
    'hvac': 'HVAC_UNIT',
    'electrical': 'ELECTRICAL_PANEL',
    'listrik': 'ELECTRICAL_PANEL',
    'sand': 'SAND_BAG',
    'pasir': 'SAND_BAG',
    'brick': 'BRICK_PALLET',
    'bata': 'BRICK_PALLET',
    'gravel': 'GRAVEL_BAG',
    'kerikil': 'GRAVEL_BAG',
    'tile': 'TILE_STACK',
    'keramik': 'TILE_STACK',
    'ubin': 'TILE_STACK',
    'wood': 'WOOD_PLANK',
    'kayu': 'WOOD_PLANK',
    'rebar': 'REBAR_BUNDLE',
    'besi': 'REBAR_BUNDLE',
    'cardboard': 'CARDBOARD_BOX',
    'kardus': 'CARDBOARD_BOX',
    'box': 'CARDBOARD_BOX',
  };
  
  // Detect zones from command
  const zoneMappings: Record<string, { source?: string, target?: string }> = {
    'storage': { source: 'zone-material-storage' },
    'material': { source: 'zone-material-storage' },
    'gudang': { source: 'zone-material-storage' },
    'assembly': { target: 'zone-assembly' },
    'rakit': { target: 'zone-assembly' },
    'staging': { target: 'zone-staging' },
    'work zone': { target: 'zone-work-1' },
    'zona kerja': { target: 'zone-work-1' },
    'inspection': { target: 'zone-inspection' },
    'charging': { target: 'zone-charging' },
  };

  // Find object type
  let objectType = 'CONCRETE_BLOCK'; // default
  for (const [keyword, type] of Object.entries(objectMappings)) {
    if (lowerCmd.includes(keyword)) {
      objectType = type;
      break;
    }
  }
  
  // Find source and target zones
  let sourceZone = 'zone-material-storage';
  let targetZone = 'zone-work-1';

  for (const [keyword, zones] of Object.entries(zoneMappings)) {
    if (lowerCmd.includes(keyword)) {
      if (zones.source) sourceZone = zones.source;
      if (zones.target) targetZone = zones.target;
    }
  }

  // Detect quantity
  const quantityMatch = lowerCmd.match(/(\d+)/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
  
  // Determine priority
  let priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL';
  if (lowerCmd.includes('urgent') || lowerCmd.includes('segera')) priority = 'URGENT';
  if (lowerCmd.includes('high') || lowerCmd.includes('tinggi')) priority = 'HIGH';
  
  // Create task(s)
  for (let i = 0; i < Math.min(quantity, 5); i++) {
    tasks.push({
      id: `fallback-task-${Date.now()}-${i}`,
      type: 'PICK_AND_PLACE',
      objectType,
      quantity: 1,
      sourceZone,
      targetZone,
      priority,
      assignedRobotType: objectType === 'STEEL_BEAM' || objectType === 'CONCRETE_BLOCK' ? 'MOBILE_MANIPULATOR' : 'AMR_TRANSPORT',
      reasoning: `[Fallback Mode] Move ${objectType.toLowerCase().replace('_', ' ')} from ${sourceZone} to ${targetZone}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      aiGenerated: false,
      fallbackGenerated: true
    });
  }
  
  return tasks;
}

const SYSTEM_PROMPT = `You are an AI task planner for a construction site robot fleet management system.
Your job is to convert natural language commands into structured robot tasks.

AVAILABLE RESOURCES:
Objects: ${JSON.stringify(AVAILABLE_OBJECTS, null, 2)}
Zones: ${JSON.stringify(AVAILABLE_ZONES, null, 2)}
Robots: ${JSON.stringify(AVAILABLE_ROBOTS, null, 2)}

TASK TYPES:
- PICK_AND_PLACE: Pick an object and place it in a target zone
- TRANSPORT: Move materials from one zone to another
- SORT_MATERIALS: Organize materials by type
- INSPECT: Check status of zones or objects

When given a command, respond with a JSON array of tasks. Each task should have:
{
  "type": "PICK_AND_PLACE" | "TRANSPORT" | "SORT_MATERIALS" | "INSPECT",
  "objectType": "type of object to handle (if applicable)",
  "quantity": number (default 1),
  "sourceZone": "zone id where object is located",
  "targetZone": "zone id where object should go",
  "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT",
  "assignedRobotType": "best robot type for this task",
  "reasoning": "brief explanation of the task"
}

RULES:
1. Match object types exactly from the available list
2. Match zone IDs exactly from the available list
3. Choose appropriate robot type based on task requirements
4. For heavy objects (>30kg), prefer MOBILE_MANIPULATOR or FORKLIFT
5. For transport tasks, prefer AMR_TRANSPORT or FORKLIFT
6. Break complex commands into multiple simpler tasks
7. Always provide reasoning for each task

Respond ONLY with valid JSON array, no other text.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, context, useFallback } = body;

    if (!command) {
      return NextResponse.json(
        { success: false, error: 'Command is required' },
        { status: 400 }
      );
    }

    // Check if API key is configured, use fallback if not
    if (!process.env.GEMINI_API_KEY || useFallback) {
      console.log('[Task Planning] Using fallback mode (no API key or explicitly requested)');
      const fallbackTasks = generateFallbackTasks(command);
      return NextResponse.json({
        success: true,
        command,
        tasks: fallbackTasks,
        metadata: {
          model: 'fallback-keyword-matching',
          generatedAt: new Date().toISOString(),
          taskCount: fallbackTasks.length,
          fallbackMode: true,
          reason: !process.env.GEMINI_API_KEY ? 'No API key' : 'Explicitly requested'
        }
      });
    }

    // Build prompt with context
    let prompt = SYSTEM_PROMPT;
    
    if (context) {
      prompt += `\n\nCURRENT CONTEXT:\n${JSON.stringify(context, null, 2)}`;
    }
    
    prompt += `\n\nUSER COMMAND: "${command}"`;

    try {
      // Generate response using Gemini API
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        }
      });

      const text = response.text || '';
    
      // Parse JSON from response
      let tasks;
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        if (text.includes('```json')) {
          jsonStr = text.split('```json')[1].split('```')[0].trim();
        } else if (text.includes('```')) {
          jsonStr = text.split('```')[1].split('```')[0].trim();
        }
        
        tasks = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse Gemini response, using fallback:', text);
        // Use fallback when parsing fails
        const fallbackTasks = generateFallbackTasks(command);
        return NextResponse.json({
          success: true,
          command,
          tasks: fallbackTasks,
          metadata: {
            model: 'fallback-keyword-matching',
            generatedAt: new Date().toISOString(),
            taskCount: fallbackTasks.length,
            fallbackMode: true,
            reason: 'AI response parsing failed'
          }
        });
      }

      // Validate and enhance tasks
      const validatedTasks = Array.isArray(tasks) ? tasks.map((task: any, index: number) => ({
        id: `task-${Date.now()}-${index}`,
        ...task,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        aiGenerated: true
      })) : [tasks];

      return NextResponse.json({
        success: true,
        command,
        tasks: validatedTasks,
        metadata: {
          model: 'gemini-2.0-flash',
          generatedAt: new Date().toISOString(),
          taskCount: validatedTasks.length
        }
      });

    } catch (aiError: any) {
      // Handle rate limit (429) and other AI errors - try Z-AI fallback first
      console.error('Gemini API error:', aiError?.message || aiError);
      
      const isRateLimit = aiError?.status === 429 || 
                          aiError?.message?.includes('429') || 
                          aiError?.message?.includes('RESOURCE_EXHAUSTED') ||
                          aiError?.message?.includes('quota');
      
      // Try Z-AI as fallback before using keyword matching
      const ZAI_API_KEY = process.env.ZAI_API_KEY;
      const ZAI_API_URL = process.env.ZAI_API_URL || 'https://api.z.ai/api/paas/v4/chat/completions';
      const ZAI_MODEL = process.env.ZAI_MODEL || 'glm-4.7';
      
      if (ZAI_API_KEY) {
        try {
          console.log('[Task Planning] Trying Z-AI fallback...');
          
          const zaiResponse = await fetch(ZAI_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ZAI_API_KEY}`
            },
            body: JSON.stringify({
              model: ZAI_MODEL,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2,
              max_tokens: 2048
            })
          });

          if (zaiResponse.ok) {
            const zaiData = await zaiResponse.json();
            const zaiText = zaiData.choices?.[0]?.message?.content || '';
            
            // Parse JSON from Z-AI response
            let jsonStr = zaiText;
            if (zaiText.includes('```json')) {
              jsonStr = zaiText.split('```json')[1].split('```')[0].trim();
            } else if (zaiText.includes('```')) {
              jsonStr = zaiText.split('```')[1].split('```')[0].trim();
            }
            
            const tasks = JSON.parse(jsonStr);
            const validatedTasks = Array.isArray(tasks) ? tasks.map((task: any, index: number) => ({
              id: `task-${Date.now()}-${index}`,
              ...task,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
              aiGenerated: true,
              model: 'z-ai'
            })) : [tasks];

            return NextResponse.json({
              success: true,
              command,
              tasks: validatedTasks,
              metadata: {
                model: ZAI_MODEL,
                generatedAt: new Date().toISOString(),
                taskCount: validatedTasks.length,
                fallbackUsed: 'z-ai'
              }
            });
          }
        } catch (zaiError) {
          console.error('[Task Planning] Z-AI fallback also failed:', zaiError);
        }
      }
      
      console.log('[Task Planning] All AI services failed, using keyword matching fallback');
      const fallbackTasks = generateFallbackTasks(command);
      
      return NextResponse.json({
        success: true,
        command,
        tasks: fallbackTasks,
        metadata: {
          model: 'fallback-keyword-matching',
          generatedAt: new Date().toISOString(),
          taskCount: fallbackTasks.length,
          fallbackMode: true,
          reason: isRateLimit ? 'API rate limit exceeded' : 'AI service unavailable'
        }
      });
    }

  } catch (error) {
    console.error('Task planning error:', error);
    
    // Even on total failure, try to return fallback tasks
    try {
      const body = await request.json().catch(() => ({}));
      const command = body?.command || '';
      if (command) {
        const fallbackTasks = generateFallbackTasks(command);
        return NextResponse.json({
          success: true,
          command,
          tasks: fallbackTasks,
          metadata: {
            model: 'fallback-keyword-matching',
            generatedAt: new Date().toISOString(),
            taskCount: fallbackTasks.length,
            fallbackMode: true,
            reason: 'Error recovery fallback'
          }
        });
      }
    } catch {
      // Ignore
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    service: 'LLM Task Planning API',
    status: 'active',
    availableObjects: AVAILABLE_OBJECTS.map(o => o.type),
    availableZones: AVAILABLE_ZONES.map(z => z.id),
    availableRobots: AVAILABLE_ROBOTS.map(r => r.id),
    usage: {
      method: 'POST',
      body: {
        command: 'string - natural language command',
        context: 'object - optional current state context'
      }
    }
  });
}
