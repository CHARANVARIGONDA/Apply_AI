import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const logs = await prisma.systemEventLog.findMany({
      orderBy: { timestamp: "asc" },
      take: 100, // retrieve last 100 logs
    });
    
    return NextResponse.json(logs);
  } catch (err: any) {
    console.error("Failed to query logs:", err);
    return NextResponse.json({ error: "Failed to retrieve logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { level, message } = await req.json();

    if (!level || !message) {
      return NextResponse.json({ error: "Level and message are required" }, { status: 400 });
    }

    const log = await prisma.systemEventLog.create({
      data: {
        level,
        message,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    console.error("Failed to create log:", err);
    return NextResponse.json({ error: err.message || "Failed to log event" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
