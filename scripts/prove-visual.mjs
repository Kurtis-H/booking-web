// Prove the visual tests catch real regressions: plant one small styling
// change at a time, run the suite, and require it to FAIL. Then put the
// stylesheet back and require the suite to PASS again.
//
//   node scripts/prove-visual.mjs
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CSS = "src/styles.css";
const original = readFileSync(CSS, "utf8");

// Each is the kind of change that slips through functional tests: nothing
// breaks, but the page no longer looks the way it was approved.
const plants = [
  { name: "seats 2px further apart", from: ".seat-row { border: none; padding: 0; margin: 0; display: flex; gap: 6px; }", to: ".seat-row { border: none; padding: 0; margin: 0; display: flex; gap: 8px; }" },
  { name: "accent color one shade lighter", from: "--accent: #4338ca;", to: "--accent: #4f46e5;" },
  { name: "card corners less rounded", from: "--radius: 14px;", to: "--radius: 10px;" },
  { name: "error text in the body color", from: "--bad: #b42318;", to: "--bad: #1b1a2e;" },
];

function visualSuitePasses() {
  try {
    execSync("npx playwright test -c playwright.visual.config.ts --reporter=dot", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

let failures = 0;
try {
  for (const plant of plants) {
    if (!original.includes(plant.from)) {
      console.error(`✗ ${plant.name}: the stylesheet no longer contains the line to change`);
      failures++;
      continue;
    }
    writeFileSync(CSS, original.replace(plant.from, plant.to));
    const caught = !visualSuitePasses();
    console.log(`${caught ? "✓" : "✗"} ${plant.name}: ${caught ? "caught" : "NOT caught"}`);
    if (!caught) failures++;
  }
} finally {
  writeFileSync(CSS, original);
}

const clean = visualSuitePasses();
console.log(`${clean ? "✓" : "✗"} unchanged app: ${clean ? "passes" : "FAILS"}`);
if (!clean) failures++;
process.exit(failures ? 1 : 0);
