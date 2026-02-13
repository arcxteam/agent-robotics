import { NextResponse } from 'next/server';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  thinking?: {
    type: 'enabled' | 'disabled';
  };
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      reasoning?: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Get API key from environment
const ZAI_API_KEY = process.env.ZAI_API_KEY || 'your-api-key-here';
const ZAI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';

/**
 * Call z.ai LLM API for task scheduling
 */
export async function callLLM(messages: Message[], model: string = 'glm-4.7', temperature: number = 0.7) {
  try {
    const requestBody: ChatCompletionRequest = {
      model,
      messages,
      thinking: {
        type: 'enabled'
      },
      stream: false,
      max_tokens: 4096,
      temperature
    };

    const response = await fetch(ZAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('z.ai API error:', response.status, errorText);
      throw new Error(`z.ai API error: ${response.status} - ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}

/**
 * Generate task scheduling prompt
 */
export function generateSchedulingPrompt(
  robots: any[],
  tasks: any[],
  environment: any
): Message[] {
  const robotInfo = robots.map(r => `
- Robot ID: ${r.id}
  Type: ${r.type}
  Status: ${r.status}
  Battery: ${r.battery}%
  Location: (${r.x}, ${r.y})
  Current Task: ${r.currentTaskId || 'None'}
  Capacity: ${r.capacity} kg
  Speed: ${r.speed} m/s`).join('\n');

  const taskInfo = tasks.map(t => `
- Task ID: ${t.id}
  Type: ${t.type}
  Priority: ${t.priority}
  Start Location: (${t.startLocation.x}, ${t.startLocation.y})
  End Location: (${t.endLocation.x}, ${t.endLocation.y})
  Items: ${t.items ? t.items.length : 0}`).join('\n');

  return [
    {
      role: 'system',
      content: `You are an advanced AI task scheduling system for autonomous robot fleets. Your goal is to optimize task assignments to maximize efficiency, minimize battery usage, and ensure all high-priority tasks are completed first.

Rules:
1. Only assign tasks to robots with battery >= 30%
2. Prefer robots that are IDLE over MOVING robots
3. Prioritize tasks: URGENT > HIGH > NORMAL > LOW
4. Consider distance: assign closer robots when possible
5. Balance workload across the fleet
6. If a robot is already busy, don't assign new tasks

Output format:
Respond with a JSON array of assignments:
[
  {
    "taskId": "task-id",
    "robotId": "robot-id",
    "reasoning": "explain why this assignment is optimal",
    "priority": 1-5 (5 being highest)
  }
]

Only include tasks that can be assigned based on available robots.`
    },
    {
      role: 'user',
      content: `Environment: ${environment.name} (${environment.width}m x ${environment.height}m)

Available Robots:
${robotInfo}

Pending Tasks:
${taskInfo}

Please optimize the task assignments and return JSON output.`
    }
  ];
}

/**
 * Parse LLM response to get assignments
 */
export function parseLLMResponse(content: string): any[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON found, try to parse the entire content
    return JSON.parse(content);
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    console.error('Content:', content);
    return [];
  }
}
