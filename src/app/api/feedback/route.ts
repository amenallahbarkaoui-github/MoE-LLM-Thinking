import { NextRequest, NextResponse } from "next/server"
import { metricsTracker } from "@/lib/metrics"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, agentId, wasUseful } = body

    if (!sessionId || !agentId || typeof wasUseful !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, agentId, wasUseful (boolean)" },
        { status: 400 }
      )
    }

    await metricsTracker.recordFeedback(sessionId, agentId, wasUseful)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    )
  }
}
