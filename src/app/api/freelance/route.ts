import { NextRequest, NextResponse } from "next/server";
import { generateFreelancePitchWithClaude } from "@/lib/claude";

const MOCK_FREELANCE_JOBS = [
  {
    id: "free-1",
    title: "MERN Stack E-Commerce Dashboard",
    description: "Looking for an expert developer to create a sales and inventory dashboard using React, Node.js, Express, and MongoDB. Need charts integration and role-based access control.",
    budget: "$1500",
    clientCountry: "United States",
    source: "Upwork",
  },
  {
    id: "free-2",
    title: "React Native Mobile App Bug Fixes & API Sync",
    description: "Need help resolving state synchronization bugs in a React Native app. Must connect seamlessly to a pre-existing Express/MongoDB backend.",
    budget: "$800",
    clientCountry: "United Kingdom",
    source: "Freelancer.com",
  },
  {
    id: "free-3",
    title: "Full Stack Web Developer (Node.js & React)",
    description: "Build a single-page app with React and a secure authentication flow using Node.js/Express. We need a clean UI with modern glassmorphism or dark mode styling.",
    budget: "$1200",
    clientCountry: "Germany",
    source: "Upwork",
  },
  {
    id: "free-4",
    title: "MongoDB Schema Optimizer & API Speed Analyst",
    description: "Our current MERN app runs slow on aggregations. We need an expert to inspect our MongoDB indexing and rewrite Node/Express controllers to optimize response times under 200ms.",
    budget: "$500",
    clientCountry: "India",
    source: "Freelancer.com",
  }
];

export async function GET(req: NextRequest) {
  return NextResponse.json({ success: true, assignments: MOCK_FREELANCE_JOBS });
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, budget } = await req.json();
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const pitch = await generateFreelancePitchWithClaude(title, description, budget || "$1000");
    return NextResponse.json({ success: true, pitch });
  } catch (err: any) {
    console.error("Freelance pitch generation failed:", err);
    return NextResponse.json({ error: err.message || "Failed to generate pitch" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
