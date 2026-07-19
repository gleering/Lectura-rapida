/**
 * Quick validation script for Phase 3 modules
 * Checks that all required files exist and have correct structure
 */

const fs = require("fs");
const path = require("path");

const FILES_TO_VALIDATE = [
  // Library files
  "lib/diagnostic-test.ts",
  "lib/personalized-plan.ts",
  "lib/certificate-generator.ts",
  "lib/certificate-manager.ts",

  // Component files
  "components/DiagnosticTest.tsx",
  "components/PersonalizedPlanDisplay.tsx",
  "components/CertificateDisplay.tsx",
  "components/ProgressTracker.tsx",

  // Updated files
  "app/training/page.tsx",
];

const REQUIRED_EXPORTS = {
  "lib/diagnostic-test.ts": [
    "runDiagnosticTest",
    "compareDiagnostics",
    "DiagnosticResult",
  ],
  "lib/personalized-plan.ts": [
    "generatePersonalizedPlan",
    "adaptPlan",
    "PersonalizedPlan",
  ],
  "lib/certificate-generator.ts": [
    "generateCertificateHTML",
    "generateLevelCertificate",
    "generateProgressCertificate",
    "generateAchievementCertificate",
    "generateAnnualSummaryPDF",
    "CertificateData",
  ],
  "lib/certificate-manager.ts": [
    "generateCertificatesFromStats",
    "getNewCertificates",
  ],
};

console.log("🔍 Validating Phase 3 Implementation...\n");

let errors = 0;
let warnings = 0;

// Check files exist
console.log("📁 Checking file existence:");
FILES_TO_VALIDATE.forEach((file) => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - NOT FOUND`);
    errors++;
  }
});

console.log("\n📦 Checking exports:");
Object.entries(REQUIRED_EXPORTS).forEach(([file, exports]) => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, "utf-8");
  exports.forEach((exp) => {
    const patterns = [
      new RegExp(`export (function|const|type|interface) ${exp}\\b`),
      new RegExp(`export { ${exp}[^}]*}`),
    ];

    if (patterns.some((p) => p.test(content))) {
      console.log(`  ✅ ${file} exports ${exp}`);
    } else {
      console.log(`  ⚠️  ${file} - export ${exp} not found or not exported`);
      warnings++;
    }
  });
});

console.log("\n📝 Checking component implementations:");
const components = [
  "components/DiagnosticTest.tsx",
  "components/PersonalizedPlanDisplay.tsx",
  "components/CertificateDisplay.tsx",
  "components/ProgressTracker.tsx",
];

components.forEach((comp) => {
  const fullPath = path.join(__dirname, comp);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, "utf-8");
  if (content.includes("export function") || content.includes("export const")) {
    console.log(`  ✅ ${comp} is properly exported`);
  } else {
    console.log(`  ❌ ${comp} - no proper export found`);
    errors++;
  }
});

console.log("\n📋 Validation Summary:");
console.log(`  ✅ Files checked: ${FILES_TO_VALIDATE.length}`);
console.log(`  ❌ Errors: ${errors}`);
console.log(`  ⚠️  Warnings: ${warnings}`);

if (errors === 0) {
  console.log("\n🎉 Phase 3 validation PASSED!");
  process.exit(0);
} else {
  console.log("\n⛔ Phase 3 validation FAILED");
  process.exit(1);
}
