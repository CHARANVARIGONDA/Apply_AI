"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Play,
  Upload,
  Search,
  Cpu,
  Mail,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { playAudioTone } = useStore();

  const handleCTA = () => {
    playAudioTone("success");
  };

  const handleSeeHowItWorks = () => {
    playAudioTone("click");
    setModalOpen(true);
  };

  const closeModal = () => {
    playAudioTone("click");
    setModalOpen(false);
  };

  // 4-step workflow timeline
  const steps = [
    {
      title: "1. Raw Data Ingestion",
      description: "Drop your PDF resume. Our pipeline extracts your experience, tech stack, and educational credentials into a structured JSON profile.",
      icon: Upload,
      glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)] border-cyan-500/30",
      textColor: "text-cyan-400",
    },
    {
      title: "2. Aggregation & Scrape",
      description: "Unified crawler queries API endpoints (RemoteOK, Arbeitnow, Hacker News) in real-time, fetching roles matching your criteria.",
      icon: Search,
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)] border-blue-500/30",
      textColor: "text-blue-400",
    },
    {
      title: "3. Claude Optimization",
      description: "Claude Sonnet customizes resume statements and cover letters per role, aligning keywords without changing fixed historical dates.",
      icon: Cpu,
      glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)] border-purple-500/30",
      textColor: "text-purple-400",
    },
    {
      title: "4. Nodemailer Relay",
      description: "Autonomous Gmail SMTP sender dispatches your personalized cover letter and resume, marking the record as Applied in your database.",
      icon: Mail,
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)] border-emerald-500/30",
      textColor: "text-emerald-400",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col justify-between py-12 px-6">
      
      {/* Cinematic Glowing Background Accents */}
      <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-display font-black text-black text-sm">A</span>
          </div>
          <span className="font-display font-extrabold text-xl tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            APPLY_AI
          </span>
        </div>

        <Link
          href="/dashboard"
          onClick={() => playAudioTone("click")}
          className="text-xs font-mono font-bold tracking-widest uppercase border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 bg-white/5 hover:bg-cyan-500/5 px-5 py-2.5 rounded-full transition-all duration-300"
        >
          Enter Console
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-5xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center my-16 z-10">
        
        {/* Shimmer badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
        >
          <Sparkles className="text-cyan-400" size={14} />
          <span className="text-xs font-mono tracking-wider text-slate-300">
            AUTONOMOUS AGENT PIPELINE
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display font-black text-4xl sm:text-6xl md:text-7xl leading-tight tracking-tight uppercase"
        >
          Apply Smarter.
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent text-neon-cyan">
            Get Hired Faster.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl font-light leading-relaxed"
        >
          An autonomous job application service running local pipelines. We scan global developer APIs, evaluate matches with Claude, optimize documents, and relay applications via SMTP on autopilot.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/onboarding"
            onClick={handleCTA}
            className="group relative flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 font-bold tracking-wide text-sm text-white shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            Start Automating — It's Free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>

          <button
            onClick={handleSeeHowItWorks}
            className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 bg-white/5 font-semibold text-sm hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-300 cursor-pointer"
          >
            <Play size={14} className="fill-white" />
            See How It Works
          </button>
        </motion.div>
      </main>

      {/* Timeline Section */}
      <section className="relative max-w-7xl mx-auto w-full z-10 mt-16 pb-12 border-t border-white/5 pt-20">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-2xl uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            THE ENGINE WORKFLOW
          </h2>
          <p className="text-sm text-slate-500 font-mono mt-2 uppercase">Data extraction to interview scheduling</p>
        </div>

        {/* Responsive Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative p-6 rounded-2xl glass-card flex flex-col items-start gap-4 border border-white/5 ${step.glow}`}
              >
                <div className={`p-3 rounded-lg bg-white/5 border border-white/10 ${step.textColor}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-display font-semibold text-sm tracking-wider uppercase text-slate-200">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Connecting arrow indicator for desktop */}
                {idx < 3 && (
                  <div className="hidden md:block absolute top-[50px] right-[-15px] translate-x-1/2 z-20 text-slate-600 font-bold text-lg">
                    →
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Walkthrough modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-3xl rounded-2xl glass-panel-heavy border border-white/10 p-8 text-left overflow-y-auto max-h-[85vh]"
            >
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-1.5 rounded-lg border border-white/10 bg-white/5 hover:border-red-500/50 hover:text-red-400 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <h2 className="font-display font-black text-2xl uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-6">
                How ApplyAI Works
              </h2>

              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-light">
                <div>
                  <h4 className="font-display font-bold text-cyan-400 uppercase tracking-wide text-xs mb-1">
                    Step 1: Set Up Your Profile & Strategy
                  </h4>
                  <p>
                    Provide your baseline PDF resume, select targeted locations, choose salary thresholds, and configure your email relay (e.g. secure App Passwords). Adjust the engine slider to balance applications across fast-moving startups and established MNCs.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-display font-bold text-blue-400 uppercase tracking-wide text-xs mb-1">
                    Step 2: Scrape Unified REST Endpoints
                  </h4>
                  <p>
                    Our scheduler fetches available developer listings directly from free APIs (Arbeitnow, RemoteOK, The Muse, Hacker News) without triggering Web Scraper blocks. It automatically logs listings into the SQLite database backend.
                  </p>
                </div>

                <div>
                  <h4 className="font-display font-bold text-purple-400 uppercase tracking-wide text-xs mb-1">
                    Step 3: Run Claude Tailored Customization
                  </h4>
                  <p>
                    Claude maps the parsed resume details against the scraped job description, scoring mutual compatibility. For qualified matches, it writes targeted cover letters and edits resume bullet points (maintaining original structures/employment dates) to match targeted requirements.
                  </p>
                </div>

                <div>
                  <h4 className="font-display font-bold text-emerald-400 uppercase tracking-wide text-xs mb-1">
                    Step 4: Relay SMTP Emails on Autopilot
                  </h4>
                  <p>
                    Once reviewed, the automation dispatches customized email payloads. If required attachments (such as portfolios) are missing, the pipeline automatically alerts you, staging applications in an "Action Needed" dashboard state.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex gap-4 mt-6">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 h-fit">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h5 className="font-semibold text-cyan-300 text-xs uppercase tracking-wider mb-1">Privacy First</h5>
                    <p className="text-xs text-slate-400">
                      All data resides locally on your SQLite database and credentials are saved locally. Your resume files, application logs, and SMTP connection data never touch centralized server aggregators.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Link
                  href="/onboarding"
                  onClick={() => {
                    closeModal();
                    handleCTA();
                  }}
                  className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black font-bold tracking-wide text-xs uppercase transition-all duration-200 shadow-md shadow-cyan-500/20"
                >
                  Start Configuration
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Footer */}
      <footer className="relative max-w-7xl mx-auto w-full text-center mt-12 z-10 text-[10px] font-mono text-slate-600">
        © 2026 APPLY_AI SYSTEM ENGINE INC. ALL RIGHTS RESERVED. RUNNING LOCALLY ON PORT 3000.
      </footer>
    </div>
  );
}
