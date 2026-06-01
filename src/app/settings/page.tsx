"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Sliders,
  User,
  ShieldAlert,
  Database,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Lock,
} from "lucide-react";

interface FloatingInputProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (val: string) => void;
  className?: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  className = "",
}) => {
  return (
    <div className={`relative group ${className}`}>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer w-full bg-slate-500/5 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 rounded-xl px-4 pt-6 pb-2 text-sm text-slate-800 dark:text-slate-100 focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-cyan-500/[0.02] focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all duration-300"
      />
      <label
        htmlFor={id}
        className="absolute left-4 top-4 text-xs font-mono text-slate-400 dark:text-slate-500 transition-all duration-300 pointer-events-none transform -translate-y-2.5 scale-90 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-90 peer-focus:-translate-y-2.5 peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
      >
        {label}
      </label>
    </div>
  );
};

export default function SettingsPage() {
  const { playAudioTone, addTerminalLog } = useStore();

  const [activeAccordion, setActiveAccordion] = useState<string | null>("profile");

  // Local settings states synced with DB on save
  const [targetTitle, setTargetTitle] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [safetyMinScore, setSafetyMinScore] = useState(70);
  const [safetyInterval, setSafetyInterval] = useState(30);

  const [saving, setSaving] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Load configuration from DB
  const loadConfig = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const config = await res.json();
        setTargetTitle(config.targetTitle || "");
        setUserEmail(config.userEmail || "");
        setGmailPassword(config.gmailAppPassword || "");
        setSafetyMinScore(config.safetyMinScore || 70);
        setSafetyInterval(config.safetyInterval || 30);
      }
    } catch (err) {
      console.error("Failed to load settings variables:", err);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const toggleAccordion = (name: string) => {
    playAudioTone("click");
    setActiveAccordion(activeAccordion === name ? null : name);
  };

  const handleSaveSettings = async () => {
    playAudioTone("success");
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTitle,
          userEmail,
          gmailAppPassword: gmailPassword,
          safetyMinScore,
          safetyInterval,
        }),
      });

      if (res.ok) {
        setSaveStatus("success");
        addTerminalLog({
          level: "SUCCESS",
          message: "Global database configuration parameters updated successfully.",
        });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleWipeDatabase = async () => {
    const confirmation = window.confirm(
      "CAUTION: Are you sure you want to perform a full system purge? This will erase all applications, configuration states, and logs in the local database."
    );
    if (!confirmation) return;

    playAudioTone("error");
    setWiping(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "WIPE_DATABASE" }),
      });

      if (res.ok) {
        addTerminalLog({
          level: "WARNING",
          message: "System database tables purged. Configurations reset to blank states.",
        });
        alert("Local database wiped successfully. Profile configurations reset.");
        loadConfig();
      }
    } catch (err) {
      console.error("Failed to wipe database", err);
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-500/5 dark:bg-white/2 border border-slate-200/80 dark:border-white/5 p-6 rounded-2xl">
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-slate-850 dark:text-slate-100 uppercase">
            GLOBAL CONFIGURATION
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 uppercase">ORCHESTRATION PIPELINE CONTROL PANEL</p>
        </div>
        
        {/* Save button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-black font-mono text-xs font-bold uppercase tracking-wider cursor-pointer transition-all disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "SAVING REGISTRY..." : "SAVE CONFIG REGISTRY"}
        </button>
      </div>

      {saveStatus === "success" && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle size={16} />
          <span>REGISTRY COMPROMISE: Configuration parameters successfully committed.</span>
        </div>
      )}

      {/* Accordion Menus Container */}
      <div className="space-y-4">
        
        {/* Accordion 1: Profile Variables */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
          <button
            onClick={() => toggleAccordion("profile")}
            className="w-full px-6 py-5 flex items-center justify-between font-display font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-white/2 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <User size={16} className="text-cyan-400" />
              <span>1. Profile Variables</span>
            </div>
            {activeAccordion === "profile" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {activeAccordion === "profile" && (
            <div className="p-6 border-t border-slate-200/80 dark:border-white/5 bg-slate-500/5 dark:bg-slate-950/20 space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingInput
                  id="target-title"
                  label="Target Job Title"
                  value={targetTitle}
                  onChange={setTargetTitle}
                />
                <FloatingInput
                  id="email-relay"
                  label="Contact Email Relay"
                  type="email"
                  value={userEmail}
                  onChange={setUserEmail}
                />
                <FloatingInput
                  id="smtp-password"
                  label="Gmail SMTP App Password"
                  type="password"
                  value={gmailPassword}
                  onChange={setGmailPassword}
                  className="md:col-span-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Multi-Resume Base Storage */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
          <button
            onClick={() => toggleAccordion("resumes")}
            className="w-full px-6 py-5 flex items-center justify-between font-display font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-white/2 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-blue-500 dark:text-blue-400" />
              <span>2. Multi-Resume Base Storage</span>
            </div>
            {activeAccordion === "resumes" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {activeAccordion === "resumes" && (
            <div className="p-6 border-t border-slate-200/80 dark:border-white/5 bg-slate-500/5 dark:bg-slate-950/20 space-y-4 text-left">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block">REGISTERED FILE SHEETS</span>
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/8 bg-slate-500/5 dark:bg-white/2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-cyan-500 dark:text-cyan-400" />
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-300">Base_Resume_Developer_2026.pdf</span>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">SIZE: 124KB • PARSED METADATA ACTIVE</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded uppercase">
                    DEFAULT ACTIVE
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 3: Automation Safety Parameters */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
          <button
            onClick={() => toggleAccordion("safety")}
            className="w-full px-6 py-5 flex items-center justify-between font-display font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-white/2 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Sliders size={16} className="text-purple-500 dark:text-purple-400" />
              <span>3. Automation Safety Sliders</span>
            </div>
            {activeAccordion === "safety" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {activeAccordion === "safety" && (
            <div className="p-6 border-t border-slate-200/80 dark:border-white/5 bg-slate-500/5 dark:bg-slate-950/20 space-y-6 text-left">
              {/* Match Score Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-300">
                  <span>MINIMUM MATCH SCORE LIMIT</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">{safetyMinScore}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={safetyMinScore}
                  onChange={(e) => setSafetyMinScore(Number(e.target.value))}
                  className="w-full accent-cyan-500 dark:accent-cyan-400 h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer mt-1"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                  Jobs scoring lower than this match limit are paused for review.
                </p>
              </div>

              {/* Spacing intervals */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-300">
                  <span>APPLICATION DISPATCH INTERVAL SPACING</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{safetyInterval} MIN</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={safetyInterval}
                  onChange={(e) => setSafetyInterval(Number(e.target.value))}
                  className="w-full accent-purple-550 dark:accent-purple-400 h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer mt-1"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                  Delays between autonomous applications to simulate natural human application rates.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 4: System Wipe Operations */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
          <button
            onClick={() => toggleAccordion("wipe")}
            className="w-full px-6 py-5 flex items-center justify-between font-display font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-500/5 dark:hover:bg-white/2 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert size={16} className="text-red-500 dark:text-red-400" />
              <span className="text-red-500 dark:text-red-400 font-bold">4. Wipe Local Registry</span>
            </div>
            {activeAccordion === "wipe" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {activeAccordion === "wipe" && (
            <div className="p-6 border-t border-slate-200/80 dark:border-white/5 bg-red-500/5 dark:bg-red-950/5 space-y-4 text-left">
              <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/5 dark:bg-red-500/10 flex gap-4">
                <ShieldAlert size={28} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-mono font-bold text-red-500 dark:text-red-400 uppercase">SYSTEM PURGE THREAT NOTICE</h4>
                  <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1 leading-relaxed">
                    This execution erases database schemas, jobs, cover letter records, and SMTP parameters. This cannot be undone. All files are purged local-level.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleWipeDatabase}
                  disabled={wiping}
                  className="px-6 py-3 rounded-xl border border-red-550/30 dark:border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {wiping ? "PURGING..." : "EXECUTE FULL PURGE WIPE"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
