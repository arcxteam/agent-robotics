import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Type definition for API keys
interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  status: 'active' | 'inactive';
}

// Demo API keys storage (in production, use database)
let apiKeys: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production API Key',
    key: `robo_prod_${uuidv4().replace(/-/g, '')}`,
    createdAt: '2024-01-15T00:00:00Z',
    lastUsed: '2024-02-01T12:30:00Z',
    status: 'active'
  }
];

export async function GET() {
  // Return keys with masked values
  const maskedKeys = apiKeys.map(k => ({
    ...k,
    key: `${k.key.substring(0, 15)}${'•'.repeat(24)}`
  }));
  
  return NextResponse.json({ 
    success: true, 
    data: maskedKeys 
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: name || 'New API Key',
      key: `robo_${Date.now()}_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      status: 'active'
    };
    
    apiKeys.push(newKey);
    
    // Return the full key only once when created
    return NextResponse.json({ 
      success: true, 
      data: newKey,
      message: 'API key created successfully. Save this key - it won\'t be shown again.'
    });
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create API key' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key ID required' 
      }, { status: 400 });
    }
    
    apiKeys = apiKeys.filter(k => k.id !== keyId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'API key deleted' 
    });
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete API key' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!keyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key ID required' 
      }, { status: 400 });
    }
    
    if (action === 'regenerate') {
      const keyIndex = apiKeys.findIndex(k => k.id === keyId);
      if (keyIndex === -1) {
        return NextResponse.json({ 
          success: false, 
          error: 'Key not found' 
        }, { status: 404 });
      }
      
      const newKeyValue = `robo_${Date.now()}_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
      apiKeys[keyIndex] = {
        ...apiKeys[keyIndex],
        key: newKeyValue,
        createdAt: new Date().toISOString()
      };
      
      return NextResponse.json({ 
        success: true, 
        data: apiKeys[keyIndex],
        message: 'API key regenerated. Save this key - it won\'t be shown again.'
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update API key' 
    }, { status: 500 });
  }
}
