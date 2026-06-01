"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  BellRing,
  BarChart3,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Terminal as TerminalIcon,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Briefcase,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const {
    sidebarOpen,
    setSidebarOpen,
    automationRunning,
    soundEnabled,
    setSoundEnabled,
    playAudioTone,
  } = useStore();

  const [alertCount, setAlertCount] = useState(0);

  // Poll for ACTION_NEEDED applications count to show in badge
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          const actionNeededCount = data.filter(
            (app: { status: string }) => app.status === "ACTION_NEEDED"
          ).length;
          setAlertCount(actionNeededCount);
        }
      } catch (err) {
        console.error("Failed to fetch alert counts for sidebar badge", err);
      }
    };

    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Mission Control", path: "/dashboard", icon: LayoutDashboard },
    { name: "Setup Wizard", path: "/onboarding", icon: Sparkles },
    { name: "Document Vault", path: "/generator", icon: FileText },
    {
      name: "Alert Center",
      path: "/alerts",
      icon: BellRing,
      badge: alertCount > 0 ? alertCount : undefined,
    },
    { name: "Metrics Tracker", path: "/tracker", icon: BarChart3 },
    { name: "Freelancer Co-Pilot", path: "/freelance", icon: Briefcase },
    { name: "Global Settings", path: "/settings", icon: Settings },
  ];

  const handleLinkClick = () => {
    playAudioTone("click");
  };

  const toggleSidebar = () => {
    playAudioTone("click");
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    // Note: don't play sound right away if disabling, but if enabling, play a quick click.
    if (!soundEnabled) {
      setTimeout(() => {
        // play small indicator
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        } catch {}
      }, 50);
    }
  };

  // Do not show sidebar on landing page "/"
  if (pathname === "/") return null;

  return (
    <>
      {/* Mobile top/bottom bar navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-white/10 bg-[#030712]/90 backdrop-blur-md px-2 py-1 justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleLinkClick}
              className={`relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1 font-medium">{item.name.split(" ")[0]}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-black">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-40 bg-[#030712]/60 backdrop-blur-xl border-r border-white/8 text-white select-none overflow-hidden"
      >
        {/* Header / Brand */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-white/5">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <TerminalIcon className="text-cyan-400" size={24} />
                <span className="font-display font-bold text-lg tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  APPLY_AI
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-auto"
              >
                <TerminalIcon className="text-cyan-400" size={24} />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* System Status Ribbon */}
        <div className="px-4 py-3 border-b border-white/5 bg-[#030712]/20">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  automationRunning ? "bg-emerald-400" : "bg-cyan-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  automationRunning ? "bg-emerald-500" : "bg-cyan-500"
                }`}
              ></span>
            </span>

            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] font-mono tracking-widest text-slate-400"
              >
                SYSTEM:{" "}
                <span
                  className={
                    automationRunning
                      ? "text-emerald-400 font-bold"
                      : "text-cyan-400"
                  }
                >
                  {automationRunning ? "RUNNING" : "STANDBY"}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all group relative ${
                  isActive
                    ? "bg-white/5 border border-white/8 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "text-slate-400 hover:text-white hover:bg-white/3 border border-transparent"
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-colors ${
                    isActive ? "text-cyan-400" : "group-hover:text-cyan-300"
                  }`}
                />

                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium tracking-wide"
                  >
                    {item.name}
                  </motion.span>
                )}

                {item.badge !== undefined && (
                  <span
                    className={`absolute rounded-full bg-red-500/95 font-bold text-white flex items-center justify-center transition-all ${
                      sidebarOpen
                        ? "right-4 px-1.5 py-0.5 text-[10px]"
                        : "right-2 top-2 h-4 w-4 text-[8px]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {!sidebarOpen && (
                  <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 border border-white/10 text-white text-[11px] rounded px-2.5 py-1 whitespace-nowrap z-50 shadow-xl pointer-events-none">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer controls (Sound & Theme toggle) */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between gap-2">
          {sidebarOpen && (
            <span className="text-[10px] font-mono text-slate-500">APPLYAI_v1.0</span>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                playAudioTone("click");
                toggleTheme();
              }}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30 transition-all cursor-pointer"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30 transition-all cursor-pointer"
              title={soundEnabled ? "Mute interface sounds" : "Enable interface sounds"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
