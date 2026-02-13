/**
 * RoboOps Intelligence - Gemini AI Integration
 * Google Gemini for intelligent task planning and robot orchestration
 * 
 * Track 3: Robotic Interaction and Task Execution
 * Using Gemini for:
 * - Smart task assignment and prioritization
 * - Multi-step task planning
 * - Adaptive behavior for pick-and-place operations
 * - Construction site workflow optimization
 */

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Get API keys from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const ZAI_API_KEY = process.env.ZAI_API_KEY || '';
const ZAI_API_URL = process.env.ZAI_API_URL || 'https://api.z.ai/api/paas/v4/chat/completions';
const ZAI_MODEL = process.env.ZAI_MODEL || 'glm-4.7-flash';

// Z-AI model fallback chain (flash models are cheaper/faster)
const ZAI_MODEL_FALLBACKS = ['glm-4.7-flash', 'glm-4.7-flashx', 'glm-4.5-flash', 'glm-4.7'];

// Use Gemini 2.0 Flash for speed (as recommended for real-time applications)
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Call Z-AI API as fallback with model fallback chain
 */
async function callZAI(
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 2048
): Promise<string> {
  if (!ZAI_API_KEY) {
    throw new Error('Z-AI API key not configured');
  }

  // System message for RoboOps Intelligence context
  const systemMessage = `You are RoboOps Intelligence AI, an advanced robotic fleet management assistant specialized in:
- Task scheduling and optimization for construction site robots
- Pick-and-place operation planning
- Multi-robot coordination and collision avoidance
- Battery and efficiency optimization
- Real-time decision making for autonomous robot fleets

Always respond in the exact format requested. Be concise and actionable.`;

  // Try primary model first, then fallbacks
  const modelsToTry = [ZAI_MODEL, ...ZAI_MODEL_FALLBACKS.filter(m => m !== ZAI_MODEL)];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Z-AI] Trying model: ${model}`);
      
      const response = await fetch(ZAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAI_API_KEY}`,
          'Accept-Language': 'en-US,en'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      });

      const data = await response.json();

      // Check for insufficient balance error - try next model
      if (data.error?.code === '1113' || data.error?.message?.includes('Insufficient balance')) {
        console.log(`[Z-AI] Model ${model} requires payment, trying next...`);
        lastError = new Error(`Model ${model} requires balance`);
        continue;
      }

      if (!response.ok || data.error) {
        console.error(`[Z-AI] API error for ${model}:`, data.error);
        lastError = new Error(data.error?.message || `Z-AI API error: ${response.status}`);
        continue;
      }

      if (!data.choices || data.choices.length === 0) {
        lastError = new Error('No response from Z-AI');
        continue;
      }

      console.log(`[Z-AI] Success with model: ${model}`);
      return data.choices[0].message?.content || '';
    } catch (error) {
      console.error(`[Z-AI] Error with model ${model}:`, error);
      lastError = error as Error;
    }
  }

  throw lastError || new Error('All Z-AI models failed');
}

/**
 * Call Gemini API for intelligent task planning with Z-AI fallback
 */
export async function callGemini(
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 2048
): Promise<string> {
  // Try Gemini first
  if (GEMINI_API_KEY) {
    try {
      const requestBody: GeminiRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topK: 40,
          topP: 0.95
        }
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        
        // Check for rate limit or quota errors - try fallback
        if (response.status === 429 || response.status === 403 || errorText.includes('RESOURCE_EXHAUSTED')) {
          console.log('[Gemini] Rate limited or quota exceeded, trying Z-AI fallback...');
          throw new Error('Rate limited - trying fallback');
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini failed, attempting Z-AI fallback:', error);
      // Fall through to Z-AI
    }
  }

  // Try Z-AI as fallback
  if (ZAI_API_KEY) {
    try {
      console.log('[AI] Using Z-AI fallback...');
      return await callZAI(prompt, temperature, maxTokens);
    } catch (zaiError) {
      console.error('Z-AI fallback also failed:', zaiError);
      throw zaiError;
    }
  }

  // No API available
  throw new Error('No AI API configured. Please set GEMINI_API_KEY or ZAI_API_KEY environment variables.');
}

/**
 * Robot information interface
 */
interface RobotInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  battery: number;
  position: { x: number; y: number };
  hasArm: boolean;
  isHolding: boolean;
  tasksCompleted: number;
  pickSuccessRate: number;
}

/**
 * Task information interface
 */
interface TaskInfo {
  id: string;
  type: string;
  priority: string;
  objectType: string;
  objectWeight: number;
  sourceZone: string;
  targetZone: string;
  estimatedDuration: number;
}

/**
 * Zone information interface
 */
interface ZoneInfo {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  capacity: number;
  occupancy: number;
}

/**
 * Generate task scheduling prompt for Gemini
 */
export function generateGeminiSchedulingPrompt(
  robots: RobotInfo[],
  pendingTasks: TaskInfo[],
  zones: ZoneInfo[]
): string {
  const robotsInfo = robots.map(r => `
- ${r.name} (${r.id})
  Type: ${r.type}
  Status: ${r.status}
  Battery: ${r.battery}%
  Position: (${r.position.x.toFixed(0)}, ${r.position.y.toFixed(0)})
  Has Arm: ${r.hasArm}
  Holding Object: ${r.isHolding}
  Tasks Completed: ${r.tasksCompleted}
  Pick Success Rate: ${(r.pickSuccessRate * 100).toFixed(0)}%
`).join('');

  const tasksInfo = pendingTasks.map(t => `
- Task ${t.id}
  Type: ${t.type}
  Priority: ${t.priority}
  Object: ${t.objectType} (${t.objectWeight}kg)
  From: ${t.sourceZone}
  To: ${t.targetZone}
  Est. Duration: ${t.estimatedDuration}s
`).join('');

  const zonesInfo = zones.map(z => `
- ${z.name} (${z.id})
  Type: ${z.type}
  Position: (${z.position.x.toFixed(0)}, ${z.position.y.toFixed(0)})
  Occupancy: ${z.occupancy}/${z.capacity}
`).join('');

  return `You are an AI task scheduler for a construction site robot fleet. Your job is to optimally assign pending pick-and-place tasks to available robots.

## Current Construction Site State

### Available Robots:
${robotsInfo}

### Pending Tasks:
${tasksInfo}

### Zones:
${zonesInfo}

## Assignment Rules:
1. Only assign tasks to robots with status "IDLE" and battery > 30%
2. Robots with type "MOBILE_MANIPULATOR" or "FORKLIFT" can pick objects
3. Consider distance from robot to object (closer is better)
4. Consider robot's pick success rate (higher is better)
5. Consider task priority (URGENT > HIGH > NORMAL > LOW)
6. Don't assign a task to a robot that is already holding an object
7. Consider battery level - robots with higher battery are preferred for longer tasks

## Response Format:
Respond with a JSON array of assignments. Each assignment should have:
{
  "taskId": "task-id",
  "robotId": "robot-id",
  "score": 0.0-1.0,
  "reasoning": "Brief explanation of why this assignment was made"
}

Return ONLY the JSON array, no additional text. Example:
[
  {"taskId": "task-1", "robotId": "robot-mm-01", "score": 0.85, "reasoning": "Closest robot with high battery and good success rate"}
]

If no valid assignments can be made, return an empty array: []`;
}

/**
 * Parse Gemini response for task assignments
 */
export function parseGeminiSchedulingResponse(response: string): Array<{
  taskId: string;
  robotId: string;
  score: number;
  reasoning: string;
}> {
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in Gemini response');
      return [];
    }

    const assignments = JSON.parse(jsonMatch[0]);
    
    // Validate each assignment
    return assignments.filter((a: any) => 
      typeof a.taskId === 'string' &&
      typeof a.robotId === 'string' &&
      typeof a.score === 'number' &&
      typeof a.reasoning === 'string'
    );
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return [];
  }
}

/**
 * Generate a multi-step task plan using Gemini
 */
export async function generateTaskPlan(
  taskDescription: string,
  robotCapabilities: string[],
  environmentConstraints: string[]
): Promise<Array<{
  step: number;
  action: string;
  target: string;
  preconditions: string[];
  postconditions: string[];
}>> {
  const prompt = `You are a robotic task planner. Generate a detailed step-by-step plan for a robot to complete the following task on a construction site.

Task: ${taskDescription}

Robot Capabilities:
${robotCapabilities.map(c => `- ${c}`).join('\n')}

Environment Constraints:
${environmentConstraints.map(c => `- ${c}`).join('\n')}

Generate a plan as a JSON array with the following format:
[
  {
    "step": 1,
    "action": "MOVE_TO" | "PICK_OBJECT" | "PLACE_OBJECT" | "ROTATE" | "WAIT" | "INSPECT",
    "target": "target location or object ID",
    "preconditions": ["list of conditions that must be true before this step"],
    "postconditions": ["list of conditions that will be true after this step"]
  }
]

Return ONLY the JSON array.`;

  try {
    const response = await callGemini(prompt, 0.3, 2048);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No valid plan in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to generate task plan:', error);
    // Return a simple default plan
    return [
      {
        step: 1,
        action: 'MOVE_TO',
        target: 'source_location',
        preconditions: ['robot_idle', 'path_clear'],
        postconditions: ['robot_at_source']
      },
      {
        step: 2,
        action: 'PICK_OBJECT',
        target: 'object_id',
        preconditions: ['robot_at_source', 'gripper_open'],
        postconditions: ['object_held']
      },
      {
        step: 3,
        action: 'MOVE_TO',
        target: 'target_location',
        preconditions: ['object_held', 'path_clear'],
        postconditions: ['robot_at_target']
      },
      {
        step: 4,
        action: 'PLACE_OBJECT',
        target: 'target_location',
        preconditions: ['robot_at_target', 'object_held'],
        postconditions: ['object_placed', 'gripper_open']
      }
    ];
  }
}

/**
 * Analyze construction site state and provide recommendations
 */
export async function analyzeConstructionSite(
  robots: RobotInfo[],
  tasks: TaskInfo[],
  zones: ZoneInfo[]
): Promise<{
  efficiency: number;
  bottlenecks: string[];
  recommendations: string[];
}> {
  const prompt = `Analyze this construction site robotics operation and provide insights.

## Robots (${robots.length} total):
${robots.map(r => `- ${r.name}: ${r.status}, Battery ${r.battery}%, Success Rate ${(r.pickSuccessRate * 100).toFixed(0)}%`).join('\n')}

## Tasks:
- Pending: ${tasks.filter(t => t.priority === 'URGENT').length} URGENT, ${tasks.length} total

## Zones:
${zones.map(z => `- ${z.name}: ${z.occupancy}/${z.capacity} occupied`).join('\n')}

IMPORTANT: Respond ONLY with valid JSON, no explanation. Use this exact format:
{"efficiency": 0.75, "bottlenecks": ["example bottleneck"], "recommendations": ["example recommendation"]}`;

  try {
    const response = await callGemini(prompt, 0.3, 1024);
    console.log('[Analyze] Raw response length:', response.length);
    
    // Try to find JSON in the response - could be wrapped in code blocks
    let jsonStr = response;
    
    // Remove markdown code blocks if present
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    
    // Try to find JSON object pattern
    const jsonMatch = jsonStr.match(/\{[\s\S]*?"efficiency"[\s\S]*?"bottlenecks"[\s\S]*?"recommendations"[\s\S]*?\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        efficiency: typeof parsed.efficiency === 'number' ? parsed.efficiency : 0.5,
        bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    }
    
    // Fallback: Try to parse the whole response as JSON
    const parsed = JSON.parse(jsonStr.trim());
    return {
      efficiency: typeof parsed.efficiency === 'number' ? parsed.efficiency : 0.5,
      bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch (error) {
    console.error('Failed to analyze site:', error);
    
    // Generate a basic analysis based on the data we have
    const idleRobots = robots.filter(r => r.status === 'IDLE').length;
    const lowBattery = robots.filter(r => r.battery < 30).length;
    const urgentTasks = tasks.filter(t => t.priority === 'URGENT').length;
    
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    
    if (lowBattery > 0) {
      bottlenecks.push(`${lowBattery} robot(s) have low battery`);
      recommendations.push('Schedule charging for low-battery robots');
    }
    if (urgentTasks > idleRobots) {
      bottlenecks.push(`More urgent tasks (${urgentTasks}) than available robots (${idleRobots})`);
      recommendations.push('Prioritize urgent tasks and consider adding more robots');
    }
    if (idleRobots === 0 && tasks.length > 0) {
      bottlenecks.push('No idle robots available for pending tasks');
      recommendations.push('Wait for current tasks to complete');
    }
    
    return {
      efficiency: idleRobots > 0 ? 0.6 : 0.4,
      bottlenecks: bottlenecks.length > 0 ? bottlenecks : ['System operating normally'],
      recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring operations']
    };
  }
}
