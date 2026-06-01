import { create } from "zustand";

export interface Experience {
  company: string;
  role: string;
  duration: string;
}

export interface Education {
  school: string;
  degree: string;
}

export interface ParsedProfile {
  name: string;
  email: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
}

export interface OnboardingData {
  resumePath: string | null;
  resumeName: string | null;
  parsedProfile: ParsedProfile | null;
  targetTitle: string;
  locations: string[];
  workModes: string[]; // Remote, Hybrid, Onsite
  salaryMin: number;
  salaryMax: number;
  strategy: "startup" | "mnc" | "balanced";
  industryPreferences: string[];
  userEmail: string;
  gmailAppPassword: string;
  vault: {
    coverLetter: { aiGenerate: boolean; file: string | null; name: string };
    portfolio: { aiGenerate: boolean; file: string | null; name: string };
    certifications: { aiGenerate: boolean; file: string | null; name: string };
    skillSheet: { aiGenerate: boolean; file: string | null; name: string };
  };
}

export interface SystemLog {
  id: string;
  level: "SUCCESS" | "INFO" | "WARNING" | "ERROR";
  message: string;
  timestamp: string;
}

export interface JobApplication {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  salary: string | null;
  workMode: string;
  url: string;
  sourceUrl: string;
  targetEmail: string;
  source: string;
  matchScore: number;
  gapAnalysis: string | null;
  customizedResumePath: string | null;
  customizedCoverLetter: string | null;
  status: "QUEUED" | "CUSTOMIZING" | "APPLIED" | "ACTION_NEEDED";
  appliedAt: string | null;
  errorReason: string | null;
}

interface ApplyAIStore {
  // Onboarding
  onboardingStep: number;
  onboardingData: OnboardingData;
  setOnboardingStep: (step: number) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  updateVaultItem: (
    key: "coverLetter" | "portfolio" | "certifications" | "skillSheet",
    update: { aiGenerate?: boolean; file?: string | null; name?: string }
  ) => void;

  // Dashboard & Application Pipeline
  applications: JobApplication[];
  setApplications: (apps: JobApplication[]) => void;
  updateApplicationStatus: (id: string, status: JobApplication["status"]) => void;
  terminalLogs: SystemLog[];
  addTerminalLog: (log: Omit<SystemLog, "id" | "timestamp">) => void;
  clearTerminalLogs: () => void;
  setTerminalLogs: (logs: SystemLog[]) => void;

  // Automation Control
  automationRunning: boolean;
  setAutomationRunning: (running: boolean) => void;

  // UI/Audio Settings
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playAudioTone: (type: "click" | "success" | "error" | "scan") => void;
}

const initialOnboardingData: OnboardingData = {
  resumePath: null,
  resumeName: null,
  parsedProfile: null,
  targetTitle: "",
  locations: [],
  workModes: ["Remote"],
  salaryMin: 50000,
  salaryMax: 150000,
  strategy: "balanced",
  industryPreferences: [],
  userEmail: "",
  gmailAppPassword: "",
  vault: {
    coverLetter: { aiGenerate: true, file: null, name: "Cover_Letter.pdf" },
    portfolio: { aiGenerate: false, file: null, name: "Portfolio.pdf" },
    certifications: { aiGenerate: false, file: null, name: "Certifications.pdf" },
    skillSheet: { aiGenerate: true, file: null, name: "Skill_Sheet.pdf" },
  },
};

export const useStore = create<ApplyAIStore>((set, get) => ({
  onboardingStep: 1,
  onboardingData: initialOnboardingData,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setOnboardingData: (data) =>
    set((state) => ({
      onboardingData: { ...state.onboardingData, ...data },
    })),
  updateVaultItem: (key, update) =>
    set((state) => ({
      onboardingData: {
        ...state.onboardingData,
        vault: {
          ...state.onboardingData.vault,
          [key]: { ...state.onboardingData.vault[key], ...update },
        },
      },
    })),

  applications: [],
  setApplications: (apps) => set({ applications: apps }),
  updateApplicationStatus: (id, status) =>
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === id ? { ...app, status } : app
      ),
    })),

  terminalLogs: [],
  addTerminalLog: (log) => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      ...log,
    };
    set((state) => ({
      terminalLogs: [...state.terminalLogs, newLog].slice(-100), // Keep last 100 logs
    }));
  },
  clearTerminalLogs: () => set({ terminalLogs: [] }),
  setTerminalLogs: (logs) => set({ terminalLogs: logs }),

  automationRunning: false,
  setAutomationRunning: (running) => set({ automationRunning: running }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  soundEnabled: true,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  playAudioTone: (type) => {
    if (!get().soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "scan") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context failed to play sound", e);
    }
  },
}));
