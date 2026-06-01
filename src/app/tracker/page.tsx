"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
  Filter,
  CheckCircle,
  Clock,
  AlertOctagon,
  RefreshCw,
} from "lucide-react";

export default function MetricsTracker() {
  const { playAudioTone, addTerminalLog } = useStore();

  const [items, setItems] = useState<any[]>([]);
  const [densityData, setDensityData] = useState<any[]>([]);
  
  // Query / Paginate states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(true);

  const fetchTrackerData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "8",
        search,
        status,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/tracker?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        if (data.densityData) {
          setDensityData(data.densityData);
        }
      }
    } catch (err) {
      console.error("Failed to load tracker logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [page, status, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playAudioTone("click");
    setPage(1);
    fetchTrackerData();
  };

  const handleSort = (column: string) => {
    playAudioTone("click");
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleExportCSV = async () => {
    playAudioTone("success");
    addTerminalLog({ level: "INFO", message: "Exporting database applications to CSV..." });
    
    try {
      // Query ALL applications for a complete export
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error();
      const allApps = await res.json();

      if (allApps.length === 0) {
        addTerminalLog({ level: "WARNING", message: "No data entries found to compile CSV." });
        return;
      }

      // Build CSV text
      const headers = ["ID", "Title", "Company", "Location", "WorkMode", "Score", "Status", "Source", "AppliedAt", "URL"];
      const rows = allApps.map((a: any) => [
        a.id,
        `"${a.title.replace(/"/g, '""')}"`,
        `"${a.company.replace(/"/g, '""')}"`,
        `"${a.location.replace(/"/g, '""')}"`,
        a.workMode,
        a.matchScore,
        a.status,
        a.source,
        a.appliedAt ? new Date(a.appliedAt).toISOString() : "",
        a.url,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ApplyAI_Applications_Export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addTerminalLog({ level: "SUCCESS", message: "CSV application tracker sheet exported successfully." });
    } catch {
      addTerminalLog({ level: "ERROR", message: "Failed to export tracker CSV." });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header and CSV Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2 border border-white/5 p-6 rounded-2xl">
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-slate-100 uppercase">
            METRICS TRACKER
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1 uppercase">APPLICATION HISTORICAL ANALYTICS INDEX</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-black font-mono text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
        >
          <Download size={14} /> Export to CSV
        </button>
      </div>

      {/* RECHARTS DAILY APPLIED TIMELINE */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
            ROLLING 14-DAY APPLICATION DENSITY
          </span>
          <span className="text-[9px] font-mono text-slate-500 uppercase">TIMELINE TIMESTAMPS</span>
        </div>

        <div className="h-64 w-full">
          {densityData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 font-light italic">
              Awaiting application logs to construct activity timeline...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={densityData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                />
                <Bar dataKey="applications" fill="#06B6D4" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* FILTER & DATA TABLE CARD */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
        
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-xs flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search database fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/2 hover:border-cyan-500/30 text-xs font-mono font-bold text-slate-300 hover:text-cyan-400 cursor-pointer"
            >
              QUERY
            </button>
          </form>

          {/* Status filters */}
          <div className="flex gap-1.5 overflow-x-auto text-[10px] font-mono border border-white/8 p-1 rounded-xl bg-slate-950/40">
            {["ALL", "QUEUED", "CUSTOMIZING", "APPLIED", "ACTION_NEEDED"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  playAudioTone("click");
                  setStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  status === st
                    ? "bg-cyan-500 text-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

        </div>

        {/* Data Table */}
        <div className="overflow-x-auto select-text">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <th className="pb-3 pt-1">Company</th>
                <th className="pb-3 pt-1">Position Title</th>
                <th className="pb-3 pt-1">Location</th>
                <th className="pb-3 pt-1 cursor-pointer hover:text-cyan-400" onClick={() => handleSort("matchScore")}>
                  <span className="flex items-center gap-1">
                    Score <ArrowUpDown size={10} />
                  </span>
                </th>
                <th className="pb-3 pt-1 cursor-pointer hover:text-cyan-400" onClick={() => handleSort("status")}>
                  <span className="flex items-center gap-1">
                    Status <ArrowUpDown size={10} />
                  </span>
                </th>
                <th className="pb-3 pt-1 cursor-pointer hover:text-cyan-400" onClick={() => handleSort("createdAt")}>
                  <span className="flex items-center gap-1">
                    Added <ArrowUpDown size={10} />
                  </span>
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-white/2 text-xs font-light text-slate-300">
              {loading ? (
                [1, 2, 3].map((s) => (
                  <tr key={s}>
                    <td colSpan={6} className="py-4 font-mono text-center text-slate-600 animate-pulse uppercase">
                      QUERYING SQLITE RELATIONAL TABLES...
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic font-mono">
                    No matching database records found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3.5 font-semibold text-slate-200">{item.company}</td>
                    <td className="py-3.5">{item.title}</td>
                    <td className="py-3.5 text-slate-400">{item.location}</td>
                    <td className="py-3.5 font-mono font-bold text-cyan-400">{item.matchScore}%</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        item.status === "APPLIED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        item.status === "ACTION_NEEDED" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                        "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        <div className="flex justify-between items-center text-xs font-mono pt-4 border-t border-white/5">
          <span className="text-slate-500 uppercase">
            Total Records: <span className="text-slate-300 font-bold">{totalCount}</span>
          </span>

          <div className="flex gap-4 items-center">
            <span className="text-slate-500">
              Page <span className="text-slate-300 font-bold">{page}</span> of {totalPages}
            </span>

            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => {
                  playAudioTone("click");
                  setPage(page - 1);
                }}
                className="p-2 border border-white/10 rounded-lg hover:border-cyan-500/30 hover:text-cyan-400 text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  playAudioTone("click");
                  setPage(page + 1);
                }}
                className="p-2 border border-white/10 rounded-lg hover:border-cyan-500/30 hover:text-cyan-400 text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
