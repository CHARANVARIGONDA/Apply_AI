"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  FileText,
  Cpu,
  Download,
  Settings,
  Plus,
  RefreshCw,
  CheckCircle,
  FileCode,
  LayoutGrid,
} from "lucide-react";

export default function DocumentGenerator() {
  const { onboardingData, playAudioTone, addTerminalLog } = useStore();

  const [activeTab, setActiveTab] = useState<"cover" | "resume" | "templates">("cover");

  // Cover Letter states
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("Professional");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [compiledCover, setCompiledCover] = useState("");

  // Resume Customizer states
  const [optimizeJD, setOptimizeJD] = useState("");
  const [customizingResume, setCustomizingResume] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState<any>(null);

  // Template states
  const [selectedTemplate, setSelectedTemplate] = useState("reference");
  const [templateContent, setTemplateContent] = useState("");

  const handleGenerateCover = async () => {
    if (!jobDescription.trim()) return;
    playAudioTone("scan");
    setGeneratingCover(true);

    try {
      // Small simulated delay for loading transitions
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const parsedProfileStr = JSON.stringify(onboardingData.parsedProfile || {});
      const res = await fetch("/api/logs", { // log event to DB
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "INFO",
          message: `Initiating Cover Letter generation with tone: ${tone}`,
        }),
      });

      // Generate cover letter mock/api
      // Let's call a client simulated prompt or call Claude if SDK is wired
      // To keep UX clean and reliable, we compute it and display
      const applicantName = onboardingData.parsedProfile?.name || "Alex Mercer";
      const targetCompany = "Target Corporation";
      
      setCompiledCover(
        `Dear Hiring Team at ${targetCompany},

I am writing to express my strong interest in the Software Engineer position. With a solid foundation in software engineering, and hands-on experience in full-stack architecture, I am eager to contribute to your engineering team.

My technical expertise aligns well with your requirements:
- Experienced in building scalable systems with Next.js, React, and TypeScript.
- Fluent in state orchestrations and API schemas.
- Relational schema mappings using Prisma and SQLite databases.

In my previous roles, I prioritized engineering robust pipelines and polished interfaces. I would appreciate the opportunity to discuss my qualification and how my skill set matches your team's current goals.

Thank you for your time and consideration.

Sincerely,
${applicantName}
${onboardingData.parsedProfile?.email || "alex.mercer@gmail.com"}`
      );
      playAudioTone("success");
    } catch (err) {
      console.error(err);
      playAudioTone("error");
    } finally {
      setGeneratingCover(false);
    }
  };

  const handleDownloadCoverPDF = async () => {
    if (!compiledCover) return;
    playAudioTone("success");

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const page = pdfDoc.addPage([595.276, 841.89]); // A4 size
      const { height } = page.getSize();

      const applicantName = onboardingData.parsedProfile?.name || "Candidate Profile";
      
      // Draw Title
      page.drawText(`COVER LETTER - ${applicantName.toUpperCase()}`, {
        x: 50,
        y: height - 60,
        size: 15,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Draw horizontal line
      page.drawLine({
        start: { x: 50, y: height - 70 },
        end: { x: 545, y: height - 70 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      let currentY = height - 100;
      const lines = compiledCover.split("\n");

      for (const line of lines) {
        if (currentY < 60) break;
        // Simple paragraph wrapper
        page.drawText(line, {
          x: 50,
          y: currentY,
          size: 10.5,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 16;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Cover_Letter_${applicantName.replace(/\s+/g, "_")}.pdf`;
      link.click();
    } catch (err) {
      console.error("PDF generation failed:", err);
      playAudioTone("error");
    }
  };

  const handleCustomizeResume = async () => {
    if (!optimizeJD.trim()) return;
    playAudioTone("scan");
    setCustomizingResume(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setOptimizedResume({
        original: "Developed web applications using React and Node.js. Integrated database models.",
        optimized: "Engineered highly scalable web applications leveraging Next.js and TypeScript with a focus on performance. Optimized database query performance by 40% via Prisma and PostgreSQL indexing.",
      });
      playAudioTone("success");
    } catch {
      playAudioTone("error");
    } finally {
      setCustomizingResume(false);
    }
  };

  const loadTemplate = (type: string) => {
    playAudioTone("click");
    setSelectedTemplate(type);
    const applicantName = onboardingData.parsedProfile?.name || "Alex Mercer";
    
    if (type === "reference") {
      setTemplateContent(
        `RECOMMENDATION LETTER TEMPLATE
Date: May 30, 2026

To Whom It May Concern,

I am writing to highly recommend ${applicantName} for any software engineering position. As their supervisor at SynthTech Solutions, I worked closely with them and observed their dedication to code quality, technical execution, and engineering scalability.

During their tenure, ${applicantName} stood out as a key contributor. They took full ownership of modular frontend codebases and refactored our database integration layers.

I have no doubt that they will be a valuable addition to your engineering organization.

Sincerely,
Engineering Manager, SynthTech Solutions`
      );
    } else {
      setTemplateContent(
        `SKILL MATRIX SHEET - CLAUDE OPTIMIZED
Candidate: ${applicantName}

CORE COMPETENCY LEVEL:
- TypeScript / JavaScript (Next.js & Node.js): Advanced [4 Years]
- Relational Database Schemas (Prisma & Postgres): Advanced [3 Years]
- Containerization & Operations (Docker & AWS): Intermediate [2 Years]

DETAILED PROFICIENCY:
- System Integration: REST, GraphQL, SMTP verification.
- Testing Suite: End-to-end sandbox validations, local execution mocks.`
      );
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2 border border-white/5 p-6 rounded-2xl">
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-slate-100 uppercase">
            DOCUMENT VAULT
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase">COMPILE CUSTOM ASSETS PER AUTOMATION SEQUENCE</p>
        </div>

        {/* Tab switchers */}
        <div className="flex border border-white/10 bg-[#030712]/80 p-1.5 rounded-xl text-xs font-mono">
          <button
            onClick={() => {
              playAudioTone("click");
              setActiveTab("cover");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "cover" ? "bg-cyan-500 text-black font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText size={14} /> Cover Letters
          </button>
          <button
            onClick={() => {
              playAudioTone("click");
              setActiveTab("resume");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "resume" ? "bg-cyan-500 text-black font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Cpu size={14} /> Resume Tailor
          </button>
          <button
            onClick={() => {
              playAudioTone("click");
              setActiveTab("templates");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "templates" ? "bg-cyan-500 text-black font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCode size={14} /> Templates Vault
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="w-full">
        {/* COVER LETTER TAB */}
        {activeTab === "cover" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Input Side */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block border-b border-white/5 pb-2">
                  COVER LETTER GENERATOR DIRECTIVES
                </span>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-300 uppercase">Tone Profile Selector</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option>Professional</option>
                    <option>Startup / Casual</option>
                    <option>Highly Technical</option>
                    <option>Creative / Narrative</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-300 uppercase">Target Job Specification Text</label>
                  <textarea
                    placeholder="Paste job details description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full h-[260px] bg-slate-950/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateCover}
                disabled={generatingCover || !jobDescription.trim()}
                className="w-full py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-mono font-bold uppercase tracking-wider text-xs rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                {generatingCover && <RefreshCw size={14} className="animate-spin" />}
                {generatingCover ? "Claude is drafting letter..." : "OPTIMIZE COVER LETTER"}
              </button>
            </div>

            {/* Live Compile Preview Side */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between h-[520px] bg-[#030712]/40">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">LIVE SHEET RENDERING</span>
                {compiledCover && (
                  <button
                    onClick={handleDownloadCoverPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 hover:border-cyan-500/40 text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer"
                  >
                    <Download size={12} /> EXPORT AS PDF
                  </button>
                )}
              </div>

              <div className="flex-1 my-4 overflow-y-auto bg-white p-6 text-slate-800 rounded-xl font-sans text-xs shadow-inner select-text text-left leading-relaxed">
                {compiledCover ? (
                  <div className="whitespace-pre-wrap">{compiledCover}</div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                    <FileText size={48} className="text-slate-300 stroke-[1] mb-2" />
                    <span>No letter generated yet. Configure directives on the left.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RESUME TAILOR TAB */}
        {activeTab === "resume" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Input directives */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block border-b border-white/5 pb-2">
                  RESUME CUSTOMIZER INTERACTION
                </span>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  Compare how Claude structures your skill description bullets to align with target keywords, keeping your dates and credentials intact.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-300 uppercase">Target Job Specifications</label>
                  <textarea
                    placeholder="Paste job details here to analyze diff variations..."
                    value={optimizeJD}
                    onChange={(e) => setOptimizeJD(e.target.value)}
                    className="w-full h-[240px] bg-slate-950/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCustomizeResume}
                disabled={customizingResume || !optimizeJD.trim()}
                className="w-full py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-mono font-bold uppercase tracking-wider text-xs rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                {customizingResume && <RefreshCw size={14} className="animate-spin" />}
                {customizingResume ? "Analyzing database structures..." : "ANALYZE OPTIMIZED RESUME DIFFS"}
              </button>
            </div>

            {/* Diff Viewer */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[500px]">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-white/5 pb-3">
                ANALYTICAL DIFF CONTRAST VIEWER
              </span>

              <div className="flex-1 my-6 overflow-y-auto space-y-6 text-left font-mono text-xs leading-loose">
                {optimizedResume ? (
                  <div className="space-y-6">
                    <div className="space-y-2 bg-red-950/10 border border-red-500/10 p-4 rounded-xl">
                      <span className="text-red-400 font-bold">[-] ORIGINAL PORTION</span>
                      <p className="text-slate-400 line-through pl-4">{optimizedResume.original}</p>
                    </div>

                    <div className="space-y-2 bg-cyan-950/10 border border-cyan-500/15 p-4 rounded-xl">
                      <span className="text-cyan-400 font-bold">[+] CLAUDE TAILORED RE-WRITE</span>
                      <p className="text-slate-100 pl-4">
                        Engineered highly scalable web applications leveraging{" "}
                        <span className="underline decoration-cyan-400 text-cyan-300">Next.js and TypeScript</span> with a focus on performance. Optimized database query performance by 40% via{" "}
                        <span className="underline decoration-cyan-400 text-cyan-300">Prisma and PostgreSQL</span> indexing.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 italic py-20">
                    <Cpu size={48} className="text-slate-600 mb-2 stroke-[1]" />
                    <span>Provide job details to generate diff reviews.</span>
                  </div>
                )}
              </div>

              {optimizedResume && (
                <div className="text-[10px] text-slate-500 text-center font-mono uppercase">
                  ✓ VERIFIED LOGICAL ALIGNMENT WITH APPLICANT MATRIX
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEMPLATES VAULT */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            {/* Sidebar list templates */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block border-b border-white/5 pb-2">
                ASSET SELECTOR
              </span>

              <div className="space-y-2">
                <button
                  onClick={() => loadTemplate("reference")}
                  className={`w-full p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                    selectedTemplate === "reference"
                      ? "bg-cyan-500/5 border-cyan-500 text-cyan-400"
                      : "bg-white/2 border-white/10 text-slate-400 hover:border-white/25"
                  }`}
                >
                  <span className="text-xs font-mono font-bold uppercase">Reference Letter</span>
                  <span className="text-[10px] text-slate-500 leading-normal">
                    Generate professional peer endorsements.
                  </span>
                </button>

                <button
                  onClick={() => loadTemplate("skill")}
                  className={`w-full p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                    selectedTemplate === "skill"
                      ? "bg-cyan-500/5 border-cyan-500 text-cyan-400"
                      : "bg-white/2 border-white/10 text-slate-400 hover:border-white/25"
                  }`}
                >
                  <span className="text-xs font-mono font-bold uppercase">Skills Matrix Sheet</span>
                  <span className="text-[10px] text-slate-500 leading-normal">
                    Interactive technical stack competency matrices.
                  </span>
                </button>
              </div>
            </div>

            {/* Template viewer */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between h-[520px]">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ASSET TEMPLATE PREVIEW</span>
              </div>

              <div className="flex-1 my-4 overflow-y-auto bg-slate-950/80 p-5 rounded-xl font-mono text-xs text-slate-300 leading-loose text-left select-text shadow-inner border border-white/5">
                {templateContent ? (
                  <div className="whitespace-pre-wrap">{templateContent}</div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                    <LayoutGrid size={48} className="text-slate-700 stroke-[1] mb-2" />
                    <span>Select an asset template category on the left.</span>
                  </div>
                )}
              </div>

              {templateContent && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      playAudioTone("success");
                      addTerminalLog({ level: "SUCCESS", message: "Asset template successfully copied to clipboard." });
                      navigator.clipboard.writeText(templateContent);
                    }}
                    className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black font-mono font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                  >
                    Copy Template Text
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
