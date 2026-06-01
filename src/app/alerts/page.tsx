"use client";

import React, { useEffect, useState } from "react";
import { useStore, JobApplication } from "@/lib/store";
import {
  BellRing,
  AlertTriangle,
  Upload,
  Cpu,
  Check,
  ChevronRight,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

export default function AlertCenter() {
  const { playAudioTone, addTerminalLog } = useStore();
  const [alerts, setAlerts] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        const actionNeeded = data.filter((app: any) => app.status === "ACTION_NEEDED");
        setAlerts(actionNeeded);
      }
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (id: string, actionType: string, status: string = "QUEUED") => {
    playAudioTone("success");
    setResolvingId(id);
    
    // Log event in database terminal
    try {
      // Simulate connection delay for premium micro-interactions
      await new Promise((resolve) => setTimeout(resolve, 800));

      const targetApp = alerts.find((a) => a.id === id);
      const company = targetApp ? targetApp.company : "Target";

      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status, // e.g. move back to QUEUED
          errorReason: `Resolved block via: ${actionType}`,
        }),
      });

      if (res.ok) {
        addTerminalLog({
          level: "SUCCESS",
          message: `Alert resolved for ${company} via ${actionType}. Re-queueing application.`,
        });
        fetchAlerts();
      }
    } catch (err) {
      console.error("Failed to resolve alert", err);
      playAudioTone("error");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2 border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <BellRing size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl tracking-wider text-slate-100 uppercase">
              ALERT CENTER
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1 uppercase">
              RESOLVE ASSET BLOCKS TO RESUME AUTOMATION RUNS
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
          {alerts.length} PENDING COMPLIANCE ALERTS
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((s) => (
              <div key={s} className="h-40 rounded-2xl border border-white/5 bg-white/2 shimmer-skeleton" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-2xl glass-panel border border-white/5 text-center">
            <Check className="h-12 w-12 text-emerald-400 bg-emerald-500/10 p-2.5 rounded-full border border-emerald-500/20 mb-4" />
            <h3 className="font-display font-semibold text-slate-200 text-sm uppercase tracking-wider">
              All Systems Operational
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-1 uppercase">
              No blocked application cards detected in the database.
            </p>
          </div>
        ) : (
          alerts.map((app) => (
            <div
              key={app.id}
              className="glass-panel p-6 rounded-2xl border border-red-500/20 flex flex-col justify-between gap-6 hover:border-red-500/30 transition-all text-left"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest">
                      CRITICAL COMPLIANCE BLOCK
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-100 mt-1">{app.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{app.company} • {app.location}</p>
                </div>

                <div className="px-3.5 py-1.5 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 font-mono text-[10px] uppercase">
                  Reason: {app.errorReason || "Required portfolio asset missing"}
                </div>
              </div>

              <div className="text-xs text-slate-300 font-light leading-relaxed">
                The automation script paused during application dispatch because this position demands a verified structural attachment (e.g. customized cover letter, portfolio sheets, or certification files) that was marked empty. Choose an override directive below:
              </div>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5 justify-end">
                <button
                  onClick={() => handleResolve(app.id, "File Upload")}
                  disabled={resolvingId !== null}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold uppercase transition-all disabled:opacity-45 cursor-pointer"
                >
                  <Upload size={13} /> Upload File
                </button>

                <button
                  onClick={() => handleResolve(app.id, "Inline AI Generation")}
                  disabled={resolvingId !== null}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 text-xs font-mono font-bold uppercase transition-all disabled:opacity-45 cursor-pointer"
                >
                  {resolvingId === app.id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Cpu size={13} />
                  )}
                  AI Generate Inline
                </button>

                <button
                  onClick={() => handleResolve(app.id, "Mark as Optional", "QUEUED")}
                  disabled={resolvingId !== null}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-700/50 text-slate-300 text-xs font-mono font-bold uppercase transition-all disabled:opacity-45 cursor-pointer"
                >
                  <Check size={13} /> Mark Optional
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
