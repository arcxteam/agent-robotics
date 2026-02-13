import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Demo webhooks storage
let webhooks: Array<{
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastTriggered: string | null;
}> = [];

export async function GET() {
  // Return webhooks with masked secrets
  const maskedWebhooks = webhooks.map(w => ({
    ...w,
    secret: `whsec_${'•'.repeat(20)}`
  }));
  
  return NextResponse.json({ 
    success: true, 
    data: maskedWebhooks 
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, events } = body;
    
    if (!url) {
      return NextResponse.json({ 
        success: false, 
        error: 'Webhook URL required' 
      }, { status: 400 });
    }
    
    const newWebhook = {
      id: `wh_${Date.now()}`,
      name: name || 'Webhook',
      url,
      events: events || ['task.completed', 'robot.status', 'simulation.finished'],
      secret: `whsec_${uuidv4().replace(/-/g, '')}`,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      lastTriggered: null
    };
    
    webhooks.push(newWebhook);
    
    return NextResponse.json({ 
      success: true, 
      data: newWebhook,
      message: 'Webhook created. Save the secret - it won\'t be shown again.'
    });
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create webhook' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');
    
    if (!webhookId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Webhook ID required' 
      }, { status: 400 });
    }
    
    webhooks = webhooks.filter(w => w.id !== webhookId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook deleted' 
    });
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete webhook' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Webhook ID required' 
      }, { status: 400 });
    }
    
    const webhookIndex = webhooks.findIndex(w => w.id === id);
    if (webhookIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Webhook not found' 
      }, { status: 404 });
    }
    
    webhooks[webhookIndex] = {
      ...webhooks[webhookIndex],
      status: status || webhooks[webhookIndex].status
    };
    
    return NextResponse.json({ 
      success: true, 
      data: webhooks[webhookIndex]
    });
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update webhook' 
    }, { status: 500 });
  }
}

// Test webhook endpoint
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');
    
    if (!webhookId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Webhook ID required' 
      }, { status: 400 });
    }
    
    const webhook = webhooks.find(w => w.id === webhookId);
    if (!webhook) {
      return NextResponse.json({ 
        success: false, 
        error: 'Webhook not found' 
      }, { status: 404 });
    }
    
    // Simulate sending a test event
    try {
      // In production, actually POST to the webhook URL
      // await fetch(webhook.url, { method: 'POST', body: JSON.stringify({ test: true }) });
      
      // Update last triggered
      const webhookIndex = webhooks.findIndex(w => w.id === webhookId);
      webhooks[webhookIndex].lastTriggered = new Date().toISOString();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Test event sent successfully',
        data: { url: webhook.url, timestamp: new Date().toISOString() }
      });
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send test event' 
      }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to test webhook' 
    }, { status: 500 });
  }
}
