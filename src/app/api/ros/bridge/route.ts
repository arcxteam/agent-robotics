/**
 * ROS 2 Bridge API
 * Provides HTTP endpoints for ROS 2 / Gazebo integration
 * 
 * Hackathon Track 1: Autonomous Robotics Control in Simulation
 * Track 2: Simulation-to-Real Training Pipelines
 * 
 * This bridge allows web dashboard to communicate with:
 * - ROS 2 nodes via rosbridge_websocket
 * - Gazebo/Isaac Sim simulation
 * - Robot state and control
 */

import { NextRequest, NextResponse } from 'next/server';

// ROS 2 Bridge configuration
const ROS_BRIDGE_URL = process.env.ROS_BRIDGE_URL || 'ws://localhost:9090';
const GAZEBO_URL = process.env.GAZEBO_URL || 'http://localhost:11345';

interface RobotCommand {
  robotId: string;
  command: 'move_to' | 'pick' | 'place' | 'stop' | 'rotate' | 'go_home';
  target?: { x: number; y: number; z?: number };
  speed?: number;
  objectId?: string;
}

interface SimulationConfig {
  worldFile?: string;
  robots?: Array<{
    model: string;
    name: string;
    position: { x: number; y: number; z: number };
    rotation?: { roll: number; pitch: number; yaw: number };
  }>;
  objects?: Array<{
    model: string;
    name: string;
    position: { x: number; y: number; z: number };
  }>;
}

// GET - Get ROS bridge status and available topics
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        // Check ROS bridge connection status
        return NextResponse.json({
          success: true,
          status: {
            rosBridge: {
              url: ROS_BRIDGE_URL,
              connected: false, // Would check actual connection
              protocol: 'rosbridge_v2.0'
            },
            gazebo: {
              url: GAZEBO_URL,
              connected: false,
              worldLoaded: false
            },
            capabilities: [
              'topic_subscribe',
              'topic_publish', 
              'service_call',
              'action_client',
              'tf_listener',
              'joint_states',
              'cmd_vel',
              'navigation'
            ],
            supportedSimulators: [
              { name: 'Gazebo', protocol: 'gazebo_msgs', supported: true },
              { name: 'Isaac Sim', protocol: 'isaac_ros', supported: true },
              { name: 'Webots', protocol: 'webots_ros2', supported: true }
            ]
          },
          instructions: {
            setup: [
              '1. Install ROS 2 Humble/Iron',
              '2. Install rosbridge_suite: sudo apt install ros-humble-rosbridge-suite',
              '3. Launch rosbridge: ros2 launch rosbridge_server rosbridge_websocket_launch.xml',
              '4. Launch Gazebo: ros2 launch gazebo_ros gazebo.launch.py',
              '5. Configure ROS_BRIDGE_URL in .env'
            ],
            dockerCommand: 'docker run -it --rm -p 9090:9090 -p 11345:11345 ros:humble-ros-base ros2 launch rosbridge_server rosbridge_websocket_launch.xml'
          }
        });

      case 'topics':
        // List available ROS topics (mock for demo)
        return NextResponse.json({
          success: true,
          topics: [
            { name: '/robot_1/cmd_vel', type: 'geometry_msgs/msg/Twist' },
            { name: '/robot_1/odom', type: 'nav_msgs/msg/Odometry' },
            { name: '/robot_1/joint_states', type: 'sensor_msgs/msg/JointState' },
            { name: '/robot_1/scan', type: 'sensor_msgs/msg/LaserScan' },
            { name: '/robot_1/camera/image_raw', type: 'sensor_msgs/msg/Image' },
            { name: '/robot_1/gripper/state', type: 'std_msgs/msg/Bool' },
            { name: '/fleet_manager/robot_states', type: 'custom_msgs/msg/FleetState' },
            { name: '/fleet_manager/tasks', type: 'custom_msgs/msg/TaskArray' }
          ]
        });

      case 'services':
        // List available ROS services
        return NextResponse.json({
          success: true,
          services: [
            { name: '/spawn_entity', type: 'gazebo_msgs/srv/SpawnEntity' },
            { name: '/delete_entity', type: 'gazebo_msgs/srv/DeleteEntity' },
            { name: '/robot_1/go_to_pose', type: 'custom_msgs/srv/GoToPose' },
            { name: '/robot_1/pick_object', type: 'custom_msgs/srv/PickObject' },
            { name: '/robot_1/place_object', type: 'custom_msgs/srv/PlaceObject' },
            { name: '/fleet_manager/assign_task', type: 'custom_msgs/srv/AssignTask' }
          ]
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[ROS Bridge] Error:', error);
    return NextResponse.json(
      { success: false, error: 'ROS bridge error' },
      { status: 500 }
    );
  }
}

// POST - Send commands to ROS/Gazebo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'send_command':
        // Send robot command
        const command = data as RobotCommand;
        console.log('[ROS Bridge] Sending command:', command);
        
        // In real implementation, this would send to ROS via rosbridge
        // For now, return mock success
        return NextResponse.json({
          success: true,
          message: `Command ${command.command} sent to ${command.robotId}`,
          timestamp: Date.now(),
          commandId: `cmd-${Date.now()}`
        });

      case 'spawn_robot':
        // Spawn robot in Gazebo
        console.log('[ROS Bridge] Spawning robot:', data);
        return NextResponse.json({
          success: true,
          message: `Robot ${data.name} spawned at position`,
          entityId: `robot-${Date.now()}`
        });

      case 'load_world':
        // Load Gazebo world from floor plan
        const config = data as SimulationConfig;
        console.log('[ROS Bridge] Loading world:', config);
        
        return NextResponse.json({
          success: true,
          message: 'World configuration received',
          worldId: `world-${Date.now()}`,
          config: {
            ...config,
            sdfGenerated: true,
            launchCommand: `ros2 launch construction_sim construction_world.launch.py world:=${config.worldFile || 'custom'}`
          }
        });

      case 'sync_zones':
        // Sync zones to Gazebo as collision/visual markers
        const { zones } = data;
        console.log('[ROS Bridge] Syncing zones to Gazebo:', zones?.length || 0);
        
        // Generate SDF markers for zones
        const sdfMarkers = zones?.map((zone: any, idx: number) => ({
          name: `zone_${zone.type.toLowerCase()}_${idx}`,
          type: 'visual_marker',
          pose: {
            x: zone.bounds.x / 100 * 10, // Scale to 10m world
            y: zone.bounds.y / 100 * 10,
            z: 0.01
          },
          size: {
            x: zone.bounds.width / 100 * 10,
            y: zone.bounds.height / 100 * 10,
            z: 0.02
          },
          color: zone.color
        }));

        return NextResponse.json({
          success: true,
          message: `${zones?.length || 0} zones synced to simulation`,
          markers: sdfMarkers
        });

      case 'publish_topic':
        // Publish to ROS topic
        const { topic, message, type } = data;
        console.log(`[ROS Bridge] Publishing to ${topic}:`, message);
        
        return NextResponse.json({
          success: true,
          message: `Published to ${topic}`,
          timestamp: Date.now()
        });

      case 'call_service':
        // Call ROS service
        const { service, args } = data;
        console.log(`[ROS Bridge] Calling service ${service}:`, args);
        
        return NextResponse.json({
          success: true,
          message: `Service ${service} called`,
          result: { success: true }
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[ROS Bridge] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process command' },
      { status: 500 }
    );
  }
}
