import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const apps = await prisma.jobApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(apps);
  } catch (err: any) {
    console.error("Failed to query applications:", err);
    return NextResponse.json({ error: "Failed to retrieve applications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, matchScore, customizedCoverLetter, customizedResumePath, errorReason } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const data: any = {};
    if (status !== undefined) {
      data.status = status;
      if (status === "APPLIED") {
        data.appliedAt = new Date();
      }
    }
    if (matchScore !== undefined) data.matchScore = Number(matchScore);
    if (customizedCoverLetter !== undefined) data.customizedCoverLetter = customizedCoverLetter;
    if (customizedResumePath !== undefined) data.customizedResumePath = customizedResumePath;
    if (errorReason !== undefined) data.errorReason = errorReason;

    const updatedApp = await prisma.jobApplication.update({
      where: { id },
      data,
    });

    // Also write a system event log
    await prisma.systemEventLog.create({
      data: {
        level: status === "ACTION_NEEDED" ? "WARNING" : status === "APPLIED" ? "SUCCESS" : "INFO",
        message: `Application for "${updatedApp.title}" at ${updatedApp.company} updated status to ${status || updatedApp.status}`,
      },
    });

    return NextResponse.json({ success: true, application: updatedApp });
  } catch (err: any) {
    console.error("Failed to update application:", err);
    return NextResponse.json({ error: err.message || "Failed to update application" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, company, description } = await req.json();
    if (!title || !company || !description) {
      return NextResponse.json({ error: "Title, Company, and Description are required" }, { status: 400 });
    }
    const id = Math.random().toString(36).substring(7);
    const newJob = await prisma.jobApplication.create({
      data: {
        title,
        company,
        description,
        location: "Remote",
        workMode: "Remote",
        url: `https://applyai.io/manual/${id}`,
        sourceUrl: `https://applyai.io/manual/${id}`,
        targetEmail: "sricharanvarigonda07@gmail.com",
        source: "Manual Ingestion",
        status: "QUEUED",
        matchScore: 0,
      },
    });

    // Also write a system event log
    await prisma.systemEventLog.create({
      data: {
        level: "SUCCESS",
        message: `Manually injected job: "${title}" at ${company} into pipeline queue.`,
      },
    });

    return NextResponse.json({ success: true, application: newJob });
  } catch (err: any) {
    console.error("Failed to create application:", err);
    return NextResponse.json({ error: err.message || "Failed to create application" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      // Delete single application
      const deleted = await prisma.jobApplication.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: `Removed job listing: ${deleted.title}` });
    } else {
      // Clear all
      await prisma.jobApplication.deleteMany({});
      return NextResponse.json({ success: true, message: "Cleared all job listings." });
    }
  } catch (err: any) {
    console.error("Failed to delete application:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
