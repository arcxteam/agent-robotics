import { NextRequest, NextResponse } from 'next/server';

interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// Demo database configurations
let dbConfigs: Record<string, DatabaseConfig> = {
  primary: {
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'arcspatial',
    username: 'admin',
    password: ''
  }
};

export async function GET() {
  // Return configs with masked passwords
  const maskedConfigs = Object.entries(dbConfigs).reduce((acc, [key, config]) => {
    acc[key] = {
      ...config,
      password: config.password ? '••••••••' : ''
    };
    return acc;
  }, {} as Record<string, DatabaseConfig>);
  
  return NextResponse.json({ 
    success: true, 
    data: maskedConfigs 
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;
    
    if (action === 'test') {
      // Test database connection (demo mode - simulated)
      const { type, host, port } = config as DatabaseConfig;
      
      // Simulate connection test with delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo: Check for known good hosts
      const knownGoodHosts = ['localhost', '127.0.0.1', 'db.arcspatial.com'];
      const isReachable = knownGoodHosts.some(h => host.includes(h)) || host.includes('rds.amazonaws.com');
      
      if (!isReachable) {
        return NextResponse.json({ 
          success: false, 
          error: `Could not connect to ${type} at ${host}:${port}. Host unreachable.`,
          details: {
            host,
            port,
            error: 'ECONNREFUSED'
          }
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Successfully connected to ${type} database at ${host}:${port}`,
        data: {
          latency: Math.floor(Math.random() * 50) + 10,
          version: type === 'postgresql' ? '15.4' : type === 'mysql' ? '8.0.35' : '7.0.2',
          status: 'connected'
        }
      });
    }
    
    if (action === 'save') {
      const { name, ...configData } = config;
      dbConfigs[name || 'primary'] = configData as DatabaseConfig;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Database configuration saved'
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process database request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
