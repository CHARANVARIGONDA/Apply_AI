import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const config = await prisma.userConfig.findUnique({
      where: { id: 1 },
    });
    
    return NextResponse.json(config || {});
  } catch (err: any) {
    console.error("Failed to retrieve settings:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle full database wipe action
    if (body.action === "WIPE_DATABASE") {
      await prisma.jobApplication.deleteMany({});
      await prisma.systemEventLog.deleteMany({});
      await prisma.documentVault.deleteMany({});
      await prisma.userConfig.deleteMany({});
      
      // Re-create blank config
      await prisma.userConfig.create({
        data: { id: 1 },
      });

      return NextResponse.json({ success: true, message: "Local SQLite database successfully purged." });
    }

    const {
      resumePath,
      parsedProfile,
      targetTitle,
      locations,
      workModes,
      salaryMin,
      salaryMax,
      strategy,
      industryPreferences,
      userEmail,
      gmailAppPassword,
      safetyMinScore,
      safetyInterval,
    } = body;

    const data: any = {};
    if (resumePath !== undefined) data.resumePath = resumePath;
    if (parsedProfile !== undefined) data.parsedProfile = typeof parsedProfile === "string" ? parsedProfile : JSON.stringify(parsedProfile);
    if (targetTitle !== undefined) data.targetTitle = targetTitle;
    if (locations !== undefined) data.locations = Array.isArray(locations) ? JSON.stringify(locations) : locations;
    if (workModes !== undefined) data.workModes = Array.isArray(workModes) ? JSON.stringify(workModes) : workModes;
    if (salaryMin !== undefined) data.salaryMin = Number(salaryMin);
    if (salaryMax !== undefined) data.salaryMax = Number(salaryMax);
    if (strategy !== undefined) data.strategy = strategy;
    if (industryPreferences !== undefined) data.industryPreferences = Array.isArray(industryPreferences) ? JSON.stringify(industryPreferences) : industryPreferences;
    if (userEmail !== undefined) data.userEmail = userEmail;
    if (gmailAppPassword !== undefined) data.gmailAppPassword = gmailAppPassword;
    if (safetyMinScore !== undefined) data.safetyMinScore = Number(safetyMinScore);
    if (safetyInterval !== undefined) data.safetyInterval = Number(safetyInterval);

    const updatedConfig = await prisma.userConfig.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (err: any) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: err.message || "Failed to save configurations" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
