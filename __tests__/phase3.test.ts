/**
 * Phase 3 Integration Tests
 * Validar que todos los componentes de Phase 3 compilan y funcionan correctamente
 */

import { runDiagnosticTest, compareDiagnostics } from "@/lib/diagnostic-test";
import { generatePersonalizedPlan, adaptPlan } from "@/lib/personalized-plan";
import {
  generateLevelCertificate,
  generateProgressCertificate,
  generateAchievementCertificate,
  generateCertificateHTML,
} from "@/lib/certificate-generator";

describe("Phase 3 - Diagnostic System", () => {
  it("should generate diagnostic result with all metrics", () => {
    const answers = {
      readingHabits: 3,
      concentration: 4,
      visualFocus: 3,
      memoryRetention: 4,
      learningPreference: "visual" as const,
    };

    const result = runDiagnosticTest(answers);

    expect(result).toHaveProperty("readingSpeed");
    expect(result).toHaveProperty("comprehension");
    expect(result).toHaveProperty("focusLevel");
    expect(result).toHaveProperty("peripheralVision");
    expect(result).toHaveProperty("workingMemory");
    expect(result).toHaveProperty("learnerType", "visual");
    expect(result).toHaveProperty("readerProfile");
    expect(result).toHaveProperty("strengths");
    expect(result).toHaveProperty("weaknesses");
    expect(result).toHaveProperty("recommendations");

    // Validate ranges
    expect(result.readingSpeed).toBeGreaterThan(200);
    expect(result.comprehension).toBeGreaterThan(0);
    expect(result.comprehension).toBeLessThanOrEqual(100);
  });

  it("should compare two diagnostic results", () => {
    const before = runDiagnosticTest({
      readingHabits: 1,
      concentration: 2,
      visualFocus: 2,
      memoryRetention: 2,
      learningPreference: "visual" as const,
    });

    const after = runDiagnosticTest({
      readingHabits: 5,
      concentration: 5,
      visualFocus: 5,
      memoryRetention: 5,
      learningPreference: "visual" as const,
    });

    const comparison = compareDiagnostics(before, after);

    expect(comparison).toHaveProperty("speedImprovement");
    expect(comparison).toHaveProperty("comprehensionImprovement");
    expect(comparison).toHaveProperty("overallProgress");
    expect(comparison.speedImprovement).toBeGreaterThan(0);
  });
});

describe("Phase 3 - Personalized Plans", () => {
  it("should generate personalized plan from diagnostic", () => {
    const diagnostic = runDiagnosticTest({
      readingHabits: 3,
      concentration: 3,
      visualFocus: 3,
      memoryRetention: 3,
      learningPreference: "visual" as const,
    });

    const plan = generatePersonalizedPlan(diagnostic);

    expect(plan).toHaveProperty("weeklyPlan");
    expect(plan).toHaveProperty("dailyRoutine");
    expect(plan).toHaveProperty("adjustmentTriggers");
    expect(plan).toHaveProperty("monthlyGoals");

    // Validate structure
    expect(plan.weeklyPlan).toHaveLength(7);
    expect(plan.monthlyGoals).toHaveLength(4);
    expect(plan.adjustmentTriggers).toHaveLength(6);
    expect(plan.dailyRoutine.length).toBeGreaterThan(0);
  });

  it("should adapt plan based on progress", () => {
    const diagnostic = runDiagnosticTest({
      readingHabits: 3,
      concentration: 3,
      visualFocus: 3,
      memoryRetention: 3,
      learningPreference: "visual" as const,
    });

    const plan = generatePersonalizedPlan(diagnostic);
    const originalDuration = plan.dailyRoutine.reduce((sum, a) => sum + a.duration, 0);

    // Adapt for high accuracy
    const adaptedHigh = adaptPlan(plan, { avgAccuracy: 0.85 });
    const adaptedHighDuration = adaptedHigh.dailyRoutine.reduce((sum, a) => sum + a.duration, 0);

    expect(adaptedHighDuration).toBeGreaterThan(originalDuration);
    expect(adaptedHigh.version).toBe(plan.version + 1);

    // Adapt for low accuracy
    const adaptedLow = adaptPlan(plan, { avgAccuracy: 0.45 });
    const adaptedLowDuration = adaptedLow.dailyRoutine.reduce((sum, a) => sum + a.duration, 0);

    expect(adaptedLowDuration).toBeLessThan(originalDuration);
  });
});

describe("Phase 3 - Certificate Generation", () => {
  it("should generate level certificate", () => {
    const cert = generateLevelCertificate(
      "Juan",
      { level: 15, title: "Competente" },
      5000
    );

    expect(cert).toHaveProperty("userName", "Juan");
    expect(cert).toHaveProperty("certificateType", "level");
    expect(cert).toHaveProperty("title");
    expect(cert).toHaveProperty("stats");
    expect(cert.stats.length).toBeGreaterThan(0);
  });

  it("should generate progress certificate", () => {
    const cert = generateProgressCertificate("Maria", {
      speedIncrease: 45,
      comprehensionIncrease: 25,
      daysElapsed: 30,
    });

    expect(cert).toHaveProperty("certificateType", "progress");
    expect(cert.description).toContain("45%");
    expect(cert.description).toContain("25%");
  });

  it("should generate achievement certificate", () => {
    const cert = generateAchievementCertificate("Carlos", "speed-reader");

    expect(cert).toHaveProperty("certificateType", "achievement");
    expect(cert.title).toContain("Lector Rápido");
  });

  it("should generate certificate HTML", () => {
    const cert = generateLevelCertificate(
      "Test User",
      { level: 10, title: "Master" },
      1000
    );

    const html = generateCertificateHTML(cert);

    expect(html).toContain("<html");
    expect(html).toContain("Test User");
    expect(html).toContain("ReadFlow AI");
    expect(html).toContain("certificate");
  });
});

describe("Phase 3 - Integration", () => {
  it("should complete full flow: diagnostic -> plan -> comparison", () => {
    // Initial diagnostic
    const initialDiagnostic = runDiagnosticTest({
      readingHabits: 1,
      concentration: 2,
      visualFocus: 2,
      memoryRetention: 1,
      learningPreference: "visual" as const,
    });

    // Generate plan
    const plan = generatePersonalizedPlan(initialDiagnostic);

    // Simulate improvement
    const improvedDiagnostic = runDiagnosticTest({
      readingHabits: 4,
      concentration: 4,
      visualFocus: 4,
      memoryRetention: 4,
      learningPreference: "visual" as const,
    });

    // Compare
    const comparison = compareDiagnostics(initialDiagnostic, improvedDiagnostic);

    expect(comparison.overallProgress).toBeGreaterThan(0);

    // Generate certificates
    const levelCert = generateLevelCertificate(
      "Test",
      { level: 15, title: "Competente" },
      plan.diagnosticResult.readingSpeed * 20
    );

    expect(levelCert).toHaveProperty("certificateType", "level");
  });
});
