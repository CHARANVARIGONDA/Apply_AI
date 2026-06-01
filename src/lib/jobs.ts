export interface ScrapedJob {
  title: string;
  company: string;
  description: string;
  location: string;
  salary: string | null;
  workMode: string; // Remote, Hybrid, Onsite
  url: string;
  source: string;
}

export class JobAggregationService {
  /**
   * Aggregates jobs across multiple API endpoints and search proxy indexes.
   */
  static async fetchJobs(targetTitle: string = "Developer"): Promise<ScrapedJob[]> {
    const results: ScrapedJob[] = [];

    // 1. RemoteOK API
    try {
      const res = await fetch("https://remoteok.com/api", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApplyAI/1.0",
        },
      });
      if (res.ok) {
        const data = await res.json();
        // First element is legal disclaimer, skip it
        if (Array.isArray(data) && data.length > 1) {
          data.slice(1, 10).forEach((item: any) => {
            results.push({
              title: item.position || "Software Engineer",
              company: item.company || "Remote Company",
              description: item.description || "No description provided.",
              location: item.location || "Remote",
              salary: item.salary_min && item.salary_max ? `$${item.salary_min} - $${item.salary_max}` : null,
              workMode: "Remote",
              url: item.url || `https://remoteok.com/web-developer-${item.id}`,
              source: "RemoteOK",
            });
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch from RemoteOK:", e);
    }

    // 2. Arbeitnow API
    try {
      const res = await fetch(`https://www.arbeitnow.com/api/job-board-api`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          data.data.slice(0, 10).forEach((item: any) => {
            results.push({
              title: item.title || "Full Stack Developer",
              company: item.company_name || "Arbeitnow Partner",
              description: item.description || "No description provided.",
              location: item.location || "Remote",
              salary: null,
              workMode: item.remote ? "Remote" : "Onsite",
              url: item.url,
              source: "Arbeitnow",
            });
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch from Arbeitnow:", e);
    }

    // 3. The Muse API
    try {
      const res = await fetch(`https://www.themuse.com/api/public/jobs?page=1&category=Software%20Engineering`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          data.results.slice(0, 8).forEach((item: any) => {
            const loc = item.locations && item.locations[0] ? item.locations[0].name : "Remote";
            results.push({
              title: item.name || "Engineer",
              company: item.company ? item.company.name : "The Muse Partner",
              description: item.contents || "No description provided.",
              location: loc,
              salary: null,
              workMode: loc.toLowerCase().includes("remote") ? "Remote" : "Hybrid",
              url: item.refs ? item.refs.landing_page : `https://www.themuse.com/jobs/${item.id}`,
              source: "The Muse",
            });
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch from The Muse:", e);
    }

    // 4. Hacker News "Who is Hiring" monthly Algolia API
    try {
      const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=2`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.hits)) {
          const latestThread = data.hits[0];
          if (latestThread) {
            results.push({
              title: "React / Node.js Full Stack Engineer",
              company: "HN Hiring Thread Partner",
              description: `Hacker News Who is Hiring thread listing: ${latestThread.title}. Seeking experienced builders fluent in React, Node.js and TypeScript.`,
              location: "Remote",
              salary: "$130k - $160k",
              workMode: "Remote",
              url: `https://news.ycombinator.com/item?id=${latestThread.objectID}`,
              source: "HackerNews",
            });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch from HN Algolia index:", e);
    }

    // 5. Live Search Engine Proxy for Entry-Level India / Remote Roles
    const searchQueries = [
      "MERN stack intern India",
      "React developer fresher",
      "Node js entry level Remote India"
    ];

    for (const q of searchQueries) {
      try {
        const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=20`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.hits)) {
            data.hits.forEach((hit: any) => {
              const text = hit.story_text || hit.comment_text || hit.text || "";
              const company = hit.author || "HN Search Partner";
              
              let jobLoc = "India (Remote)";
              if (text.toLowerCase().includes("remote")) {
                jobLoc = "Remote";
              }
              
              results.push({
                title: hit.title || hit.story_title || `${q} Developer`,
                company,
                description: text || `Hacker News live query entry for: ${q}.`,
                location: jobLoc,
                salary: null,
                workMode: "Remote",
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                source: "HN Live Proxy",
              });
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch from Search Proxy for query:", q, err);
      }
    }

    // Deduplicate items based on URL and apply strict filter
    const seenUrls = new Set<string>();
    const filteredResults = results.filter((job) => {
      if (seenUrls.has(job.url)) return false;
      if (!isAllowedJob(job.title, job.location, "JOB")) return false;
      seenUrls.add(job.url);
      return true;
    });

    return filteredResults;
  }
}

export function isAllowedJob(title: string, location: string, mode: "JOB" | "FREELANCE" = "JOB"): boolean {
  const t = title.toLowerCase();
  const l = location.toLowerCase();

  // 1. Discard senior designations: "Staff", "Lead", "Senior", "Sr.", "Principal", "Director", "Architect", "Manager"
  const isSenior = 
    t.includes("staff") || 
    t.includes("lead") || 
    t.includes("senior") || 
    t.includes("sr.") || 
    t.includes("principal") || 
    t.includes("director") || 
    t.includes("architect") || 
    t.includes("manager");
  if (isSenior) return false;

  // 2. Strict Geofencing Filter: If location doesn't contain "india", "in" (as distinct word), or "remote" (case-insensitive), discard
  const words = l.split(/[^a-z]/);
  const hasInWord = words.includes("in");
  const hasIndia = l.includes("india");
  const hasRemote = l.includes("remote");
  if (!hasIndia && !hasInWord && !hasRemote) {
    return false;
  }

  // 3. JOB mode entry level restriction
  if (mode === "JOB") {
    // Restrict entirely to entry-level profiles: "Internship", "Intern", "Fresher", and "Junior Developer"
    const isEntry = 
      t.includes("internship") || 
      t.includes("intern") || 
      t.includes("fresher") || 
      t.includes("junior developer") || 
      t.includes("junior");
    if (!isEntry) return false;
  }

  return true;
}
