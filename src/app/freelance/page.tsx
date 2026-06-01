"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Globe,
  DollarSign,
  Copy,
  Check,
  RotateCw,
  Cpu,
  Layers,
  Terminal,
  ExternalLink,
} from "lucide-react";

interface FreelanceAssignment {
  id: string;
  title: string;
  description: string;
  budget: string;
  clientCountry: string;
  source: string;
}

export default function FreelanceCoPilotWorkspace() {
  const { playAudioTone, addTerminalLog } = useStore();

  const [assignments, setAssignments] = useState<FreelanceAssignment[]>([]);
  const [selectedJob, setSelectedJob] = useState<FreelanceAssignment | null>(null);
  const [pitch, setPitch] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);

  // Fetch open feeds
  const fetchFeed = async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch("/api/freelance");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        if (data.assignments && data.assignments.length > 0) {
          setSelectedJob(data.assignments[0]);
          setPitch("");
        }
      }
    } catch (err) {
      console.error("Failed to load freelance assignments", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleSelectJob = (job: FreelanceAssignment) => {
    playAudioTone("click");
    setSelectedJob(job);
    setPitch("");
    setCopied(false);
  };

  const handleGeneratePitch = async () => {
    if (!selectedJob) return;
    playAudioTone("success");
    setGenerating(true);
    setPitch("");
    addTerminalLog({
      level: "INFO",
      message: `Initiating Claude generation for freelance project: "${selectedJob.title}"`,
    });

    try {
      const res = await fetch("/api/freelance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedJob.title,
          description: selectedJob.description,
          budget: selectedJob.budget,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPitch(data.pitch || "");
        addTerminalLog({
          level: "SUCCESS",
          message: `Successfully compiled customized MERN Stack cover pitch for "${selectedJob.title}"`,
        });
      } else {
        addTerminalLog({
          level: "ERROR",
          message: `Failed to compile pitch via Claude pipeline.`,
        });
      }
    } catch (err) {
      console.error("Failed to generate cover pitch:", err);
      addTerminalLog({
        level: "ERROR",
        message: `Pipeline crash during pitch compilation.`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPitch = () => {
    if (!pitch) return;
    playAudioTone("success");
    navigator.clipboard.writeText(pitch);
    setCopied(true);
    addTerminalLog({
      level: "SUCCESS",
      message: `Pitch and Pricing copied to clipboard. Securely buffered for Upwork / Freelancer manual posting.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 relative select-none">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-slate-100 uppercase flex items-center gap-2">
            <Briefcase className="text-cyan-400" size={24} />
            FREELANCER CO-PILOT
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase">
            MERN STACK PROPOSAL GENERATOR & ACTIVE ASSIGNMENT TRACKER
          </p>
        </div>

        <button
          onClick={fetchFeed}
          disabled={loadingFeed}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 text-slate-350 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCw size={14} className={loadingFeed ? "animate-spin" : ""} />
          REFRESH JOBS FEED
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Feed List (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-mono font-bold uppercase text-slate-350">
              ACTIVE ASSIGNMENTS ({assignments.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-400">OPEN FEEDS</span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loadingFeed ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <RotateCw size={24} className="animate-spin text-cyan-400" />
                <span className="text-xs text-slate-500 font-mono">LOADING FEEDS...</span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-xs text-slate-500 italic text-center py-12">No active freelance assignments available.</div>
            ) : (
              assignments.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={`glass-card p-4 rounded-xl border cursor-pointer text-left space-y-2 transition-all duration-300 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <h4 className={`text-xs font-bold transition-colors ${
                        isSelected ? "text-cyan-400" : "text-slate-200"
                      }`}>
                        {job.title}
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{job.description}</p>
                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-550 pt-1">
                      <span className="flex items-center gap-1">
                        <Globe size={10} /> {job.clientCountry}
                      </span>
                      <span className="text-cyan-500 font-bold bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                        {job.budget}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Editor and Writer View (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {selectedJob ? (
              <motion.div
                key={selectedJob.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 text-left"
              >
                {/* Job Info Header */}
                <div className="border-b border-white/5 pb-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">ASSIGNMENT DETAIL</span>
                      <span className="text-[9px] font-mono bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded uppercase">
                        {selectedJob.source}
                      </span>
                    </div>
                    <span className="text-slate-500 flex items-center gap-1 font-bold">
                      BUDGET: <span className="text-slate-250 font-black">{selectedJob.budget}</span>
                    </span>
                  </div>
                  <h2 className="font-display font-black text-lg text-slate-100">{selectedJob.title}</h2>
                  <p className="text-xs text-slate-450 leading-relaxed font-light">{selectedJob.description}</p>
                </div>

                {/* Claude Writer Panel */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Cpu size={14} className="text-cyan-400 animate-pulse" />
                      CLAUDE CO-PILOT PROPOSAL AGENT
                    </span>
                    {pitch && (
                      <button
                        onClick={handleCopyPitch}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                          copied
                            ? "bg-emerald-500 text-black shadow-emerald-500/20"
                            : "bg-cyan-500 text-black hover:bg-cyan-600 shadow-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={12} /> Copied!
                          </>
                        ) : (
                          <>
                            Copy Optimized Pitch & Pricing 📋
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {generating ? (
                    <div className="h-64 rounded-xl border border-white/5 bg-white/2 flex flex-col items-center justify-center space-y-3">
                      <div className="flex space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs font-mono text-slate-450">GENERATING CUSTOMIZED MERN COVER PITCH...</span>
                    </div>
                  ) : pitch ? (
                    <textarea
                      value={pitch}
                      onChange={(e) => setPitch(e.target.value)}
                      className="w-full h-80 bg-white/2 border border-white/8 rounded-xl p-5 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 resize-none leading-loose"
                    />
                  ) : (
                    <div className="h-64 rounded-xl border border-white/5 bg-white/2 flex flex-col items-center justify-center p-6 space-y-4">
                      <Layers size={36} className="text-slate-650" />
                      <div className="text-center space-y-1">
                        <h4 className="text-xs font-mono font-bold text-slate-400">NO PITCH GENERATED YET</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
                          Click below to route this assignment details through Claude to construct a tailored, professional MERN stack cover pitch.
                        </p>
                      </div>
                      <button
                        onClick={handleGeneratePitch}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
                      >
                        GENERATE PITCH & PRICING VIA CLAUDE 🤖
                      </button>
                    </div>
                  )}
                </div>

                {/* Freelancer Safety tips */}
                <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-400 text-xs flex gap-3 leading-relaxed">
                  <Terminal size={18} className="shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-bold font-mono">SAFE-SUBMIT SECURITY PROTOCOL:</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Always copy proposals manually. These pitches are fully randomized and non-templated to bypass robotic pattern detectors on platform submission forms. Ensure you review the pricing details before final submissions.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-panel p-12 rounded-2xl border border-white/5 flex flex-col items-center justify-center space-y-4">
                <Briefcase size={48} className="text-slate-650" />
                <span className="text-xs text-slate-550 font-mono">SELECT A PROJECT ASSIGNMENT TO INITIATE CO-PILOT WRITER</span>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
