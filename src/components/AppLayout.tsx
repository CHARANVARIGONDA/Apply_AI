"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BackgroundCanvas } from "./BackgroundCanvas";
import { CursorGlow } from "./CursorGlow";
import { useStore } from "@/lib/store";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { sidebarOpen } = useStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isLanding = pathname === "/";

  // Prevent flash before hydration
  if (!mounted) {
    return (
      <div className="relative min-h-screen flex flex-col bg-transparent">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent">
      {/* Background canvases & custom cursor */}
      <BackgroundCanvas />
      <CursorGlow />

      <div className="flex flex-1 relative z-10">
        {!isLanding && <Sidebar />}
        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            isLanding
              ? ""
              : sidebarOpen
              ? "md:pl-[260px] pb-16 md:pb-0"
              : "md:pl-[72px] pb-16 md:pb-0"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
