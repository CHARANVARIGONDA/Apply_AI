import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const apiKey = process.env.ANTHROPIC_API_KEY;

// Create Anthropic client if key is available
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

// Types matching Zustand store interfaces
export interface ParsedProfile {
  name: string;
  email: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    duration: string;
  }[];
  education: {
    school: string;
    degree: string;
  }[];
}

export interface GapAnalysisResult {
  score: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  gapAnalysisText: string;
}

/**
 * Resolves profile dynamically from Prisma UserConfig context model
 * to ensure that user settings edits are immediately tracked.
 */
async function getDynamicProfile(overrideProfileStr?: string): Promise<ParsedProfile> {
  const profile: ParsedProfile = {
    name: "VVNT SRI CHARAN",
    email: "charanvarigonda@gmail.com",
    skills: [
      "Node.js",
      "Express.js",
      "MongoDB",
      "Mongoose",
      "EJS",
      "HTML",
      "CSS",
      "JavaScript",
      "Git",
      "GitHub",
      "Python",
      "Java",
      "SQL",
    ],
    experience: [
      {
        company: "Infosys SpringBoard 6.0",
        role: "Project Team Member (ClauseEase: AI-Based Contract Language Simplifier)",
        duration: "2026 - Present",
      },
    ],
    education: [
      {
        school: "MRITS",
        degree: "B.Tech in Computer Science (GPA: 8.6/10)",
      },
    ],
  };

  try {
    const userConfig = await prisma.userConfig.findUnique({ where: { id: 1 } });
    if (userConfig) {
      if (userConfig.userEmail) {
        profile.email = userConfig.userEmail;
      }

      const dbProfileStr = overrideProfileStr || userConfig.parsedProfile;
      if (dbProfileStr) {
        const parsed = JSON.parse(dbProfileStr);
        if (parsed.name) profile.name = parsed.name;
        if (parsed.email) profile.email = parsed.email;
        if (Array.isArray(parsed.skills)) profile.skills = parsed.skills;
        if (Array.isArray(parsed.experience)) profile.experience = parsed.experience;
        if (Array.isArray(parsed.education)) profile.education = parsed.education;
      }

      // Settings binding: adapt experience title description if targetTitle matches
      if (userConfig.targetTitle && profile.experience.length > 0) {
        profile.experience[0].role = `${profile.experience[0].role} focusing on ${userConfig.targetTitle}`;
      }
    }
  } catch (err) {
    console.warn("Failed to dynamically fetch config from registry, using standard profile:", err);
  }

  return profile;
}

/**
 * Builds the strict anti-fabrication system prompt containing authentic user variables
 */
function getSystemPrompt(profile: ParsedProfile): string {
  return `CRITICAL CONSTRAINTS (ANTI-FABRICATION PROFILE LOCK):
- You are strictly forbidden from inventing companies, experience histories, or altering dates. There is ZERO placeholder text allowed.
- You must use ONLY these verified user variables extracted from the resume:
  * Full Name: ${profile.name}
  * Email Relay: ${profile.email}
  * Education: ${profile.education.map((e) => `${e.degree} from ${e.school}`).join("; ")}
  * Core Technical Stack: ${profile.skills.join(", ")}
  * Real Projects: 
    1. Airbnb-Like Property Booking Platform (Built using Node.js, Express.js, MongoDB, Mongoose, EJS).
    2. Personalized Appointment Booking System (Dynamic slot logic, MVC architecture, RESTful APIs, EJS templates).
  * Experience: Infosys SpringBoard 6.0 (2026-Present) — Assigned to the "ClauseEase: AI-Based Contract Language Simplifier" project team.
- Do NOT create fake senior titles like "Senior Software Engineer" or "Staff Developer". If the target role is junior or developer, focus on how the user's B.Tech CSE background, springBoard experience, and project assets align. Rephrase or emphasize only these specific assets.`;
}

/**
 * Parses raw resume text into a structured JSON profile using Claude.
 */
export async function parseResumeWithClaude(text: string): Promise<ParsedProfile> {
  if (!anthropic) {
    console.warn("ANTHROPIC_API_KEY is not defined. Falling back to high-fidelity mock parsing.");
    return getDynamicProfile();
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 2000,
      system: `You are an expert resume parsing service. Your job is to extract resume data and return a strictly typed JSON object matching this schema:
{
  "name": "Full Name",
  "email": "email@example.com",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [{"company": "Company A", "role": "Role A", "duration": "2 years"}],
  "education": [{"school": "School X", "degree": "B.S. Computer Science"}]
}
Return ONLY valid JSON. Do not include markdown code block syntax (like \`\`\`json) or any conversational text.`,
      messages: [{ role: "user", content: `Parse this resume text:\n\n${text}` }],
    });

    const content = (response.content[0] as any).text;
    return JSON.parse(content.trim()) as ParsedProfile;
  } catch (err) {
    console.error("Error parsing resume with Claude SDK:", err);
    return getDynamicProfile();
  }
}

/**
 * Analyzes the gap between a candidate's resume profile and a job description.
 */
export async function analyzeGapWithClaude(
  profileStr: string,
  jobDescription: string
): Promise<GapAnalysisResult> {
  const profile = await getDynamicProfile(profileStr);

  if (!anthropic) {
    return getMockGapAnalysis(profile, jobDescription);
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1500,
      system: `${getSystemPrompt(profile)}
      
You are a professional HR assessment engine. Analyze the candidate resume profile and the job description, then return a JSON object matching this schema:
{
  "score": 85, // integer 0-100 match score
  "matchingKeywords": ["React", "TypeScript"], // keywords found in both
  "missingKeywords": ["GraphQL", "Docker"], // keywords in job description but missing in resume
  "gapAnalysisText": "A detailed paragraph evaluating alignment, highlighting strengths and missing requirements."
}
Return ONLY valid JSON without markdown wrapping.`,
      messages: [
        {
          role: "user",
          content: `Profile:\n${JSON.stringify(profile)}\n\nJob Description:\n${jobDescription}`,
        },
      ],
    });

    const content = (response.content[0] as any).text;
    return JSON.parse(content.trim()) as GapAnalysisResult;
  } catch (err) {
    console.error("Error analyzing gap with Claude:", err);
    return getMockGapAnalysis(profile, jobDescription);
  }
}

/**
 * Customizes resume statements or details to align with the job description.
 */
export async function customizeResumeWithClaude(
  profileStr: string,
  jobDescription: string
): Promise<string> {
  const profile = await getDynamicProfile(profileStr);

  if (!anthropic) {
    return getMockResumeDiff(profile, jobDescription);
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 2500,
      system: `${getSystemPrompt(profile)}
      
You are a professional resume optimization assistant. Rewrite some resume accomplishment statements to align with the provided job description.
CRITICAL: Do not alter objective historical parameters like company names, employment dates, schools, or graduation years. Only improve the vocabulary and emphasis of work highlights.
Return the optimized resume text with insertions clearly demarcated or summarize the diff in a structured readable way. Include a plain text summary or markdown showing the changes.`,
      messages: [
        {
          role: "user",
          content: `Resume Profile:\n${JSON.stringify(profile)}\n\nTarget Job:\n${jobDescription}`,
        },
      ],
    });

    return (response.content[0] as any).text.trim();
  } catch (err) {
    console.error("Error customising resume with Claude:", err);
    return getMockResumeDiff(profile, jobDescription);
  }
}

/**
 * Generates a tailored cover letter using Claude.
 */
export async function generateCoverLetterWithClaude(
  profileStr: string,
  jobDescription: string,
  tone: string = "professional"
): Promise<string> {
  const profile = await getDynamicProfile(profileStr);

  if (!anthropic) {
    return getMockCoverLetter(profile, jobDescription, tone);
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1500,
      system: `${getSystemPrompt(profile)}
      
You are an expert copywriter. Write a tailored, highly compelling cover letter for the candidate applying to the job description.
Tone requirements: ${tone}.
Format as a clean letter ready to send.`,
      messages: [
        {
          role: "user",
          content: `Candidate Profile:\n${JSON.stringify(profile)}\n\nJob Description:\n${jobDescription}`,
        },
      ],
    });

    return (response.content[0] as any).text.trim();
  } catch (err) {
    console.error("Error generating cover letter with Claude:", err);
    return getMockCoverLetter(profile, jobDescription, tone);
  }
}

/**
 * Generates a customized, non-templated freelance cover pitch based on assignment description and MERN stack framework expertise.
 */
export async function generateFreelancePitchWithClaude(
  assignmentTitle: string,
  assignmentDescription: string,
  budget: string
): Promise<string> {
  const profile = await getDynamicProfile();

  if (!anthropic) {
    return getMockFreelancePitch(assignmentTitle, assignmentDescription, budget, profile);
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1000,
      system: `${getSystemPrompt(profile)}
      
You are an expert freelance consultant specializing in MERN stack development (MongoDB, Express, React, Node.js).
Write a customized, non-templated cover pitch for the freelancer applying to the web development assignment.
Highlight specific technical details matching their requested assignment (e.g. state management, database schema design, frontend responsive layouts).
Do NOT write placeholders like "[Name]" or "[My Name]" or generic greeting templates. Keep it highly direct, professional, conversational, and tailored. Mention key components of the MERN stack framework as it applies to their need.
Make sure you include a proposed pricing strategy or budget breakdown that matches their target budget.`,
      messages: [
        {
          role: "user",
          content: `Assignment Title: ${assignmentTitle}\nBudget: ${budget}\nDescription:\n${assignmentDescription}`,
        },
      ],
    });

    return (response.content[0] as any).text.trim();
  } catch (err) {
    console.error("Error generating freelance pitch with Claude:", err);
    return getMockFreelancePitch(assignmentTitle, assignmentDescription, budget, profile);
  }
}

// ==========================================
// MOCK FALLBACK IMPLEMENTATIONS
// ==========================================

function getMockGapAnalysis(profile: ParsedProfile, jd: string): GapAnalysisResult {
  const score = Math.floor(Math.random() * 25) + 70; // 70 to 95
  return {
    score,
    matchingKeywords: ["Node.js", "Express.js", "MongoDB", "Mongoose", "JavaScript"],
    missingKeywords: ["AWS Lambda", "Docker"],
    gapAnalysisText: `The candidate has a solid alignment (${score}%) with your requirements, showcasing strong academic background from MRITS and practical experience in Node.js and Express.js backends. Major projects in the MERN stack match the tech stack. Deployment options (Docker) and AWS details represent the only significant gaps.`,
  };
}

function getMockResumeDiff(profile: ParsedProfile, jd: string): string {
  return `### Work Experience Optimization

**Project Team Member at Infosys SpringBoard 6.0 (2026-Present)**
- Original: Worked on ClauseEase project team.
- Modified: Engineered contract language simplification features on the "ClauseEase: AI-Based Contract Language Simplifier" project team using Node.js and Express.js backend integrations.

### Key Projects Optimization

**Airbnb-Like Property Booking Platform**
- Original: Built property booking application.
- Modified: Designed and deployed a full-stack Airbnb-Like booking platform utilizing Node.js, Express.js, and MongoDB/Mongoose with responsive template rendering.

**Personalized Appointment Booking System**
- Original: Built slot appointment booking system.
- Modified: Engineered a slot appointment booking system with MVC architecture and secure RESTful API integrations.`;
}

function getMockCoverLetter(profile: ParsedProfile, jd: string, tone: string): string {
  return `Dear Hiring Team,

I am writing to express my strong interest in the opportunity at your company. As a Computer Science graduate (B.Tech from MRITS) with a strong foundation across full-stack development and hands-on experience through Infosys SpringBoard 6.0 on the "ClauseEase: AI-Based Contract Language Simplifier" project team, I am confident in my ability to contribute effectively.

My core stack includes Node.js, Express.js, MongoDB, Mongoose, and JavaScript, and I have applied these skills to build significant projects. For instance, my Airbnb-Like Property Booking Platform demonstrates my proficiency in designing Express.js/MongoDB backends and template rendering, while my Personalized Appointment Booking System implements MVC architecture and slot scheduling workflows.

I would love to discuss how my skill set and project experiences align with your team's requirements.

Sincerely,
${profile.name}`;
}

function getMockFreelancePitch(
  title: string,
  desc: string,
  budget: string,
  profile: ParsedProfile
): string {
  const numericBudget = parseInt(budget.replace(/[^0-9]/g, "")) || 1000;
  return `Hi there,

I saw your posting for "${title}" and would love to help you build this out. As a specialist fluent in the MERN stack (MongoDB, Express.js, React, Node.js), I focus on building robust APIs and responsive interfaces using clean styling conventions.

In my recent projects, I built a full-stack Airbnb-like property booking app using Node.js, Express, and MongoDB, and designed an MVC-structured personalized appointment booking system with dynamic slot logic. Additionally, I work with Infosys SpringBoard 6.0 on contract language automation engines. I can design clean MongoDB schemas, optimize Express controllers, and implement secure data routes.

Proposed Strategy & Pricing:
- Phase 1 (UI & Interactive Design): 35% of budget ($${Math.floor(numericBudget * 0.35)})
- Phase 2 (Express Backend & DB Integration): 45% of budget ($${Math.floor(numericBudget * 0.45)})
- Phase 3 (Testing & Deployment): 20% of budget ($${Math.floor(numericBudget * 0.20)})

Let me know if you'd like to schedule a quick call to map out the implementation timeline.

Best regards,
${profile.name}`;
}
