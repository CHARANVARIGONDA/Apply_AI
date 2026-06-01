"use client";

import React, { useEffect, useRef, useState } from "react";
import { useStore, SystemLog } from "@/lib/store";
import { Terminal as TermIcon, Play, RefreshCw, Trash2 } from "lucide-react";

export const Terminal: React.FC = () => {
  const { terminalLogs, setTerminalLogs, addTerminalLog, clearTerminalLogs, playAudioTone } = useStore();
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [commandInput, setCommandInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Poll for database log events
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/logs");
        if (res.ok) {
          const data = await res.json();
          // Transform database logs to match client SystemLog interface
          const mappedLogs: SystemLog[] = data.map((log: any) => ({
            id: log.id,
            level: log.level as SystemLog["level"],
            message: log.message,
            timestamp: new Date(log.timestamp).toLocaleTimeString(),
          }));
          setTerminalLogs(mappedLogs);
        }
      } catch (err) {
        console.error("Failed to fetch logs in terminal", err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, [setTerminalLogs]);

  // Scroll to bottom on new logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    playAudioTone("click");
    const cmd = commandInput.trim().toLowerCase();
    setCommandInput("");

    addTerminalLog({
      level: "INFO",
      message: `guest@applyai:~$ ${cmd}`,
    });

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (cmd === "clear") {
      clearTerminalLogs();
      addTerminalLog({ level: "SUCCESS", message: "Terminal buffer cleared." });
    } else if (cmd === "status") {
      addTerminalLog({
        level: "INFO",
        message: "SQLite DB Status: Active. Connection pool sizing: 1. Host: localhost.",
      });
      addTerminalLog({
        level: "SUCCESS",
        message: "Core automation pipeline: STANDBY (Ready for injection).",
      });
    } else if (cmd === "help") {
      addTerminalLog({
        level: "INFO",
        message: "Available instructions: HELP, CLEAR, STATUS, START, HELP_AGENTS",
      });
    } else if (cmd === "start") {
      try {
        addTerminalLog({ level: "INFO", message: "Initiating background scraping runner..." });
        const res = await fetch("/api/engine", { method: "POST" });
        if (res.ok) {
          addTerminalLog({ level: "SUCCESS", message: "Automation pipeline process spawned asynchronously." });
        } else {
          addTerminalLog({ level: "ERROR", message: "Failed to start pipeline engine." });
        }
      } catch {
        addTerminalLog({ level: "ERROR", message: "Network error starting background pipeline." });
      }
    } else if (cmd === "help_agents") {
      addTerminalLog({
        level: "WARNING",
        message: "Next.js convention notices: Standard ESM configurations are active. Output parameters strictly tracked.",
      });
    } else {
      addTerminalLog({
        level: "ERROR",
        message: `Command not recognized: '${cmd}'. Type 'help' for options.`,
      });
      playAudioTone("error");
    }
    setLoading(false);
  };

  const handleClearButton = () => {
    playAudioTone("click");
    clearTerminalLogs();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-xl overflow-hidden flex flex-col h-[320px] font-mono shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      {/* Window Header */}
      <div className="bg-[#030712]/90 px-4 py-2 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <TermIcon size={14} className="text-cyan-400" />
          <span className="tracking-wide text-[11px] font-semibold text-slate-300">APPLYAI_OPERATIONAL_LOG_STREAM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <button
            onClick={handleClearButton}
            className="hover:text-red-400 transition-colors p-1 cursor-pointer"
            title="Clear terminal buffer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Logs stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-1.5 text-xs select-text">
        {terminalLogs.length === 0 ? (
          <div className="text-slate-500 font-light italic">Console feed listening... Input 'help' to see directives.</div>
        ) : (
          terminalLogs.map((log) => {
            let color = "text-cyan-300"; // Default INFO
            if (log.level === "SUCCESS") color = "text-emerald-400";
            if (log.level === "WARNING") color = "text-amber-400";
            if (log.level === "ERROR") color = "text-red-400 font-semibold";

            return (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-[10px] text-slate-500 mt-0.5">[{log.timestamp}]</span>
                <span className={color}>{log.message}</span>
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs italic animate-pulse">
            <RefreshCw size={10} className="animate-spin" />
            <span>Processing local directive...</span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Input row */}
      <form onSubmit={handleCommandSubmit} className="bg-[#030712]/50 border-t border-white/5 flex items-center px-4 py-2 text-xs">
        <span className="text-emerald-400 mr-2">guest@applyai:~$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Type command (e.g. status, clear, help)..."
          className="flex-1 bg-transparent border-none text-white outline-none focus:ring-0 placeholder-slate-600 text-xs font-mono"
        />
        <button type="submit" className="hidden" />
      </form>
    </div>
  );
};
