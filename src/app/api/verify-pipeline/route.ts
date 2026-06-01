import { NextRequest, NextResponse } from "next/server";
import {
  parseResumeWithClaude,
  analyzeGapWithClaude,
  customizeResumeWithClaude,
  generateCoverLetterWithClaude,
} from "@/lib/claude";

export async function GET() {
  const testResults: { testName: string; status: "PASSED" | "FAILED"; details: string }[] = [];

  const runTest = async (
    name: string,
    testFn: () => Promise<any>,
    validationFn: (res: any) => boolean
  ) => {
    try {
      const res = await testFn();
      if (validationFn(res)) {
        testResults.push({
          testName: name,
          status: "PASSED",
          details: "Output verified and matched structural compliance.",
        });
      } else {
        testResults.push({
          testName: name,
          status: "FAILED",
          details: "Output did not satisfy structural invariants.",
        });
      }
    } catch (err: any) {
      testResults.push({
        testName: name,
        status: "FAILED",
        details: `Crashed with error: ${err.message || "Unknown error"}`,
      });
    }
  };

  // Test 1: Empty text parsing
  await runTest(
    "Ingestion Error Boundary: Empty string parsing",
    () => parseResumeWithClaude(""),
    (res) => !!res && typeof res.name === "string" && Array.isArray(res.skills)
  );

  // Test 2: Blank gap analysis descriptions
  await runTest(
    "Gap Engine: Blank inputs resilience",
    () => analyzeGapWithClaude("", ""),
    (res) => !!res && typeof res.score === "number" && res.score >= 0 && res.score <= 100
  );

  // Test 3: Oversized/corrupted data customization
  const corruptedPayload = "A".repeat(5000); // 5kb of garbage text
  await runTest(
    "Customizer Robustness: Corrupted/Oversized inputs handling",
    () => customizeResumeWithClaude(corruptedPayload, corruptedPayload),
    (res) => typeof res === "string" && res.length > 0
  );

  // Test 4: Tone variation parameters validation
  await runTest(
    "Document Compiler: Custom tone rendering",
    () => generateCoverLetterWithClaude("{}", "Need Dev", "Highly Technical"),
    (res) => typeof res === "string" && res.includes("Sincerely")
  );

  const allPassed = testResults.every((t) => t.status === "PASSED");

  return NextResponse.json({
    success: allPassed,
    timestamp: new Date().toISOString(),
    testsRun: testResults.length,
    results: testResults,
  });
}
export const dynamic = "force-dynamic";
