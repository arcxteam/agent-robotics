/**
 * AI Decision Engine - Powered by Gemini
 * 
 * This module provides intelligent decision making for robots.
 * It uses Google Gemini to analyze context and decide actions.
 * 
 * Key features:
 * - Natural language task parsing
 * - Contextual decision making
 * - Failure handling and replanning
 * - NOT HARDCODED - decisions are dynamic based on AI reasoning
 * 
 * @module ai-decision-engine
 */

import {
  IAIDecisionEngine,
  DecisionContext,
  Decision,
  RobotGoal,
  Pose2D,
} from './robot-interface';

// ============================================
// GEMINI API INTEGRATION
// ============================================

interface GeminiResponse {
  action: string;
  target?: any;
  reasoning: string;
  confidence: number;
  priority: number;
}

const DECISION_PROMPT = `You are an AI decision engine for a construction site robot fleet.
Your job is to analyze the current context and decide the BEST next action for a robot.

AVAILABLE ACTIONS:
- NAVIGATE: Move to a specific location
- PICK: Pick up an object
- PLACE: Place a held object at a location
- WAIT: Wait for a condition
- CHARGE: Go to charging station
- REPLAN: Current plan failed, need new approach

DECISION RULES:
1. If battery < 20%, prioritize CHARGE
2. If holding object, prioritize PLACE at target zone
3. If task pending and no object held, prioritize PICK
4. If no tasks, WAIT or help other robots
5. Always consider distance and efficiency
6. Avoid collisions with other robots

Respond with JSON:
{
  "action": "ACTION_TYPE",
  "target": { "x": number, "y": number, "theta": number } or { "objectId": string } or { "zoneId": string },
  "reasoning": "Brief explanation of why this action",
  "confidence": 0.0-1.0,
  "priority": 1-10
}`;

const TASK_PARSE_PROMPT = `You are a natural language parser for a robot task planner.
Convert the user's command into a sequence of robot actions.

AVAILABLE OBJECT TYPES: STEEL_BEAM, CONCRETE_BLOCK, PIPE_SECTION, ELECTRICAL_PANEL, HVAC_UNIT, TOOL_BOX, SAFETY_EQUIPMENT, SCAFFOLDING_PART

AVAILABLE ZONE TYPES: MATERIAL_STORAGE, ASSEMBLY_AREA, STAGING_ZONE, WORK_ZONE, RESTRICTED_AREA, CHARGING_STATION, INSPECTION_POINT

TASK EXAMPLES:
- "Move all steel beams to assembly area" → Multiple PICK+PLACE tasks
- "Organize the materials" → Sort by type to appropriate zones
- "Check zone A" → NAVIGATE to zone for inspection

Respond with JSON array of tasks:
[
  {
    "action": "PICK" | "PLACE" | "NAVIGATE",
    "objectType": "type or null",
    "objectId": "specific id or null",
    "targetZone": "zone id",
    "reasoning": "why this task",
    "priority": 1-10
  }
]`;

const FAILURE_PROMPT = `A robot action has failed. Analyze the failure and suggest a recovery action.

FAILURE TYPES:
- PATH_BLOCKED: Obstacle in the way
- OBJECT_UNREACHABLE: Cannot reach object
- GRIPPER_FAILED: Could not grasp object
- BATTERY_LOW: Not enough charge
- COLLISION_RISK: Another robot in the way

Suggest ONE recovery action with reasoning.

Respond with JSON:
{
  "action": "REPLAN" | "WAIT" | "ALTERNATE_PATH" | "ABORT",
  "newTarget": { ... } or null,
  "reasoning": "Why this recovery",
  "waitTime": seconds or null
}`;

// ============================================
// AI DECISION ENGINE IMPLEMENTATION
// ============================================

export class GeminiDecisionEngine implements IAIDecisionEngine {
  private apiKey: string;
  private model: string;
  private genAI: any = null;

  constructor(apiKey?: string, model: string = 'gemini-2.0-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
    
    // Initialize SDK if API key available
    if (this.apiKey) {
      this.initializeSDK();
    }
  }

  private async initializeSDK(): Promise<void> {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
    } catch (error) {
      console.warn('Could not initialize Gemini SDK, will use fallback');
    }
  }

  // ============================================
  // CORE DECISION MAKING
  // ============================================

  async decideNextAction(context: DecisionContext): Promise<Decision> {
    // If no API key, use rule-based fallback
    if (!this.apiKey) {
      return this.ruleBasedDecision(context);
    }

    try {
      const prompt = this.buildDecisionPrompt(context);
      const response = await this.callGemini(prompt);
      return this.parseDecisionResponse(response);
    } catch (error) {
      console.error('AI decision error, using fallback:', error);
      return this.ruleBasedDecision(context);
    }
  }

  // ============================================
  // NATURAL LANGUAGE PARSING
  // ============================================

  async parseCommand(command: string, context: DecisionContext): Promise<Decision[]> {
    if (!this.apiKey) {
      return this.ruleBasedCommandParse(command, context);
    }

    try {
      const prompt = this.buildParsePrompt(command, context);
      const response = await this.callGemini(prompt);
      return this.parseTaskResponse(response, context);
    } catch (error) {
      console.error('Command parse error:', error);
      return this.ruleBasedCommandParse(command, context);
    }
  }

  // ============================================
  // FAILURE HANDLING
  // ============================================

  async handleFailure(
    failedAction: string,
    error: string,
    context: DecisionContext
  ): Promise<Decision> {
    if (!this.apiKey) {
      return this.ruleBasedFailureHandler(failedAction, error, context);
    }

    try {
      const prompt = this.buildFailurePrompt(failedAction, error, context);
      const response = await this.callGemini(prompt);
      return this.parseFailureResponse(response, context);
    } catch (err) {
      console.error('Failure handling error:', err);
      return this.ruleBasedFailureHandler(failedAction, error, context);
    }
  }

  // ============================================
  // TASK DECOMPOSITION
  // ============================================

  async decomposeTask(task: any, context: DecisionContext): Promise<Decision[]> {
    // Break down complex task into atomic actions
    const decisions: Decision[] = [];

    if (task.type === 'PICK_AND_PLACE') {
      // 1. Navigate to object
      if (task.sourceZone) {
        decisions.push({
          action: 'NAVIGATE',
          goal: {
            type: 'NAVIGATE',
            targetPose: this.getZoneCenter(task.sourceZone, context),
            tolerance: 0.5,
          },
          reasoning: `Navigate to ${task.sourceZone} to pick up object`,
          confidence: 0.9,
          priority: task.priority || 5,
        });
      }

      // 2. Pick object
      if (task.objectId) {
        const obj = context.availableObjects.find(o => o.id === task.objectId);
        if (obj) {
          decisions.push({
            action: 'PICK',
            goal: {
              type: 'PICK',
              objectId: task.objectId,
              objectPose: { x: obj.pose.x, y: obj.pose.y, theta: 0 },
              approachDistance: 0.5,
              graspForce: 50,
            },
            reasoning: `Pick up ${obj.type}`,
            confidence: 0.85,
            priority: task.priority || 5,
          });
        }
      }

      // 3. Navigate to target
      if (task.targetZone) {
        decisions.push({
          action: 'NAVIGATE',
          goal: {
            type: 'NAVIGATE',
            targetPose: this.getZoneCenter(task.targetZone, context),
            tolerance: 0.5,
          },
          reasoning: `Navigate to ${task.targetZone} for placement`,
          confidence: 0.9,
          priority: task.priority || 5,
        });
      }

      // 4. Place object
      decisions.push({
        action: 'PLACE',
        goal: {
          type: 'PLACE',
          targetPose: this.getZoneCenter(task.targetZone, context),
          objectId: task.objectId || '',
          placeHeight: 0,
        },
        reasoning: 'Place object at target zone',
        confidence: 0.85,
        priority: task.priority || 5,
      });
    }

    return decisions;
  }

  // ============================================
  // GEMINI API CALL
  // ============================================

  private async callGemini(prompt: string): Promise<string> {
    // Try using SDK first
    if (this.genAI) {
      try {
        const response = await this.genAI.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        });
        return response.text || '';
      } catch (sdkError) {
        console.warn('SDK call failed, falling back to fetch:', sdkError);
      }
    }

    // Fallback to direct API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Invalid Gemini response');
  }

  // ============================================
  // PROMPT BUILDERS
  // ============================================

  private buildDecisionPrompt(context: DecisionContext): string {
    return `${DECISION_PROMPT}

CURRENT CONTEXT:
Robot Status:
- ID: ${context.robotStatus.id}
- State: ${context.robotStatus.state}
- Position: (${context.robotStatus.pose.x.toFixed(2)}, ${context.robotStatus.pose.y.toFixed(2)})
- Battery: ${context.robotStatus.battery.toFixed(1)}%
- Holding: ${context.robotStatus.heldObjectId || 'nothing'}

Available Objects (${context.availableObjects.length}):
${context.availableObjects.slice(0, 5).map(o => 
  `- ${o.id}: ${o.type} at (${o.pose.x.toFixed(1)}, ${o.pose.y.toFixed(1)})`
).join('\n')}

Available Zones (${context.availableZones.length}):
${context.availableZones.map(z => 
  `- ${z.id}: ${z.type}`
).join('\n')}

Pending Tasks: ${context.pendingTasks.length}
${context.pendingTasks.slice(0, 3).map(t => 
  `- ${t.type}: ${t.objectId || 'any'} → ${t.targetZone}`
).join('\n')}

What should this robot do next?`;
  }

  private buildParsePrompt(command: string, context: DecisionContext): string {
    return `${TASK_PARSE_PROMPT}

AVAILABLE OBJECTS:
${context.availableObjects.map(o => `- ${o.id}: ${o.type}`).join('\n')}

AVAILABLE ZONES:
${context.availableZones.map(z => `- ${z.id}: ${z.type}`).join('\n')}

USER COMMAND: "${command}"

Parse this into robot tasks:`;
  }

  private buildFailurePrompt(
    failedAction: string,
    error: string,
    context: DecisionContext
  ): string {
    return `${FAILURE_PROMPT}

FAILED ACTION: ${failedAction}
ERROR: ${error}

ROBOT STATE:
- Position: (${context.robotStatus.pose.x.toFixed(2)}, ${context.robotStatus.pose.y.toFixed(2)})
- Battery: ${context.robotStatus.battery.toFixed(1)}%
- State: ${context.robotStatus.state}

What recovery action should be taken?`;
  }

  // ============================================
  // RESPONSE PARSERS
  // ============================================

  private parseDecisionResponse(response: string): Decision {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      
      const data: GeminiResponse = JSON.parse(jsonMatch[0]);
      
      return {
        action: data.action as Decision['action'],
        goal: this.targetToGoal(data.action, data.target),
        reasoning: data.reasoning,
        confidence: data.confidence || 0.5,
        priority: data.priority || 5,
      };
    } catch (error) {
      return {
        action: 'WAIT',
        reasoning: 'Could not parse AI response, waiting',
        confidence: 0.1,
        priority: 1,
      };
    }
  }

  private parseTaskResponse(response: string, context: DecisionContext): Decision[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');
      
      const tasks = JSON.parse(jsonMatch[0]);
      
      return tasks.map((task: any) => ({
        action: task.action,
        goal: this.targetToGoal(task.action, task),
        reasoning: task.reasoning,
        confidence: 0.7,
        priority: task.priority || 5,
      }));
    } catch (error) {
      return [];
    }
  }

  private parseFailureResponse(response: string, context: DecisionContext): Decision {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      
      const data = JSON.parse(jsonMatch[0]);
      
      return {
        action: data.action === 'ABORT' ? 'WAIT' : 'REPLAN',
        reasoning: data.reasoning,
        confidence: 0.6,
        priority: 8,
      };
    } catch (error) {
      return {
        action: 'WAIT',
        reasoning: 'Recovery parse failed, waiting',
        confidence: 0.1,
        priority: 1,
      };
    }
  }

  // ============================================
  // RULE-BASED FALLBACKS (when AI unavailable)
  // ============================================

  private ruleBasedDecision(context: DecisionContext): Decision {
    const { robotStatus, pendingTasks, availableObjects } = context;

    // Rule 1: Low battery → Charge
    if (robotStatus.battery < 20) {
      return {
        action: 'CHARGE',
        goal: {
          type: 'CHARGE',
          stationId: 'charging-1',
          stationPose: { x: 50, y: 50, theta: 0 },
        },
        reasoning: 'Battery low, need to charge',
        confidence: 0.95,
        priority: 10,
      };
    }

    // Rule 2: Holding object → Place it
    if (robotStatus.heldObjectId) {
      const task = pendingTasks.find(t => t.objectId === robotStatus.heldObjectId);
      if (task) {
        const targetPose = this.getZoneCenter(task.targetZone, context);
        return {
          action: 'PLACE',
          goal: {
            type: 'PLACE',
            targetPose,
            objectId: robotStatus.heldObjectId,
            placeHeight: 0,
          },
          reasoning: `Placing held object at ${task.targetZone}`,
          confidence: 0.9,
          priority: 7,
        };
      }
    }

    // Rule 3: Pending task → Pick object
    if (pendingTasks.length > 0) {
      const task = pendingTasks[0];
      const obj = availableObjects.find(o => o.id === task.objectId || o.type === task.objectType);
      
      if (obj) {
        return {
          action: 'PICK',
          goal: {
            type: 'PICK',
            objectId: obj.id,
            objectPose: { x: obj.pose.x, y: obj.pose.y, theta: 0 },
            approachDistance: 0.5,
            graspForce: 50,
          },
          reasoning: `Picking ${obj.type} for pending task`,
          confidence: 0.85,
          priority: 6,
        };
      }
    }

    // Default: Wait
    return {
      action: 'WAIT',
      reasoning: 'No pending tasks, waiting for instructions',
      confidence: 0.5,
      priority: 1,
    };
  }

  private ruleBasedCommandParse(command: string, context: DecisionContext): Decision[] {
    const decisions: Decision[] = [];
    const lowerCmd = command.toLowerCase();

    // Simple keyword matching
    if (lowerCmd.includes('move') || lowerCmd.includes('pindah')) {
      // Find mentioned object type
      for (const obj of context.availableObjects) {
        if (lowerCmd.includes(obj.type.toLowerCase().replace('_', ' '))) {
          decisions.push({
            action: 'PICK',
            goal: {
              type: 'PICK',
              objectId: obj.id,
              objectPose: { x: obj.pose.x, y: obj.pose.y, theta: 0 },
              approachDistance: 0.5,
              graspForce: 50,
            },
            reasoning: `Pick ${obj.type} (matched from command)`,
            confidence: 0.6,
            priority: 5,
          });
          break;
        }
      }
    }

    return decisions;
  }

  private ruleBasedFailureHandler(
    failedAction: string,
    error: string,
    context: DecisionContext
  ): Decision {
    if (error.includes('blocked') || error.includes('collision')) {
      return {
        action: 'REPLAN',
        reasoning: 'Path blocked, replanning route',
        confidence: 0.7,
        priority: 8,
      };
    }

    return {
      action: 'WAIT',
      reasoning: `Action ${failedAction} failed: ${error}. Waiting before retry.`,
      confidence: 0.5,
      priority: 3,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private targetToGoal(action: string, target: any): RobotGoal | undefined {
    if (!target) return undefined;

    switch (action) {
      case 'NAVIGATE':
        return {
          type: 'NAVIGATE',
          targetPose: target.x !== undefined ? target : { x: 0, y: 0, theta: 0 },
          tolerance: 0.5,
        };
      case 'PICK':
        return {
          type: 'PICK',
          objectId: target.objectId || target.id || '',
          objectPose: { x: target.x || 0, y: target.y || 0, theta: 0 },
          approachDistance: 0.5,
          graspForce: 50,
        };
      case 'PLACE':
        return {
          type: 'PLACE',
          targetPose: { x: target.x || 0, y: target.y || 0, theta: 0 },
          objectId: target.objectId || '',
          placeHeight: 0,
        };
      case 'CHARGE':
        return {
          type: 'CHARGE',
          stationId: target.stationId || 'charging-1',
          stationPose: { x: target.x || 50, y: target.y || 50, theta: 0 },
        };
      default:
        return undefined;
    }
  }

  private getZoneCenter(zoneId: string, context: DecisionContext): Pose2D {
    const zone = context.availableZones.find(z => z.id === zoneId);
    if (zone && zone.bounds) {
      return {
        x: zone.bounds.x + zone.bounds.width / 2,
        y: zone.bounds.y + zone.bounds.height / 2,
        theta: 0,
      };
    }
    return { x: 0, y: 0, theta: 0 };
  }
}

// Export singleton instance
export const aiDecisionEngine = new GeminiDecisionEngine();
