import { NextResponse } from "next/server";

const WS_PORT = process.env.SIMULATION_WS_PORT || "3003";

export async function GET() {
  try {
    const res = await fetch(`http://localhost:${WS_PORT}/api/status`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        service: "ArcSpatial Simulation Server",
        timestamp: new Date().toISOString(),
        connections: 0,
        simulation: { state: "OFFLINE" },
        fleet: { total: 0, active: 0, idle: 0, charging: 0, robots: [] },
        tasks: { pending: 0, inProgress: 0, completed: 0, failed: 0, total: 0 },
        objects: { total: 0, available: 0, picked: 0, placed: 0, types: [] },
        zones: { total: 0, list: [] },
        metrics: {
          totalTasksCreated: 0,
          totalTasksCompleted: 0,
          totalTasksFailed: 0,
          averageTaskTime: 0,
          fleetEfficiency: 0,
          pickSuccessRate: 0,
        },
      },
      { status: 503 }
    );
  }
}
