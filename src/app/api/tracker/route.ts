import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build Prisma query clauses
    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { company: { contains: search } },
        { location: { contains: search } },
        { source: { contains: search } },
      ];
    }

    // Get total items count for pagination metrics
    const totalCount = await prisma.jobApplication.count({ where });

    // Query databases
    const items = await prisma.jobApplication.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    // Compute application density over the last 14 days for the Recharts graph
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const applications = await prisma.jobApplication.findMany({
      where: {
        status: "APPLIED",
        appliedAt: {
          gte: fourteenDaysAgo,
        },
      },
      select: {
        appliedAt: true,
      },
    });

    // Bucket counts by day
    const densityMap: { [key: string]: number } = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      densityMap[d.toLocaleDateString(undefined, { month: "short", day: "numeric" })] = 0;
    }

    applications.forEach((app: any) => {
      if (app.appliedAt) {
        const dateStr = new Date(app.appliedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        if (densityMap[dateStr] !== undefined) {
          densityMap[dateStr] += 1;
        }
      }
    });

    const densityData = Object.keys(densityMap)
      .reverse()
      .map((date) => ({
        date,
        applications: densityMap[date],
      }));

    return NextResponse.json({
      success: true,
      items,
      totalCount,
      page,
      totalPages,
      densityData,
    });
  } catch (err: any) {
    console.error("Tracker API Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve tracker metrics" },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
