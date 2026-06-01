import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { JobAggregationService, isAllowedJob } from "@/lib/jobs";
import {
  analyzeGapWithClaude,
  customizeResumeWithClaude,
  generateCoverLetterWithClaude,
} from "@/lib/claude";
import { EmailRelayService } from "@/lib/email";
import { PDFDocument, StandardFonts } from "pdf-lib";

let isEngineRunning = false;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

export async function GET() {
  return NextResponse.json({ running: isEngineRunning });
}

export async function POST() {
  if (isEngineRunning) {
    return NextResponse.json(
      { success: false, message: "Engine is already busy processing a job." },
      { status: 409 }
    );
  }

  isEngineRunning = true;

  try {
    const logEvent = async (level: "SUCCESS" | "INFO" | "WARNING" | "ERROR", message: string) => {
      console.log(`[Engine Log] ${level}: ${message}`);
      try {
        await prisma.systemEventLog.create({
          data: { level, message },
        });
      } catch (err) {
        console.error("Failed to write system event log to SQLite:", err);
      }
    };

    // Load User Configuration
    const userConfig = await prisma.userConfig.findUnique({ where: { id: 1 } });
    if (!userConfig) {
      await logEvent("ERROR", "[APPLYAI_OPERATIONAL_LOG_STREAM] Automation stopped: No User Config entry found in SQLite database.");
      isEngineRunning = false;
      return NextResponse.json({ success: false, error: "No User Config entry found." }, { status: 400 });
    }

    if (!userConfig.userEmail || !userConfig.gmailAppPassword) {
      await logEvent("ERROR", "[APPLYAI_OPERATIONAL_LOG_STREAM] Automation stopped: SMTP credentials are not configured in settings.");
      isEngineRunning = false;
      return NextResponse.json({ success: false, error: "SMTP credentials not configured." }, { status: 400 });
    }

    // Check Daily limit of exactly 20 applications
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const appliedToday = await prisma.jobApplication.count({
      where: {
        status: "APPLIED",
        appliedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (appliedToday >= 20) {
      await logEvent("WARNING", `[APPLYAI_OPERATIONAL_LOG_STREAM] Absolute daily threshold met: ${appliedToday}/20 applications completed today. Halting automation loop.`);
      isEngineRunning = false;
      return NextResponse.json({ success: false, limitReached: true, message: "Absolute daily user threshold of 20 applications reached." });
    }

    // Populate Queue if empty (backed ONLY by live APIs, no mockJobs array)
    const queuedCount = await prisma.jobApplication.count({
      where: { status: "QUEUED" },
    });

    if (queuedCount === 0) {
      await logEvent("INFO", "[APPLYAI_OPERATIONAL_LOG_STREAM] Active job queue is empty. Accessing live RSS and Search Engine Index proxy API streams...");

      // Scraping live jobs
      let scrapedJobs: any[] = [];
      try {
        const searchTarget = userConfig.targetTitle || "Developer";
        scrapedJobs = await JobAggregationService.fetchJobs(searchTarget);
        await logEvent("SUCCESS", `[APPLYAI_OPERATIONAL_LOG_STREAM] Aggregator fetched ${scrapedJobs.length} live listings after geofencing and entry-level filters.`);
      } catch (err: any) {
        await logEvent("ERROR", `Live aggregator failed: ${err.message}`);
      }

      // Save new unique jobs to DB
      let addedCount = 0;
      for (const job of scrapedJobs) {
        try {
          const existing = await prisma.jobApplication.findUnique({ where: { url: job.url } });
          if (!existing) {
            await prisma.jobApplication.create({
              data: {
                title: job.title,
                company: job.company,
                description: job.description,
                location: job.location,
                salary: job.salary,
                workMode: job.workMode,
                url: job.url,
                sourceUrl: job.url, // MANDATORY: Dynamic link registration binding
                source: job.source,
                status: "QUEUED",
                matchScore: 0,
              },
            });
            addedCount++;
          } else {
            await prisma.jobApplication.update({
              where: { url: job.url },
              data: { status: "QUEUED" },
            });
          }
        } catch {}
      }

      if (addedCount > 0) {
        await logEvent("INFO", `[APPLYAI_OPERATIONAL_LOG_STREAM] Logged ${addedCount} new unique live listings to local SQLite queue.`);
      }
    }

    // Retrieve the next queued application
    const app = await prisma.jobApplication.findFirst({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
    });

    if (!app) {
      await logEvent("INFO", "[APPLYAI_OPERATIONAL_LOG_STREAM] All queues are fully processed. Count is zero.");
      isEngineRunning = false;
      return NextResponse.json({ success: true, processed: false, message: "Queue is empty." });
    }

    // Process the application
    await logEvent("INFO", `[APPLYAI_OPERATIONAL_LOG_STREAM] Starting sequence for job: "${app.title}" at ${app.company}.`);
    
    let targetEmail = "sricharanvarigonda07@gmail.com";
    let isLocalTestRouting = true;

    try {
      // Update to CUSTOMIZING
      await prisma.jobApplication.update({
        where: { id: app.id },
        data: { status: "CUSTOMIZING" },
      });
      await logEvent("INFO", `[APPLYAI_OPERATIONAL_LOG_STREAM] Shifting application ID ${app.id} ("${app.title}" at ${app.company}) into active CUSTOMIZING state.`);

      // analyzeGap()
      await logEvent("INFO", `Analyzing match compatibility score...`);
      const parsedProfileText = userConfig.parsedProfile || "{}";
      const gapAnalysis = await analyzeGapWithClaude(parsedProfileText, app.description);

      // Save score & analysis
      await prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          matchScore: gapAnalysis.score,
          gapAnalysis: gapAnalysis.gapAnalysisText,
        },
      });

      await logEvent("INFO", `Calculated match compatibility score: ${gapAnalysis.score}%`);

      // customize documentation with timeout
      await logEvent("INFO", "Optimizing resume highlights and compiling Cover Letter via Claude...");
      
      const { cover: customizedCover, resume: customizedResume } = await withTimeout(
        (async () => {
          const cover = await generateCoverLetterWithClaude(
            parsedProfileText,
            app.description,
            "Professional"
          );
          const resume = await customizeResumeWithClaude(
            parsedProfileText,
            app.description
          );
          return { cover, resume };
        })(),
        15000,
        "Customization timed out after 15 seconds"
      );

      // Save optimized contents
      await prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          customizedCoverLetter: customizedCover,
          customizedResumePath: customizedResume,
        },
      });

      // Extract email or fallback to sricharanvarigonda07@gmail.com
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = app.description.match(emailRegex);
      if (emailMatch) {
        targetEmail = emailMatch[0];
        isLocalTestRouting = false;
      }

      // Dynamic applicant name resolution for PDF drawing and emails
      let applicantName = "VVNT SRI CHARAN";
      try {
        if (userConfig.parsedProfile) {
          const parsed = JSON.parse(userConfig.parsedProfile);
          if (parsed.name) applicantName = parsed.name;
        }
      } catch {}

      // Compile PDF bytes
      let pdfBytes: Buffer;
      try {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const page = pdfDoc.addPage([595.276, 841.89]);
        page.drawText(`TAILORED RESUME - ${applicantName.toUpperCase()}`, { x: 50, y: 800, size: 14, font });
        page.drawText(`Applied for: ${app.title} at ${app.company}`, { x: 50, y: 770, size: 10, font });
        page.drawText(customizedResume.substring(0, 1000), { x: 50, y: 730, size: 8, font });
        
        const uint8 = await pdfDoc.save();
        pdfBytes = Buffer.from(uint8);
      } catch {
        pdfBytes = Buffer.from("Tailored Resume Data placeholder");
      }

      // Format email body and handle salutation block greeting duplication
      let htmlBody = customizedCover.replace(/\n/g, "<br/>");
      const salutationRegex = /^(dear|to|hi|hello|respected)/i;
      const hasSalutation = salutationRegex.test(customizedCover.trim());
      if (!hasSalutation) {
        htmlBody = `Dear Hiring Team,<br/><br/>${htmlBody}`;
      }

      await logEvent("INFO", `Relaying SMTP email package via Gmail transporter to: ${targetEmail}...`);
      try {
        await EmailRelayService.sendApplicationEmail(
          userConfig.userEmail,
          userConfig.gmailAppPassword,
          {
            to: targetEmail,
            subject: `Job Application: ${app.title} - ${applicantName}`,
            htmlBody: htmlBody,
            resumeFileName: `Resume_${applicantName.replace(/\s+/g, "_")}_${app.company.replace(/\s+/g, "_")}.pdf`,
            resumeContent: pdfBytes,
          }
        );

        // Mark applied
        const updated = await prisma.jobApplication.update({
          where: { id: app.id },
          data: {
            status: "APPLIED",
            appliedAt: new Date(),
            targetEmail: targetEmail,
          },
        });

        // Refactored Log output formatting details
        let dispatchLogMessage = "";
        if (isLocalTestRouting) {
          dispatchLogMessage = `[APPLYAI_OPERATIONAL_LOG_STREAM] Executing a local routing test stream to user verification address: sricharanvarigonda07@gmail.com.`;
        } else {
          const corporateHRDomain = targetEmail.split("@")[1] || targetEmail;
          dispatchLogMessage = `[APPLYAI_OPERATIONAL_LOG_STREAM] Routing application copy to corporate HR domain: ${corporateHRDomain}.`;
        }

        await logEvent("SUCCESS", dispatchLogMessage);
        isEngineRunning = false;
        return NextResponse.json({ success: true, processed: true, application: updated });

      } catch (sendErr: any) {
        await logEvent("ERROR", `SMTP Relay failed for ${app.company}: ${sendErr.message}`);
        const updated = await prisma.jobApplication.update({
          where: { id: app.id },
          data: { 
            status: "ACTION_NEEDED", 
            errorReason: `SMTP Dispatch failed: ${sendErr.message}`,
            targetEmail: targetEmail,
          },
        });
        isEngineRunning = false;
        return NextResponse.json({ success: true, processed: true, failedJob: true, error: sendErr.message, application: updated });
      }

    } catch (stepErr: any) {
      let warnMsg = `[APPLYAI_OPERATIONAL_LOG_STREAM] Step execution failed for ${app.company}: ${stepErr.message}. Shifting to ACTION_NEEDED.`;
      if (
        stepErr.message?.toLowerCase().includes("timed out") ||
        stepErr.message?.toLowerCase().includes("timeout") ||
        stepErr.message?.toLowerCase().includes("json") ||
        stepErr.message?.toLowerCase().includes("syntax")
      ) {
        warnMsg = `[WARN] Customization timeout for item. Bypassing blocker to protect pipeline loop continuity.`;
      }
      await logEvent("WARNING", warnMsg);
      const updated = await prisma.jobApplication.update({
        where: { id: app.id },
        data: { 
          status: "ACTION_NEEDED", 
          errorReason: stepErr.message || "Step execution error",
          targetEmail: targetEmail,
        },
      });
      isEngineRunning = false;
      return NextResponse.json({ success: true, processed: true, failedJob: true, error: stepErr.message, application: updated });
    }

  } catch (err: any) {
    console.error("Pipeline run crash:", err);
    isEngineRunning = false;
    return NextResponse.json({ success: false, error: err.message || "Unknown pipeline crash" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
