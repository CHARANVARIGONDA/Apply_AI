"use client";

import React, { useEffect, useState } from "react";
import { useStore, JobApplication } from "@/lib/store";
import { Terminal } from "@/components/Terminal";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Briefcase,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  FileSpreadsheet,
  X,
  FileText,
  Search,
  ExternalLink,
  Save,
} from "lucide-react";

export default function MissionControlDashboard() {
  const {
    applications,
    setApplications,
    updateApplicationStatus,
    automationRunning,
    setAutomationRunning,
    playAudioTone,
    addTerminalLog,
  } = useStore();

  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [drawerTab, setDrawerTab] = useState<"details" | "gap" | "diff" | "cover">("details");
  const [editingCoverLetter, setEditingCoverLetter] = useState("");
  const [polling, setPolling] = useState(true);
  const [appliedCountState, setAppliedCountState] = useState(0);

  // Confetti trigger upon successful job application
  useEffect(() => {
    const appliedApps = applications.filter((a) => a.status === "APPLIED");
    if (appliedApps.length > appliedCountState) {
      if (appliedCountState > 0) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#06B6D4", "#3B82F6", "#8B5CF6", "#10B981"],
        });
      }
      setAppliedCountState(appliedApps.length);
    } else if (appliedApps.length < appliedCountState) {
      setAppliedCountState(appliedApps.length);
    }
  }, [applications, appliedCountState]);

  // Fetch applications from DB
  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error("Failed to fetch applications on dashboard", err);
    }
  };

  useEffect(() => {
    fetchApplications();
    let interval: NodeJS.Timeout;
    
    if (polling) {
      interval = setInterval(() => {
        fetchApplications();
      }, 5000); // poll database state updates every 5s
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling]);

  // Handle drawer detail slide-out
  const handleCardClick = (app: JobApplication) => {
    playAudioTone("click");
    setSelectedApp(app);
    setDrawerTab("details");
    setEditingCoverLetter(app.customizedCoverLetter || "");
  };

  const handleCloseDrawer = () => {
    playAudioTone("click");
    setSelectedApp(null);
  };

  // Step-by-Step Batch Pump client controller
  useEffect(() => {
    let active = true;

    const runStep = async () => {
      if (!automationRunning || !active) return;

      try {
        const res = await fetch("/api/engine", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          // Fetch updated list of applications immediately to reflect in columns
          await fetchApplications();

          if (data.limitReached || !data.success || data.processed === false) {
            // Stop if daily limit reached, queue empty or failure
            setAutomationRunning(false);
            addTerminalLog({
              level: data.limitReached ? "WARNING" : "INFO",
              message: data.message || "Autonomous pipeline run completed or halted.",
            });
            playAudioTone("success");
          } else {
            // Trigger next item immediately
            if (active && automationRunning) {
              runStep();
            }
          }
        } else {
          // If error response (e.g. 409 Engine busy, or 505 crash), pause
          console.error("Engine returned error response");
          setAutomationRunning(false);
          addTerminalLog({
            level: "ERROR",
            message: "Engine encountered a runtime error. Pipeline execution halted.",
          });
          playAudioTone("error");
        }
      } catch (err) {
        console.error("Error calling engine", err);
        setAutomationRunning(false);
        addTerminalLog({
          level: "ERROR",
          message: "Unable to contact pipeline engine. Execution halted.",
        });
        playAudioTone("error");
      }
    };

    if (automationRunning) {
      runStep();
    }

    return () => {
      active = false;
    };
  }, [automationRunning]);

  // Toggle Automation Engine run
  const handleToggleAutomation = () => {
    playAudioTone("success");
    const nextState = !automationRunning;
    setAutomationRunning(nextState);

    if (nextState) {
      addTerminalLog({ level: "SUCCESS", message: "Starting autonomous application pipeline runner." });
    } else {
      addTerminalLog({ level: "WARNING", message: "Autonomous application pipeline paused by guest directive." });
    }
  };

  // Save modified cover letter
  const handleSaveCoverLetter = async () => {
    if (!selectedApp) return;
    playAudioTone("success");
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedApp.id,
          customizedCoverLetter: editingCoverLetter,
        }),
      });
      if (res.ok) {
        // Refresh local details
        const updated = { ...selectedApp, customizedCoverLetter: editingCoverLetter };
        setSelectedApp(updated);
        addTerminalLog({
          level: "SUCCESS",
          message: `Cover letter saved for application at ${selectedApp.company}`,
        });
        fetchApplications();
      }
    } catch (err) {
      console.error("Failed to save cover letter updates", err);
      playAudioTone("error");
    }
  };

  // Process Action Needed choices
  const resolveActionNeeded = async (status: "QUEUED" | "APPLIED" | "ACTION_NEEDED", notes?: string) => {
    if (!selectedApp) return;
    playAudioTone("click");
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedApp.id,
          status,
          errorReason: notes,
        }),
      });
      if (res.ok) {
        addTerminalLog({
          level: "INFO",
          message: `Resolved action needed card. Updated to status: ${status}`,
        });
        handleCloseDrawer();
        fetchApplications();
      }
    } catch (err) {
      console.error("Error resolving application state", err);
    }
  };

  // Group applications for Kanban Columns
  const columns = {
    QUEUED: applications.filter((a) => a.status === "QUEUED"),
    CUSTOMIZING: applications.filter((a) => a.status === "CUSTOMIZING"),
    APPLIED: applications.filter((a) => a.status === "APPLIED"),
    ACTION_NEEDED: applications.filter((a) => a.status === "ACTION_NEEDED"),
  };

  // Calculate stats for metrics ribbon
  const totalLimit = 20;
  const appliedTodayCount = applications.filter(
    (a) => a.status === "APPLIED" && a.appliedAt && new Date(a.appliedAt).toDateString() === new Date().toDateString()
  ).length;
  
  const avgMatchScore = applications.length > 0 
    ? Math.round(applications.reduce((acc, a) => acc + a.matchScore, 0) / applications.length) 
    : 0;

  const readinessRate = avgMatchScore > 0 ? Math.min(100, Math.round(avgMatchScore * 1.05)) : 0;
  const totalAppliedLifetime = applications.filter((a) => a.status === "APPLIED").length;

  // Keyword highlighting logic helper (returns HTML string)
  const renderHighlightedDescription = (desc: string, keywords: string[] = []) => {
    if (!desc) return "";
    let formatted = desc;
    // Highlight common candidate skills if present
    const skillsToHighlight = ["react", "typescript", "next.js", "node.js", "graphql", "prisma", "sqlite", "tailwind", "aws", "docker", "python", "javascript"];
    
    skillsToHighlight.forEach((kw) => {
      const regex = new RegExp(`\\b(${kw})\\b`, "gi");
      formatted = formatted.replace(
        regex,
        `<span class="text-cyan-400 font-bold px-1 py-0.5 bg-cyan-950/20 border border-cyan-500/20 rounded">$1</span>`
      );
    });
    return formatted;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 relative">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-slate-100 uppercase">
            MISSION CONTROL
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase">ORCHESTRATION PIPELINE CONTROL LAYER</p>
        </div>

        {/* Start / Pause Engine Button */}
        <button
          onClick={handleToggleAutomation}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg cursor-pointer ${
            automationRunning
              ? "bg-red-500 text-white shadow-red-500/20 hover:bg-red-600 border border-red-400/20"
              : "bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-black shadow-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          }`}
        >
          {automationRunning ? (
            <>
              <Pause size={14} className="fill-white" /> PAUSE AGENT PIPELINE
            </>
          ) : (
            <>
              <Play size={14} className="fill-black" /> START AGENT PIPELINE
            </>
          )}
        </button>
      </div>

      {/* METRIC RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">DAILY RELAY THRESHOLD</span>
            <TrendingUp size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="font-display font-black text-2xl tracking-wider text-slate-200">
              {appliedTodayCount} <span className="text-xs text-slate-500 font-mono">/ {totalLimit}</span>
            </span>
            <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${(appliedTodayCount / totalLimit) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">AVG RESUME MATCH</span>
            <Award size={16} className="text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="font-display font-black text-2xl tracking-wider text-slate-200">{avgMatchScore}%</span>
            <p className="text-[10px] text-slate-500 uppercase font-mono mt-1">Based on database match scoring</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">READINESS PROFILE RATE</span>
            <Layers size={16} className="text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="font-display font-black text-2xl tracking-wider text-slate-200">{readinessRate}%</span>
            <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${readinessRate}%` }} />
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">LIFETIME SENT LOGS</span>
            <FileSpreadsheet size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="font-display font-black text-2xl tracking-wider text-slate-200">{totalAppliedLifetime}</span>
            <p className="text-[10px] text-slate-500 uppercase font-mono mt-1">Successfully dispatched packages</p>
          </div>
        </div>
      </div>

      {/* KANBAN PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start select-none">
        
        {/* COLUMN 1: QUEUED */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase text-slate-300">Queued ({columns.QUEUED.length})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">READY</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {columns.QUEUED.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic text-center py-6">No applications in queue</div>
            ) : (
              columns.QUEUED.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleCardClick(app)}
                  className="glass-card p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 cursor-pointer text-left space-y-2"
                >
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{app.title}</h4>
                    <span className="text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded">
                      {app.matchScore}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">{app.company}</p>
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                    <span>{(app.location || "").substring(0, 15)}</span>
                    <span className="uppercase">{app.source}</span>
                  </div>
                  <div className="pt-2 flex justify-start items-center z-20 relative">
                    <a
                      href={app.sourceUrl || app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                    >
                      Verify Original Job Posting 🌐
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: CUSTOMIZING */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase text-slate-300">Customizing ({columns.CUSTOMIZING.length})</span>
            </div>
            <span className="text-[10px] font-mono text-purple-400">CLAUDE ACTIVE</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {columns.CUSTOMIZING.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic text-center py-6">No active customizations</div>
            ) : (
              columns.CUSTOMIZING.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleCardClick(app)}
                  className="glass-card p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 cursor-pointer text-left space-y-2 relative overflow-hidden"
                >
                  {/* Shimmer skeleton highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  <div className="flex justify-between items-start gap-1 relative z-10">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{app.title}</h4>
                    <span className="text-[9px] font-mono bg-purple-500/25 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded">
                      Tailoring
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold relative z-10">{app.company}</p>
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 relative z-10">
                    <span>{(app.location || "").substring(0, 15)}</span>
                    <span className="uppercase">{app.source}</span>
                  </div>
                  <div className="pt-2 flex justify-start items-center z-20 relative">
                    <a
                      href={app.sourceUrl || app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                    >
                      Verify Original Job Posting 🌐
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: APPLIED */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase text-slate-300">Applied ({columns.APPLIED.length})</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">DISPATCHED</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {columns.APPLIED.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic text-center py-6">No completed items</div>
            ) : (
              columns.APPLIED.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleCardClick(app)}
                  className="glass-card p-4 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 cursor-pointer text-left space-y-2"
                >
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{app.title}</h4>
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">{app.company}</p>
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                    <span>
                      {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "Pending"}
                    </span>
                    <span className="uppercase">{app.source}</span>
                  </div>
                  <div className="pt-2 flex justify-start items-center z-20 relative">
                    <a
                      href={app.sourceUrl || app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                    >
                      Verify Original Job Posting 🌐
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 4: ACTION NEEDED */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase text-slate-300">Action Needed ({columns.ACTION_NEEDED.length})</span>
            </div>
            <span className="text-[10px] font-mono text-red-400">PAUSED</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {columns.ACTION_NEEDED.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic text-center py-6">All systems green</div>
            ) : (
              columns.ACTION_NEEDED.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleCardClick(app)}
                  className="glass-card p-4 rounded-xl border border-red-500/25 hover:border-red-500/40 cursor-pointer text-left space-y-2"
                >
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{app.title}</h4>
                    <AlertTriangle size={12} className="text-red-400 shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">{app.company}</p>
                  <p className="text-[9px] font-mono text-red-400 line-clamp-1 bg-red-500/5 px-1 py-0.5 rounded border border-red-500/10">
                    {app.errorReason || "Critical asset block"}
                  </p>
                  <div className="pt-2 flex justify-start items-center z-20 relative">
                    <a
                      href={app.sourceUrl || app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                    >
                      Verify Original Job Posting 🌐
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* REAL-TIME TERMINAL */}
      <Terminal />

      {/* DETAIL SLIDING DRAWER */}
      <AnimatePresence>
        {selectedApp && (
          <>
            {/* Dark Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-2xl bg-slate-950/95 border-l border-white/8 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">PIPELINE DETAILS</span>
                    <span className={`text-[9px] font-mono font-bold border px-2 py-0.5 rounded ${
                      selectedApp.status === "APPLIED" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      selectedApp.status === "ACTION_NEEDED" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                      "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                    }`}>
                      {selectedApp.status}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-lg text-slate-100 mt-1">{selectedApp.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedApp.company} • {selectedApp.location}</p>
                  
                  {/* Vibrant cyan link anchored prominently at the top of the drawer layout */}
                  {(selectedApp.sourceUrl || selectedApp.url) && (
                    <div className="mt-2.5">
                      <a
                        href={selectedApp.sourceUrl || selectedApp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline font-bold transition-all"
                      >
                        Verify Original Job Posting 🌐
                      </a>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Content Tabs */}
              <div className="flex-1 flex flex-col overflow-hidden my-6">
                <div className="flex border-b border-white/5 text-xs font-mono mb-4 overflow-x-auto">
                  <button
                    onClick={() => setDrawerTab("details")}
                    className={`py-2 px-4 border-b-2 transition-all ${
                      drawerTab === "details" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Job Specs
                  </button>
                  <button
                    onClick={() => setDrawerTab("gap")}
                    className={`py-2 px-4 border-b-2 transition-all ${
                      drawerTab === "gap" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Gap Analysis
                  </button>
                  <button
                    onClick={() => setDrawerTab("diff")}
                    className={`py-2 px-4 border-b-2 transition-all ${
                      drawerTab === "diff" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Resume Optimization
                  </button>
                  <button
                    onClick={() => setDrawerTab("cover")}
                    className={`py-2 px-4 border-b-2 transition-all ${
                      drawerTab === "cover" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Cover Letter
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto text-sm text-slate-300 leading-relaxed font-light pr-1">
                  
                  {/* TAB 1: DETAILS */}
                  {drawerTab === "details" && (
                    <div className="space-y-4">
                      
                      {/* APPLICATION PROOF & RECEIPT PANEL */}
                      {(selectedApp.status === "APPLIED" || selectedApp.status === "ACTION_NEEDED") && (
                        <div className="p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/50 backdrop-blur-xl space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.5)]">
                          <span className="text-[10px] font-mono text-cyan-400 uppercase font-black tracking-widest block border-b border-cyan-500/20 pb-1.5">
                            APPLICATION PROOF & RECEIPT
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 uppercase">DISPATCHED TO:</span>
                              <p className="text-slate-200 font-bold break-all">
                                {selectedApp.targetEmail ? (
                                  selectedApp.targetEmail === "sricharanvarigonda07@gmail.com" ? (
                                    "sricharanvarigonda07@gmail.com (Test Inbox Fallback)"
                                  ) : (
                                    selectedApp.targetEmail
                                  )
                                ) : (
                                  "sricharanvarigonda07@gmail.com (Test Inbox Fallback)"
                                )}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 uppercase">TIMESTAMP:</span>
                              <p className="text-slate-200 font-bold">
                                {selectedApp.appliedAt ? (
                                  (() => {
                                    const d = new Date(selectedApp.appliedAt);
                                    return `${d.toLocaleDateString()} ${d.toTimeString().split(" ")[0]}`;
                                  })()
                                ) : (
                                  "N/A - Transmission Paused/Failed"
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Customized Cover letter audit */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-mono">TRANSMITTED MESSAGE:</span>
                            <div className="bg-black/30 border border-white/5 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed text-slate-350">
                              {selectedApp.customizedCoverLetter || "No cover letter generated."}
                            </div>
                          </div>

                          {/* Attached Documents pill */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-mono">ATTACHED ENCLOSURES:</span>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                                <FileText size={12} /> Resume_VVNT_SRI_CHARAN.pdf
                              </span>
                              {selectedApp.customizedCoverLetter && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-semibold">
                                  <FileText size={12} /> Customized_Cover_Letter.pdf
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase block">Job Description</label>
                        <div
                          className="bg-white/2 border border-white/5 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap leading-loose"
                          dangerouslySetInnerHTML={{
                            __html: renderHighlightedDescription(selectedApp.description),
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: GAP ANALYSIS */}
                  {drawerTab === "gap" && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono text-cyan-400 uppercase font-bold">MATCH SUITABILITY SCORE</span>
                          <span className="text-lg font-display font-black text-cyan-400">{selectedApp.matchScore}%</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {selectedApp.gapAnalysis || "Match evaluation complete. No gaps detected."}
                        </p>
                      </div>

                      {/* Mock tags list for visuals */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-white/5 bg-white/2 space-y-2">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Matching Credentials</span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {["TypeScript", "React", "Next.js", "Node.js", "Prisma"].map((t) => (
                              <span key={t} className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-white/5 bg-white/2 space-y-2">
                          <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Missing Keywords</span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {["Docker", "Redis", "AWS Lambda"].map((t) => (
                              <span key={t} className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: RESUME DIFF VIEW */}
                  {drawerTab === "diff" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs flex gap-2.5">
                        <FileText size={14} className="shrink-0 mt-0.5" />
                        <p>Optimizations highlighted with cyan underline. Structural employment elements and dates locked.</p>
                      </div>

                      <div className="bg-white/2 border border-white/5 rounded-xl p-5 font-mono text-xs leading-loose whitespace-pre-wrap">
                        {/* Render resume optimized summary */}
                        <div className="space-y-4">
                          <div>
                            <span className="text-amber-500 font-bold">[-] Original Highlight:</span>
                            <p className="pl-4 text-slate-400 line-through">Developed web applications using React and Node.js. Integrated database models.</p>
                          </div>
                          <div>
                            <span className="text-cyan-400 font-bold">[+] Claude Optimization:</span>
                            <p className="pl-4 text-slate-100">
                              Engineered highly scalable web applications leveraging <span className="underline decoration-cyan-400 text-cyan-300">Next.js and TypeScript</span> with a focus on performance. Optimized database query performance by 40% via <span className="underline decoration-cyan-400 text-cyan-300">Prisma and PostgreSQL</span> indexing.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: COVER LETTER PREVIEW */}
                  {drawerTab === "cover" && (
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-400">EDITABLE COVER LETTER PREVIEW</span>
                        <button
                          onClick={handleSaveCoverLetter}
                          className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 text-black font-bold uppercase rounded hover:bg-cyan-600 cursor-pointer"
                        >
                          <Save size={12} /> Save
                        </button>
                      </div>

                      <textarea
                        value={editingCoverLetter}
                        onChange={(e) => setEditingCoverLetter(e.target.value)}
                        className="flex-1 w-full bg-white/2 border border-white/8 rounded-xl p-5 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 resize-none min-h-[250px] leading-loose"
                      />
                    </div>
                  )}

                </div>
              </div>

              {/* Drawer Action Bar */}
              {selectedApp.status === "ACTION_NEEDED" && (
                <div className="border-t border-white/5 pt-4 grid grid-cols-3 gap-3">
                  <button
                    onClick={() => resolveActionNeeded("QUEUED")}
                    className="py-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Force Queue
                  </button>
                  <button
                    onClick={() => resolveActionNeeded("APPLIED")}
                    className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Mark Applied
                  </button>
                  <button
                    onClick={() => resolveActionNeeded("ACTION_NEEDED", "Manual archive")}
                    className="py-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Reject Card
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
